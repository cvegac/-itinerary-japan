import { distanceKm, hasBed, poiLetter, type LatLng } from "@/lib/map-geo";
import { isBikeDay, legMode, type Leg, type LegMode } from "@/lib/route-plan";
import type { Places } from "@/lib/transit";
import type { DayEntry, PointOfInterest } from "@/types/DayEntry";
import type { TransportSegment } from "@/types/TransportSegment";

// Links a Google Maps (Maps URLs, sin API key): en el celular abren la app.
// https://developers.google.com/maps/documentation/urls/get-started

export type TravelMode = "walking" | "bicycling" | "transit" | "driving";

/** En el navegador del celular entran 3 paradas: origen + 3 + destino */
const MAX_POINTS = 5;

const ll = ([lat, lng]: LatLng) => `${lat},${lng}`;

export function placeUrl(coords: LatLng): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ll(coords))}`;
}

export function directionsUrl(points: LatLng[], mode: TravelMode): string {
  const params = new URLSearchParams({ api: "1", origin: ll(points[0]), destination: ll(points[points.length - 1]) });
  const stops = points.slice(1, -1);
  if (stops.length) params.set("waypoints", stops.map(ll).join("|"));
  params.set("travelmode", mode);
  return `https://www.google.com/maps/dir/?${params}`;
}

export type RouteStop = {
  /** Letra del lugar en la lista y el mapa */
  label: string;
  name: string;
  coords: LatLng;
  /** Cómo se llega desde el anterior (rutas precalculadas) */
  modeFromPrev?: LegMode;
};

export type RouteLink = { url: string; from: string; to: string; mode: TravelMode };

export const LODGING_LABEL = "Hospedaje";

/** "KUMANO家-OHGi- (individual con tatami…)" → "KUMANO家-OHGi-" */
const lodgingName = (accommodation: string) => accommodation.split(" (")[0];

/** Las paradas del recorrido: sale de la cama donde amanecés, pasa por los
 *  lugares en orden de visita y vuelve a la de esta noche (si hay). Entre dos
 *  paradas va el tramo precalculado o, si no hay, el que toca por distancia */
export function dayStops(
  day: DayEntry,
  ordered: { poi: PointOfInterest; index: number }[],
  legTo: Map<number, Leg>,
  morning: DayEntry | null
): RouteStop[] {
  if (ordered.length === 0) return [];
  const byDistance = (a: LatLng, b: LatLng) => legMode(distanceKm(a, b), isBikeDay(day), !!day.hike);
  // Sin cama anoche distinta, amanecés en la de hoy; sin cama hoy ni anoche, no hay salida
  const wake = morning ?? (hasBed(day) ? day : null);

  const stops: RouteStop[] = [];
  if (wake) stops.push({ label: LODGING_LABEL, name: lodgingName(wake.accommodation), coords: wake.accommodationCoords });
  ordered.forEach(({ poi, index }, position) => {
    const prev = stops.at(-1);
    const leg = legTo.get(index);
    stops.push({
      label: poiLetter(position),
      name: poi.name,
      coords: poi.coords,
      // Los tramos "desde el hospedaje" salen del de esta noche: en un traslado no sirven
      modeFromPrev: prev ? (leg && leg.from !== "lodging" ? leg.mode : byDistance(prev.coords, poi.coords)) : undefined,
    });
  });
  if (hasBed(day)) {
    const last = stops.at(-1)!;
    stops.push({
      label: LODGING_LABEL,
      name: lodgingName(day.accommodation),
      coords: day.accommodationCoords,
      modeFromPrev: byDistance(last.coords, day.accommodationCoords),
    });
  }
  return stops;
}

/** El recorrido del día en tramos para Google Maps: se corta donde hay tren o
 *  bus (esos van con su tramo de transporte) y cada link lleva hasta 5 puntos */
export function dayRouteLinks(stops: RouteStop[], fallback: TravelMode = "walking"): RouteLink[] {
  const groups: RouteStop[][] = [];
  stops.forEach((s, i) => {
    if (i === 0 || s.modeFromPrev === "transit") groups.push([s]);
    else groups[groups.length - 1].push(s);
  });

  return groups.flatMap((group) => {
    const modes = group.slice(1).map((s) => s.modeFromPrev);
    const mode: TravelMode = modes.includes("bike") ? "bicycling" : modes.some(Boolean) ? "walking" : fallback;
    const links: RouteLink[] = [];
    // Tramos que se tocan: el último punto de uno es el primero del siguiente
    for (let start = 0; start < group.length - 1; start += MAX_POINTS - 1) {
      const part = group.slice(start, start + MAX_POINTS);
      links.push({
        url: directionsUrl(part.map((s) => s.coords), mode),
        from: part[0].label,
        to: part[part.length - 1].label,
        mode,
      });
    }
    return links;
  });
}

const SEGMENT_MODE: Record<string, TravelMode> = {
  tren: "transit",
  metro: "transit",
  monorriel: "transit",
  tranvía: "transit",
  bus: "transit",
  "bus-nocturno": "transit",
  "bus + funicular": "transit",
  ferry: "transit",
  barco: "transit",
  teleférico: "transit",
  caminar: "walking",
  bicicleta: "bicycling",
  taxi: "driving",
};

/** Un tramo del día, entre sus estaciones; en avión o sin coordenadas, ninguno */
export function segmentUrl(segment: Pick<TransportSegment, "mode" | "from" | "to">, places: Places): string | null {
  const mode = SEGMENT_MODE[segment.mode];
  const from = places[segment.from];
  const to = places[segment.to];
  if (!mode || !from || !to) return null;
  return directionsUrl([from, to], mode);
}
