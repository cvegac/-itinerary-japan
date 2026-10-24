import { describe, expect, expectTypeOf, it } from "vitest";
import type { z } from "zod";
import { DaySchema, itineraryIssues } from "./schema";
import type { DayEntry } from "@/types/DayEntry";
import { makeDay } from "@/components/__tests__/fixtures";

const valid = makeDay("2026-11-04", "Mié", {
  transport: [{ mode: "avión", from: "NRT", to: "HIJ", cost: { amount: 53, currency: "USD", approx: true } }],
  activitiesDay: ["Parque de la Paz", { text: "Museo", price: { amount: 200, currency: "JPY" } }],
});

describe("itineraryIssues", () => {
  it("un día bien armado no tiene errores", () => {
    expect(itineraryIssues([valid])).toEqual([]);
  });

  it("detecta un campo mal escrito", () => {
    const typo = { ...valid, acommodation: "Hotel" };
    expect(itineraryIssues([typo]).join()).toMatch(/2026-11-04 .*acommodation/);
  });

  it("detecta montos y monedas inválidos", () => {
    const bad = makeDay("2026-11-04", "Mié", {
      transport: [
        { mode: "tren", from: "A", to: "B", cost: { amount: -5, currency: "JPY" } },
        { mode: "bus", from: "B", to: "C", cost: { amount: 100, currency: "EUR" } as never },
        { mode: "bus", from: "C", to: "D", cost: { amount: 500, max: 200, currency: "JPY" } },
      ],
    });
    const issues = itineraryIssues([bad]);
    expect(issues.some((i) => i.startsWith("2026-11-04 transport.0.cost.amount"))).toBe(true);
    expect(issues.some((i) => i.startsWith("2026-11-04 transport.1.cost.currency"))).toBe(true);
    expect(issues.some((i) => i.includes("max tiene que ser mayor"))).toBe(true);
  });

  it("detecta fechas, coordenadas y días de la semana inválidos", () => {
    const bad = { ...valid, date: "4/11/2026", accommodationCoords: [135, 34], weekday: "Wed" };
    const issues = itineraryIssues([bad]).join("\n");
    expect(issues).toMatch(/date: fecha YYYY-MM-DD/);
    expect(issues).toMatch(/accommodationCoords\.0/);
    expect(issues).toMatch(/weekday/);
  });
});

describe("DaySchema", () => {
  it("describe el mismo tipo que DayEntry (cada uno encaja en el otro)", () => {
    // No compila si se agrega un campo obligatorio a uno solo o cambia el tipo de
    // un campo. Un campo opcional nuevo no lo frena esto: lo frena la validación
    // de los datos (strict) en cuanto aparece en un JSON
    expectTypeOf<z.infer<typeof DaySchema>>().toExtend<DayEntry>();
    expectTypeOf<DayEntry>().toExtend<z.infer<typeof DaySchema>>();
  });
});
