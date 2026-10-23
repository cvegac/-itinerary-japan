// Descarga anticipada del mapa del viaje para usarlo sin conexión, por capas.
// Se guarda en una caché aparte y sin tope (la caché automática del service
// worker tiene tope y lo iría borrando). Los pedidos van con cache: "reload":
// el service worker los deja pasar para no guardar dos copias.
import type { DayEntry } from "@/types/DayEntry";
import {
  BASE_PLAN,
  DETAIL_PLAN,
  WIDE_PLAN,
  layerTiles,
  planTiles,
  tileKey,
  tileUrl,
  type MapLayers,
  type Tile,
  type TilePlan,
} from "@/lib/map-tiles";
import { GLYPH_FONTS, GLYPH_RANGES, MAP_STYLE, TERRAIN_MAX_ZOOM, TERRAIN_TILES } from "@/lib/map-sources";

export const TRIP_MAP_CACHE = "viajes-mapa-viaje";

// Promedios medidos con tiles reales del itinerario de Japón (oct 2026)
const AVG_VECTOR_BYTES = 105_000;
const AVG_DEM_BYTES = 60_000;
const EXTRAS_BYTES = 1_500_000; // estilo, fuentes, íconos, fondo de relieve suave
const CONCURRENCY = 6;
/** Una capa cuenta como descargada si está casi completa (algún tile pudo fallar) */
const PRESENT_RATIO = 0.95;

/** Fondo de relieve suave del estilo, solo en zoom bajo */
const SHADED_PLAN: TilePlan = { overview: { minZoom: 5, maxZoom: 6 } };

export type TripMapEstimate = {
  baseBytes: number;
  /** Lo que suma cada capa sobre la base */
  detailBytes: number;
  wideBytes: number;
  /** Relieve para las capas elegidas */
  reliefBytes: number;
  /** Lo que pesan las capas elegidas */
  totalBytes: number;
};

export function estimateTripMap(itinerary: DayEntry[], layers: MapLayers): TripMapEstimate {
  const base = planTiles(itinerary, BASE_PLAN).length;
  const extra = (plan: TilePlan) => planTiles(itinerary, [BASE_PLAN, plan]).length - base;
  const baseBytes = base * AVG_VECTOR_BYTES + EXTRAS_BYTES;
  const detailBytes = extra(DETAIL_PLAN) * AVG_VECTOR_BYTES;
  const wideBytes = extra(WIDE_PLAN) * AVG_VECTOR_BYTES;
  const reliefBytes = layerTiles(itinerary, { ...layers, relief: true }).dem.length * AVG_DEM_BYTES;
  const totalBytes =
    baseBytes +
    (layers.detail ? detailBytes : 0) +
    (layers.wide ? wideBytes : 0) +
    (layers.relief ? reliefBytes : 0);
  return { baseBytes, detailBytes, wideBytes, reliefBytes, totalBytes };
}

export type DownloadProgress = { done: number; total: number; failed: number; bytes: number };
export type DownloadResult = DownloadProgress & { cancelled: boolean };

type StyleJSON = {
  sources: Record<string, { url?: string; tiles?: string[] }>;
  sprite?: string | { url: string }[];
  glyphs: string;
};

function spriteUrls(sprite: StyleJSON["sprite"]): string[] {
  const bases = typeof sprite === "string" ? [sprite] : (sprite ?? []).map((s) => s.url);
  return bases.flatMap((b) => [`${b}@2x.json`, `${b}@2x.png`, `${b}.json`, `${b}.png`]);
}

export async function downloadTripMap(
  itinerary: DayEntry[],
  options: { layers: MapLayers; signal?: AbortSignal; onProgress?: (p: DownloadProgress) => void }
): Promise<DownloadResult> {
  const { layers, signal, onProgress } = options;
  const cache = await caches.open(TRIP_MAP_CACHE);
  const get = (url: string) => fetch(url, { cache: "reload", signal });

  // El estilo y el TileJSON dicen qué URLs pide el mapa (la de los tiles tiene versión)
  const styleRes = await get(MAP_STYLE);
  const style = (await styleRes.clone().json()) as StyleJSON;
  const tileJsonUrl = style.sources.openmaptiles.url!;
  const tileJsonRes = await get(tileJsonUrl);
  const vectorTemplate = ((await tileJsonRes.clone().json()) as { tiles: string[] }).tiles[0];
  await cache.put(MAP_STYLE, styleRes);
  await cache.put(tileJsonUrl, tileJsonRes);

  const { vector, dem } = layerTiles(itinerary, layers);
  const shadedTemplate = style.sources.ne2_shaded?.tiles?.[0];
  const urls = [
    ...spriteUrls(style.sprite),
    ...GLYPH_FONTS.flatMap((font) =>
      GLYPH_RANGES.map((range) => style.glyphs.replace("{fontstack}", font).replace("{range}", range))
    ),
    ...(shadedTemplate ? planTiles(itinerary, SHADED_PLAN).map((t) => tileUrl(shadedTemplate, t)) : []),
    ...vector.map((t) => tileUrl(vectorTemplate, t)),
    ...dem.map((t) => tileUrl(TERRAIN_TILES, t)),
  ];

  const existing = new Set((await cache.keys()).map((r) => r.url));
  const pending = urls.filter((u) => !existing.has(u) && !existing.has(new URL(u).href));
  const progress: DownloadProgress = { done: urls.length - pending.length + 2, total: urls.length + 2, failed: 0, bytes: 0 };
  onProgress?.({ ...progress });

  let cancelled = false;
  let next = 0;
  async function worker() {
    while (next < pending.length && !cancelled) {
      const url = pending[next++];
      if (signal?.aborted) {
        cancelled = true;
        break;
      }
      try {
        const res = await get(url);
        if (res.ok) {
          const body = await res.arrayBuffer();
          await cache.put(url, new Response(body, { headers: res.headers }));
          progress.bytes += body.byteLength;
        } else {
          progress.failed++;
        }
      } catch {
        if (signal?.aborted) {
          cancelled = true;
          break;
        }
        progress.failed++;
      }
      progress.done++;
      onProgress?.({ ...progress });
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  return { ...progress, cancelled: cancelled || !!signal?.aborted };
}

export type TripMapStatus = { downloaded: boolean; layers: MapLayers; tiles: number };

const NO_LAYERS: MapLayers = { detail: false, wide: false, relief: false };

/** "z/x/y" del final de una URL de tile */
function keyFromUrl(url: string): string | null {
  const m = url.match(/\/(\d+)\/(\d+)\/(\d+)\.(pbf|png)$/);
  return m ? `${m[1]}/${m[2]}/${m[3]}` : null;
}

/** Qué capas hay descargadas, mirando la caché (no se guarda ninguna preferencia) */
export async function tripMapStatus(itinerary: DayEntry[]): Promise<TripMapStatus> {
  if (typeof caches === "undefined" || !(await caches.has(TRIP_MAP_CACHE))) {
    return { downloaded: false, layers: NO_LAYERS, tiles: 0 };
  }
  const urls = (await (await caches.open(TRIP_MAP_CACHE)).keys()).map((r) => r.url);
  const vectorKeys = new Set(urls.filter((u) => u.includes("/planet/")).map(keyFromUrl));
  const demKeys = new Set(urls.filter((u) => u.includes("elevation-tiles-prod")).map(keyFromUrl));

  const covered = (tiles: Tile[], keys: Set<string | null>) =>
    tiles.length > 0 && tiles.filter((t) => keys.has(tileKey(t))).length / tiles.length >= PRESENT_RATIO;
  const baseKeys = new Set(planTiles(itinerary, BASE_PLAN).map(tileKey));
  const exclusive = (plan: TilePlan) => planTiles(itinerary, plan).filter((t) => !baseKeys.has(tileKey(t)));

  const downloaded = covered(planTiles(itinerary, BASE_PLAN), vectorKeys);
  return {
    downloaded,
    layers: {
      detail: downloaded && covered(exclusive(DETAIL_PLAN), vectorKeys),
      wide: downloaded && covered(exclusive(WIDE_PLAN), vectorKeys),
      relief: covered(planTiles(itinerary, BASE_PLAN, TERRAIN_MAX_ZOOM), demKeys),
    },
    tiles: vectorKeys.size + demKeys.size,
  };
}

export async function deleteTripMap(): Promise<void> {
  await caches.delete(TRIP_MAP_CACHE);
}
