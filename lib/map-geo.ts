import type { DayEntry } from "@/types/DayEntry";
import { getWeekIndex } from "@/lib/itinerary-utils";

// Los datos guardan coordenadas como [lat, lng] (el orden de Leaflet);
// MapLibre y GeoJSON usan [lng, lat]. Toda conversión pasa por acá.
export type LatLng = [number, number];
export type LngLat = [number, number];
export type LngLatBounds = [LngLat, LngLat];

/** El hospedaje entra en el encuadre del día solo si está a menos de esto de los puntos */
const NEARBY_ACCOMMODATION_KM = 15;

export function toLngLat([lat, lng]: LatLng): LngLat {
  return [lng, lat];
}

export function distanceKm([lat1, lng1]: LatLng, [lat2, lng2]: LatLng): number {
  const toRad = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * toRad) / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(((lng2 - lng1) * toRad) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

/** [[oeste, sur], [este, norte]] de una lista de puntos [lat, lng] */
export function boundsOf(coords: LatLng[]): LngLatBounds {
  if (coords.length === 0) throw new Error("boundsOf: no hay puntos");
  const lats = coords.map(([lat]) => lat);
  const lngs = coords.map(([, lng]) => lng);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}

export type LineProps = { color: string; dashed: boolean };

export function lineFeature(coords: LatLng[], properties: LineProps) {
  return {
    type: "Feature" as const,
    properties,
    geometry: { type: "LineString" as const, coordinates: coords.map(toLngLat) },
  };
}

export function poiLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

export function weekColor(date: string, startDate: string, palette: readonly string[]): string {
  return palette[getWeekIndex(date, startDate) % palette.length];
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type DayPoint = { letter: string; name: string; night: boolean; lngLat: LngLat };

export type DayView = {
  points: DayPoint[];
  /** Encuadre de los puntos (y del hospedaje si está cerca); null si no hay puntos */
  bounds: LngLatBounds | null;
  includeAccommodation: boolean;
  /** Centro a usar cuando no hay puntos: el hospedaje */
  focus: LngLat;
};

/** Qué mostrar y cómo encuadrar el mapa en modo "día" */
export function dayView(day: DayEntry): DayView {
  const pois = day.pois ?? [];
  const points = pois.map((p, i) => ({
    letter: poiLetter(i),
    name: p.name,
    night: !!p.night,
    lngLat: toLngLat(p.coords),
  }));
  const focus = toLngLat(day.accommodationCoords);

  if (pois.length === 0) {
    return { points, bounds: null, includeAccommodation: false, focus };
  }

  const [[west, south], [east, north]] = boundsOf(pois.map((p) => p.coords));
  const center: LatLng = [(south + north) / 2, (west + east) / 2];
  const includeAccommodation = distanceKm(center, day.accommodationCoords) < NEARBY_ACCOMMODATION_KM;
  const coords = pois.map((p) => p.coords);
  if (includeAccommodation) coords.push(day.accommodationCoords);

  return { points, bounds: boundsOf(coords), includeAccommodation, focus };
}
