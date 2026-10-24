import { describe, expect, it } from "vitest";
import { dayCostBreakdown } from "./budget";
import { makeDay } from "@/components/__tests__/fixtures";

const yen = (amount: number, extra = {}) => ({ amount, currency: "JPY" as const, ...extra });

describe("dayCostBreakdown", () => {
  it("suma hospedaje, transporte, entradas y comida en USD", () => {
    const day = makeDay("2026-11-02", "Lun", {
      lodgingCost: 54,
      transport: [
        { mode: "tren", from: "A", to: "B", cost: yen(1570, { approx: true }) },
        { mode: "bus", from: "B", to: "A", cost: yen(1570) },
      ],
      activitiesDay: [{ text: "Santuario Toshogu", price: yen(1570, { approx: true }) }, "Abismo Kanmangafuchi"],
      activitiesNight: [{ text: "Onsen", price: yen(1570) }],
    });
    expect(dayCostBreakdown(day)).toEqual({ lodging: 54, transport: 20, entries: 20, food: 35, total: 129 });
  });

  it("un rango cuenta por su punto medio y los dólares se pasan a yenes", () => {
    const day = makeDay("2026-11-04", "Mié", {
      transport: [
        { mode: "avión", from: "NRT", to: "HIJ", cost: { amount: 53, currency: "USD" } },
        { mode: "bici", from: "A", to: "B", cost: yen(1000, { max: 2140 }) },
      ],
      activitiesDay: [],
      activitiesNight: [],
    });
    expect(dayCostBreakdown(day).transport).toBe(63);
  });

  it("cuenta dos veces el costo por tramo de una ida y vuelta", () => {
    const day = makeDay("2026-11-18", "Mié", {
      transport: [{ mode: "tren", from: "Kioto", to: "Inari (ida y vuelta)", cost: yen(157, { perLeg: true }) }],
      activitiesDay: [],
      activitiesNight: [],
    });
    expect(dayCostBreakdown(day).transport).toBe(2);
  });

  it("no cuenta lo opcional ni lo que cubre un pase sin precio", () => {
    const day = makeDay("2026-11-12", "Jue", {
      transport: [
        { mode: "bicicleta", from: "A", to: "B", cost: yen(1570), optional: true },
        { mode: "bus", from: "B", to: "C", cost: yen(0, { included: "el pase" }) },
      ],
      activitiesDay: [
        { text: "Opcional: onsen Tsuboyu", price: yen(800), optional: true },
        { text: "Templo", price: yen(314) },
      ],
      activitiesNight: [],
    });
    const { transport, entries } = dayCostBreakdown(day);
    expect(transport).toBe(0);
    expect(entries).toBe(2);
  });

  it("sin precio de hospedaje cuenta cero", () => {
    const day = makeDay("2026-12-05", "Sáb", { transport: [], activitiesDay: [], activitiesNight: [] });
    expect(dayCostBreakdown(day)).toEqual({ lodging: 0, transport: 0, entries: 0, food: 35, total: 35 });
  });
});
