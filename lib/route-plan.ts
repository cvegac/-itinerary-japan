// Rutas del día: el mejor orden para recorrer los lugares (con las reglas del
// plan) y cómo moverse entre ellos. Los trazados vienen precalculados de OSRM
// (scripts/fetch-routes.mjs) y quedan en los datos: funcionan sin internet.
import type { DayEntry, PointOfInterest } from "@/types/DayEntry";
import { distanceKm } from "@/lib/map-geo";

export type LegMode = "foot" | "bike" | "transit";

/** Línea GeoJSON: [lng, lat] (como la devuelve OSRM y la usa MapLibre) */
export type Line = [number, number][];

export type Leg = {
  from: number | "lodging";
  to: number;
  mode: LegMode;
  distanceM: number;
  durationS: number;
  /** Sin trazado en los tramos de tren o bus (no hay ruteo libre de transporte en Japón) */
  line?: Line;
};

export type LodgingRoute = { distanceM: number; durationS: number; line: Line };

export type DayRoutes = {
  /** Firma de los lugares del día: si cambian, estas rutas dejan de usarse */
  signature: string;
  /** Índices de los lugares en el orden de visita */
  order: number[];
  legs: Leg[];
  /** Ruta a pie desde el hospedaje a cada lugar cercano (índice → ruta) */
  fromLodging: Record<number, LodgingRoute>;
  /** Tiempo del recorrido en el orden original y en el óptimo (segundos) */
  originalCostS?: number;
  bestCostS?: number;
  /** El día pidió mantener el orden del plan (keepOrder) */
  keptOrder?: boolean;
};

export type TripRoutes = Record<string, DayRoutes>;

export const FOOT_MAX_KM = 4;
/** En los días de sendero, un tramo a pie puede ser la caminata entera */
export const HIKE_MAX_KM = 15;
export const BIKE_MAX_KM = 25;
export const NEAR_LODGING_KM = 3;
/** Si un lugar queda más lejos que esto del hospedaje, el día es una excursión en tren */
export const EXCURSION_KM = 15;
/** Solo se cambia el orden del plan si el óptimo ahorra al menos esto */
export const MIN_SAVING_S = 600;

export function isBikeDay(day: DayEntry): boolean {
  return day.transport.some((t) => t.mode === "bicicleta");
}

export function isExcursion(day: DayEntry): boolean {
  return (day.pois ?? []).some((p) => distanceKm(day.accommodationCoords, p.coords) > EXCURSION_KM);
}

/** Cómo conviene hacer un tramo según su distancia en línea recta */
export function legMode(straightKm: number, bikeDay: boolean, hikeDay = false): LegMode {
  if (bikeDay && straightKm <= BIKE_MAX_KM) return "bike";
  if (straightKm <= (hikeDay ? HIKE_MAX_KM : FOOT_MAX_KM)) return "foot";
  return "transit";
}

export function poiSignature(day: DayEntry): string {
  return (day.pois ?? []).map((p) => `${p.name}@${p.coords.join(",")}`).join("|");
}

/**
 * Orden de menor costo para visitar n lugares, probando todas las
 * combinaciones (hasta 6–7 por día: es el óptimo exacto). Reglas:
 * - los lugares de noche van después de los de día
 * - fixedFirst: en las excursiones se arranca donde te deja el tren
 * - sin fixedFirst, se sale del hospedaje ("start")
 * - roundTrip: suma la vuelta al hospedaje (o a la estación, en las excursiones);
 *   sin eso, terminar en el lugar más lejano (una cima) sale "gratis"
 */
export function bestOrder(
  n: number,
  cost: (from: number | "start", to: number | "start") => number,
  opts: { night?: number[]; fixedFirst?: number; roundTrip?: boolean }
): { order: number[]; cost: number } {
  const night = new Set(opts.night ?? []);
  let best: { order: number[]; cost: number } = { order: [], cost: n === 0 ? 0 : Infinity };

  const visit = (order: number[], used: Set<number>, total: number) => {
    if (total >= best.cost) return;
    if (order.length === n) {
      const back = opts.roundTrip && n > 0 ? cost(order[n - 1], opts.fixedFirst ?? "start") : 0;
      if (total + back < best.cost) best = { order: [...order], cost: total + back };
      return;
    }
    const pendingDay = Array.from({ length: n }, (_, i) => i).some((i) => !used.has(i) && !night.has(i));
    for (let next = 0; next < n; next++) {
      if (used.has(next)) continue;
      if (order.length === 0 && opts.fixedFirst !== undefined && next !== opts.fixedFirst) continue;
      if (night.has(next) && pendingDay) continue; // la noche espera a que termine el día
      const from = order.length ? order[order.length - 1] : opts.fixedFirst !== undefined ? next : "start";
      const step = from === next ? 0 : cost(from, next);
      used.add(next);
      order.push(next);
      visit(order, used, total + step);
      order.pop();
      used.delete(next);
    }
  };
  visit([], new Set(), 0);
  return best;
}

/**
 * Qué orden usar: el del plan si el día lo pide (sendero, tren, alquiler,
 * horario) o si el óptimo ahorra poco; si no, el óptimo.
 */
export function chooseOrder(day: DayEntry, best: { order: number[]; cost: number }, originalCost: number, n: number): number[] {
  const identity = Array.from({ length: n }, (_, i) => i);
  if (day.keepOrder || originalCost - best.cost < MIN_SAVING_S) return identity;
  return best.order;
}

// ── Simplificación de trazados (Douglas–Peucker en metros) ─────────────────
function toMeters([lng, lat]: [number, number], lat0: number): [number, number] {
  return [lng * 111_320 * Math.cos((lat0 * Math.PI) / 180), lat * 110_540];
}

function distToSegment(p: [number, number], a: [number, number], b: [number, number]): number {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2)) : 0;
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** Quita puntos que se apartan menos de toleranceM de la línea: los trazados pesan mucho menos */
export function simplifyLine(line: Line, toleranceM: number): Line {
  if (line.length <= 2) return line;
  const lat0 = line[0][1];
  const pts = line.map((p) => toMeters(p, lat0));
  const keep = new Array(line.length).fill(false);
  keep[0] = keep[line.length - 1] = true;
  const stack: [number, number][] = [[0, line.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    let maxD = -1;
    let idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = distToSegment(pts[i], pts[a], pts[b]);
      if (d > maxD) [maxD, idx] = [d, i];
    }
    if (maxD > toleranceM) {
      keep[idx] = true;
      stack.push([a, idx], [idx, b]);
    }
  }
  return line.filter((_, i) => keep[i]);
}

/** Lugares del día en orden de visita (el óptimo si sigue vigente; si no, el original) */
export function orderedPois(day: DayEntry, routes: DayRoutes | undefined): { poi: PointOfInterest; index: number }[] {
  const pois = day.pois ?? [];
  const valid =
    routes &&
    routes.signature === poiSignature(day) &&
    routes.order.length === pois.length &&
    new Set(routes.order).size === pois.length;
  const order = valid ? routes.order : pois.map((_, i) => i);
  return order.map((index) => ({ poi: pois[index], index }));
}
