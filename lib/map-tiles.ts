// Qué tiles bajar para tener el mapa del viaje sin conexión, por capas según el
// itinerario. La base es obligatoria; las demás suman margen de zoom y zona.
import type { DayEntry } from "@/types/DayEntry";
import { boundsOf, type LatLng } from "@/lib/map-geo";
import { TERRAIN_MAX_ZOOM } from "@/lib/map-sources";

export type Tile = { z: number; x: number; y: number };
type Ring = { z: number; radiusKm: number };

export type TilePlan = {
  /** Toda la ruta, en zoom bajo */
  overview?: { minZoom: number; maxZoom: number };
  /** Alrededor de cada hospedaje */
  bases?: Ring[];
  /** Alrededor de cada lugar a visitar */
  places?: Ring[];
};

/** Base (siempre): la ruta, cada hospedaje y cada lugar. Zoom 14 es el máximo de la fuente */
export const BASE_PLAN: TilePlan = {
  overview: { minZoom: 5, maxZoom: 8 },
  bases: [
    { z: 9, radiusKm: 12 },
    { z: 10, radiusKm: 12 },
    { z: 11, radiusKm: 12 },
  ],
  places: [
    { z: 12, radiusKm: 3 },
    { z: 13, radiusKm: 1.5 },
    { z: 14, radiusKm: 0.5 },
  ],
};

/** Más zoom en cada lugar: el detalle máximo en un radio mucho más amplio */
export const DETAIL_PLAN: TilePlan = {
  places: [
    { z: 12, radiusKm: 8 },
    { z: 13, radiusKm: 4 },
    { z: 14, radiusKm: 2 },
  ],
};

/** Alrededores de cada base: zona amplia por si te movés fuera del plan */
export const WIDE_PLAN: TilePlan = {
  bases: [
    { z: 9, radiusKm: 35 },
    { z: 10, radiusKm: 35 },
    { z: 11, radiusKm: 35 },
    { z: 12, radiusKm: 35 },
    { z: 13, radiusKm: 12 },
  ],
};

/** Detalle máximo en zona amplia: el zoom 14 (el máximo de la fuente) en mucha más área */
export const MAX_DETAIL_PLAN: TilePlan = {
  places: [{ z: 14, radiusKm: 5 }],
};

/** Relieve en alta resolución alrededor de cada lugar: montañas nítidas de cerca */
export const RELIEF_HIGH_PLAN: TilePlan = {
  places: [
    { z: 13, radiusKm: 3 },
    { z: 14, radiusKm: 1.5 },
    { z: 15, radiusKm: 0.7 },
  ],
};

export type MapLayers = {
  detail: boolean;
  maxDetail: boolean;
  wide: boolean;
  relief: boolean;
  reliefHigh: boolean;
};

export function lngLatToTile(lng: number, lat: number, z: number): { x: number; y: number } {
  const n = 2 ** z;
  const rad = (lat * Math.PI) / 180;
  const x = Math.floor(((lng + 180) / 360) * n);
  const y = Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n);
  return { x: Math.min(n - 1, Math.max(0, x)), y: Math.min(n - 1, Math.max(0, y)) };
}

function tilesInBox(west: number, south: number, east: number, north: number, z: number): Tile[] {
  const a = lngLatToTile(west, north, z);
  const b = lngLatToTile(east, south, z);
  const tiles: Tile[] = [];
  for (let x = a.x; x <= b.x; x++) for (let y = a.y; y <= b.y; y++) tiles.push({ z, x, y });
  return tiles;
}

export function tilesInRadius([lat, lng]: LatLng, radiusKm: number, z: number): Tile[] {
  const dLat = radiusKm / 111;
  const dLng = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  return tilesInBox(lng - dLng, lat - dLat, lng + dLng, lat + dLat, z);
}

export const tileKey = (t: Tile) => `${t.z}/${t.x}/${t.y}`;

/** Unión de los tiles de varios planes, sin repetir y hasta un zoom máximo */
export function planTiles(allDays: DayEntry[], plans: TilePlan | TilePlan[], maxZoom = Infinity): Tile[] {
  // Los días de vuelo fuera del destino no se usan sin conexión (y bajarían medio planeta)
  const itinerary = allDays.filter((d) => !d.enRoute);
  const seen = new Map<string, Tile>();
  const add = (tiles: Tile[]) => tiles.forEach((t) => t.z <= maxZoom && seen.set(tileKey(t), t));

  const bases = itinerary.map((d) => d.accommodationCoords);
  const places = itinerary.flatMap((d) => [d.accommodationCoords, ...(d.pois ?? []).map((p) => p.coords)]);

  for (const plan of Array.isArray(plans) ? plans : [plans]) {
    if (plan.overview) {
      const [[west, south], [east, north]] = boundsOf(places);
      for (let z = plan.overview.minZoom; z <= plan.overview.maxZoom; z++) add(tilesInBox(west, south, east, north, z));
    }
    for (const base of bases) for (const { z, radiusKm } of plan.bases ?? []) add(tilesInRadius(base, radiusKm, z));
    for (const place of places) for (const { z, radiusKm } of plan.places ?? []) add(tilesInRadius(place, radiusKm, z));
  }

  return Array.from(seen.values()).sort((a, b) => a.z - b.z || a.x - b.x || a.y - b.y);
}

export function selectedPlans(layers: MapLayers): TilePlan[] {
  return [
    BASE_PLAN,
    ...(layers.detail ? [DETAIL_PLAN] : []),
    ...(layers.maxDetail ? [MAX_DETAIL_PLAN] : []),
    ...(layers.wide ? [WIDE_PLAN] : []),
  ];
}

/** Tiles del mapa y del relieve para las capas elegidas (el relieve acompaña a las demás) */
export function layerTiles(itinerary: DayEntry[], layers: MapLayers): { vector: Tile[]; dem: Tile[] } {
  const plans = selectedPlans(layers);
  const dem = layers.relief || layers.reliefHigh ? planTiles(itinerary, plans, TERRAIN_MAX_ZOOM) : [];
  const hires = layers.reliefHigh ? planTiles(itinerary, RELIEF_HIGH_PLAN) : [];
  return { vector: planTiles(itinerary, plans), dem: [...dem, ...hires] };
}

export function tileUrl(template: string, { z, x, y }: Tile): string {
  return template.replace("{z}", String(z)).replace("{x}", String(x)).replace("{y}", String(y));
}
