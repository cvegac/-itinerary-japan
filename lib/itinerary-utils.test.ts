import { describe, expect, it } from "vitest";
import type { DayEntry } from "@/types/DayEntry";
import {
  computeCostSummary,
  computeLodgingSummary,
  getTotalWeeks,
  getWeekGroup,
  getWeekIndex,
} from "./itinerary-utils";

function makeDay(date: string, overrides: Partial<DayEntry> = {}): DayEntry {
  return {
    date,
    label: `Día ${date}`,
    location: "Ciudad",
    category: "Naturaleza",
    notes: "",
    weekday: "Lun",
    food: "",
    transport: [],
    accommodation: "Hostal",
    zona: "Centro, Ciudad",
    accommodationCoords: [35, 139],
    budget: "$100",
    activitiesDay: [],
    activitiesNight: [],
    isTransit: false,
    ...overrides,
  };
}

function makeDays(start: string, count: number): DayEntry[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start + "T12:00:00");
    d.setDate(d.getDate() + i);
    return makeDay(d.toISOString().slice(0, 10));
  });
}

describe("getWeekIndex", () => {
  it("cuenta semanas de 7 días desde la fecha de inicio", () => {
    expect(getWeekIndex("2026-11-01", "2026-11-01")).toBe(0);
    expect(getWeekIndex("2026-11-07", "2026-11-01")).toBe(0);
    expect(getWeekIndex("2026-11-08", "2026-11-01")).toBe(1);
    expect(getWeekIndex("2026-12-05", "2026-11-01")).toBe(4);
  });
});

describe("getTotalWeeks / getWeekGroup", () => {
  const days = makeDays("2026-11-01", 35);

  it("calcula la cantidad de semanas del itinerario", () => {
    expect(getTotalWeeks(days, "2026-11-01")).toBe(5);
    expect(getTotalWeeks([], "2026-11-01")).toBe(0);
  });

  it("devuelve los días de la misma semana que el día elegido", () => {
    const week = getWeekGroup(days, "2026-11-10", "2026-11-01");
    expect(week.map((d) => d.date)).toEqual([
      "2026-11-08", "2026-11-09", "2026-11-10", "2026-11-11",
      "2026-11-12", "2026-11-13", "2026-11-14",
    ]);
  });
});

describe("computeCostSummary", () => {
  it("suma los presupuestos por semana y en total", () => {
    const days = makeDays("2026-11-01", 8);
    days[0].budget = "$65";
    days[7].budget = "$40";
    const summary = computeCostSummary(days, "2026-11-01");

    expect(summary.weeks).toHaveLength(2);
    expect(summary.weeks[0].total).toBe(65 + 6 * 100);
    expect(summary.weeks[1].total).toBe(40);
    expect(summary.total).toBe(65 + 6 * 100 + 40);
  });

  it("toma 0 cuando el presupuesto no tiene números", () => {
    const summary = computeCostSummary([makeDay("2026-11-01", { budget: "—" })], "2026-11-01");
    expect(summary.total).toBe(0);
  });
});

describe("computeLodgingSummary", () => {
  it("agrupa noches seguidas en el mismo lugar con check-out al día siguiente", () => {
    const days = makeDays("2026-11-01", 3).map((d) => ({ ...d, lodgingPlace: "Asakusa, Tokio" }));
    expect(computeLodgingSummary(days)).toEqual([
      {
        checkIn: "2026-11-01",
        checkOut: "2026-11-04",
        nights: 3,
        place: "Asakusa, Tokio",
        recommendation: "Hostal",
      },
    ]);
  });

  it("separa estadías en el mismo lugar si no son seguidas", () => {
    const days = makeDays("2026-11-01", 3);
    days[0].lodgingPlace = "Asakusa, Tokio";
    days[1].lodgingPlace = "Centro, Kioto";
    days[2].lodgingPlace = "Asakusa, Tokio";
    const stays = computeLodgingSummary(days);
    expect(stays.map((s) => [s.place, s.nights])).toEqual([
      ["Asakusa, Tokio", 1],
      ["Centro, Kioto", 1],
      ["Asakusa, Tokio", 1],
    ]);
  });

  it("saltea los días sin cama: tránsito, bus nocturno y '---'", () => {
    const days = [
      makeDay("2026-11-01"),
      makeDay("2026-11-02", { nightBus: "#1" }),
      makeDay("2026-11-03", { accommodation: "---" }),
      makeDay("2026-11-04", { isTransit: true }),
    ];
    const stays = computeLodgingSummary(days);
    expect(stays).toHaveLength(1);
    expect(stays[0].nights).toBe(1);
  });

  it("usa la zona cuando el día no tiene lodgingPlace", () => {
    const stays = computeLodgingSummary([makeDay("2026-11-01", { zona: "Avenida Circunvalar, Pereira" })]);
    expect(stays[0].place).toBe("Avenida Circunvalar, Pereira");
  });
});
