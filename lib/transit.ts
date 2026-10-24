import type { DayEntry } from "@/types/DayEntry";
import type { TransportSegment } from "@/types/TransportSegment";
import type { LatLng } from "@/lib/map-geo";
import type { Line } from "@/lib/route-plan";

/** Cómo se traza cada medio en el mapa: por las vías, por la ruta, en recta o en arco */
export type TransitKind = "rail" | "road" | "straight" | "flight";

const KIND_BY_MODE: Record<string, TransitKind> = {
  tren: "rail",
  metro: "rail",
  tranvía: "rail",
  bus: "road",
  ferry: "straight",
  teleférico: "straight",
  avión: "flight",
};

/** A pie y en bici no van: esos tramos ya los trazan las rutas del día */
export function transitKind(mode: string): TransitKind | undefined {
  return KIND_BY_MODE[mode];
}

/** Estaciones, paradas y aeropuertos por el nombre que usan los tramos: [lat, lng] */
export type Places = Record<string, LatLng>;

export type TransitLeg = {
  /** Posición en day.transport */
  index: number;
  kind: TransitKind;
  segment: TransportSegment;
  /** Origen, paradas intermedias (via) y destino */
  points: LatLng[];
};

export function transitLegs(day: DayEntry, places: Places): { legs: TransitLeg[]; missing: string[] } {
  const legs: TransitLeg[] = [];
  const missing: string[] = [];
  day.transport.forEach((segment, index) => {
    const kind = transitKind(segment.mode);
    if (!kind) return;
    const names = [segment.from, ...(segment.via ?? []), segment.to];
    const unknown = names.filter((n) => !places[n]);
    if (unknown.length) missing.push(...unknown);
    else legs.push({ index, kind, segment, points: names.map((n) => places[n]) });
  });
  return { legs, missing };
}

/** Lo que define los trazados del día: si cambia, hay que recalcularlos */
export function transitSignature(day: DayEntry, places: Places): string {
  return transitLegs(day, places)
    .legs.map((l) => `${l.index}:${l.segment.mode}:${l.points.map((p) => p.join(",")).join(";")}`)
    .join("|");
}

/** Trazados precalculados por scripts/fetch-transit.mjs, por índice del tramo */
export type DayTransit = { signature: string; lines: Record<number, Line> };
export type TripTransit = Record<string, DayTransit>;

const toRad = Math.PI / 180;

/** Arco de círculo máximo (la ruta real de un avión) en [lng, lat] */
export function greatCircle([lat1, lng1]: LatLng, [lat2, lng2]: LatLng, segments = 64): Line {
  const p1 = [lat1 * toRad, lng1 * toRad];
  const p2 = [lat2 * toRad, lng2 * toRad];
  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((p2[0] - p1[0]) / 2) ** 2 + Math.cos(p1[0]) * Math.cos(p2[0]) * Math.sin((p2[1] - p1[1]) / 2) ** 2
      )
    );
  if (d === 0) return [[lng1, lat1], [lng2, lat2]];
  const line: Line = [];
  for (let i = 0; i <= segments; i++) {
    if (i === 0) line.push([lng1, lat1]);
    else if (i === segments) line.push([lng2, lat2]);
    else {
      const f = i / segments;
      const a = Math.sin((1 - f) * d) / Math.sin(d);
      const b = Math.sin(f * d) / Math.sin(d);
      const x = a * Math.cos(p1[0]) * Math.cos(p1[1]) + b * Math.cos(p2[0]) * Math.cos(p2[1]);
      const y = a * Math.cos(p1[0]) * Math.sin(p1[1]) + b * Math.cos(p2[0]) * Math.sin(p2[1]);
      const z = a * Math.sin(p1[0]) + b * Math.sin(p2[0]);
      line.push([Math.atan2(y, x) / toRad, Math.atan2(z, Math.sqrt(x * x + y * y)) / toRad]);
    }
  }
  return line;
}

/** Trazado aproximado: en arco los vuelos, en recta entre paradas el resto */
export function fallbackLine(leg: TransitLeg): Line {
  if (leg.kind === "flight") {
    return leg.points.slice(1).flatMap((p, i) => greatCircle(leg.points[i], p).slice(i === 0 ? 0 : 1));
  }
  return leg.points.map(([lat, lng]) => [lng, lat]);
}

export type TransitLine = TransitLeg & { line: Line };

/** Las líneas de los tramos del día: las precalculadas si están al día, si no las aproximadas */
export function dayTransitLines(day: DayEntry, places: Places, transit?: DayTransit): TransitLine[] {
  const fresh = transit && transit.signature === transitSignature(day, places) ? transit : undefined;
  return transitLegs(day, places).legs.map((leg) => ({ ...leg, line: fresh?.lines[leg.index] ?? fallbackLine(leg) }));
}

/** Color y trazo de cada tipo de tramo en el mapa: colores que no usa ninguna
 *  semana (WEEK_COLORS_HEX), para no confundirlos con las rutas a pie */
export const TRANSIT_STYLE: Record<TransitKind, { color: string; dashed: boolean; label: string }> = {
  rail: { color: "#7c3aed", dashed: false, label: "Tren" },
  road: { color: "#db2777", dashed: false, label: "Bus" },
  straight: { color: "#0891b2", dashed: true, label: "Ferry o teleférico" },
  flight: { color: "#475569", dashed: true, label: "Vuelo" },
};
