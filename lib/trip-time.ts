// Lógica de interfaz sin React: dónde está el viaje respecto de hoy,
// navegación entre días y anclaje de la hoja deslizable.

/** YYYY-MM-DD en la zona horaria del dispositivo (en Japón, la de Japón) */
export function localISODate(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type TripStatus =
  | { kind: "before"; daysUntil: number }
  | { kind: "during"; index: number }
  | { kind: "after" };

function daysBetween(fromISO: string, toISO: string): number {
  const from = new Date(fromISO + "T12:00:00");
  const to = new Date(toISO + "T12:00:00");
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

export function tripStatus(itinerary: { date: string }[], todayISO: string): TripStatus {
  if (itinerary.length === 0) return { kind: "after" };
  const first = itinerary[0].date;
  if (todayISO < first) return { kind: "before", daysUntil: daysBetween(todayISO, first) };
  const index = itinerary.findIndex((d) => d.date === todayISO);
  return index >= 0 ? { kind: "during", index } : { kind: "after" };
}

export function adjacentDay<T extends { date: string }>(itinerary: T[], date: string, dir: 1 | -1): T | null {
  const index = itinerary.findIndex((d) => d.date === date);
  if (index < 0) return null;
  return itinerary[index + dir] ?? null;
}

export type Snap = "peek" | "half" | "full";

/** La altura de anclaje más cercana a una altura en px (al soltar la hoja) */
export function nearestSnap(height: number, snaps: Record<Snap, number>): Snap {
  let best: Snap = "peek";
  for (const snap of Object.keys(snaps) as Snap[]) {
    if (Math.abs(snaps[snap] - height) < Math.abs(snaps[best] - height)) best = snap;
  }
  return best;
}
