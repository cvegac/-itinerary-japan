import { describe, expect, it } from "vitest";
import { adjacentDay, localISODate, nearestSnap, tripStatus } from "./trip-time";

const itinerary = ["2026-11-01", "2026-11-02", "2026-11-03"].map((date) => ({ date }));

describe("localISODate", () => {
  it("usa la fecha local, no la UTC", () => {
    // 23:30 del 1 nov en hora local sigue siendo 1 nov, aunque en UTC ya sea otro día
    expect(localISODate(new Date(2026, 10, 1, 23, 30))).toBe("2026-11-01");
    expect(localISODate(new Date(2026, 0, 5, 0, 10))).toBe("2026-01-05");
  });
});

describe("tripStatus", () => {
  it("antes del viaje cuenta los días que faltan", () => {
    expect(tripStatus(itinerary, "2026-10-22")).toEqual({ kind: "before", daysUntil: 10 });
    expect(tripStatus(itinerary, "2026-10-31")).toEqual({ kind: "before", daysUntil: 1 });
  });

  it("durante el viaje devuelve el índice del día de hoy", () => {
    expect(tripStatus(itinerary, "2026-11-01")).toEqual({ kind: "during", index: 0 });
    expect(tripStatus(itinerary, "2026-11-03")).toEqual({ kind: "during", index: 2 });
  });

  it("después del viaje lo marca como terminado", () => {
    expect(tripStatus(itinerary, "2026-11-04")).toEqual({ kind: "after" });
  });

  it("sin días no hay viaje", () => {
    expect(tripStatus([], "2026-11-01")).toEqual({ kind: "after" });
  });
});

describe("adjacentDay", () => {
  it("devuelve el día anterior y el siguiente", () => {
    expect(adjacentDay(itinerary, "2026-11-02", 1)?.date).toBe("2026-11-03");
    expect(adjacentDay(itinerary, "2026-11-02", -1)?.date).toBe("2026-11-01");
  });

  it("devuelve null en los extremos o si la fecha no existe", () => {
    expect(adjacentDay(itinerary, "2026-11-03", 1)).toBeNull();
    expect(adjacentDay(itinerary, "2026-11-01", -1)).toBeNull();
    expect(adjacentDay(itinerary, "2030-01-01", 1)).toBeNull();
  });
});

describe("nearestSnap", () => {
  const snaps = { peek: 180, half: 450, full: 780 };

  it("elige la altura de anclaje más cercana", () => {
    expect(nearestSnap(200, snaps)).toBe("peek");
    expect(nearestSnap(400, snaps)).toBe("half");
    expect(nearestSnap(700, snaps)).toBe("full");
  });

  it("acota los valores fuera de rango", () => {
    expect(nearestSnap(-50, snaps)).toBe("peek");
    expect(nearestSnap(5000, snaps)).toBe("full");
  });
});
