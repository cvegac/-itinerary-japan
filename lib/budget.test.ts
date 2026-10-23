import { describe, expect, it } from "vitest";
import { dayCostBreakdown, parseCostYen } from "./budget";
import { makeDay } from "@/components/__tests__/fixtures";

describe("parseCostYen", () => {
  it.each([
    ["¥910", 910],
    ["~¥1,450", 1450],
    ["~¥2,000+", 2000],
    ["~¥500 ida", 500],
    ["~¥430 en total", 430],
    ["¥1,540 (o con el pase)", 1540],
    ["¥3,800 ida y vuelta", 3800],
  ])("lee un monto simple: %s", (text, yen) => {
    expect(parseCostYen(text)).toBe(yen);
  });

  it.each([
    ["~¥900–1,000", 950],
    ["~¥9,000–10,500", 9750],
    ["Pase de 1 día ~¥1,100–1,500", 1300],
    ["~¥1,500–3,000 (eléctrica más cara)", 2250],
  ])("usa el punto medio de un rango: %s", (text, yen) => {
    expect(parseCostYen(text)).toBe(yen);
  });

  it("suma las partes separadas por +", () => {
    expect(parseCostYen("¥200 + ¥100 de impuesto de visitante")).toBe(300);
    expect(parseCostYen("~¥2,000–4,000 eléctrica + peajes")).toBe(3000);
  });

  it("pasa los dólares a yenes a ¥157", () => {
    expect(parseCostYen("~$50")).toBe(7850);
  });

  it("cuenta el precio de un pase y nada si ya está incluido", () => {
    expect(parseCostYen("Incluido en el NIKKO PASS World Heritage Area (¥3,000, 2 días)")).toBe(3000);
    expect(parseCostYen("Incluido en el pase Kumano Gobo")).toBe(0);
  });

  it("ignora los números que no son plata", () => {
    expect(parseCostYen("Templo Kongobu-ji y su jardín de rocas (14:00, ~¥1,000)")).toBe(1000);
    expect(parseCostYen("Oyunohara: el torii más grande de Japón (34 m)")).toBe(0);
  });
});

describe("dayCostBreakdown", () => {
  it("suma hospedaje, transporte, entradas y comida en USD", () => {
    const day = makeDay("2026-11-02", "Lun", {
      lodgingCost: 54,
      transport: [
        { mode: "tren", from: "A", to: "B", cost: "~¥1,570" },
        { mode: "bus", from: "B", to: "A", cost: "¥1,570" },
      ],
      activitiesDay: ["Santuario Toshogu (~¥1,570)", "Abismo Kanmangafuchi"],
      activitiesNight: ["Onsen (~¥1,570)"],
    });
    expect(dayCostBreakdown(day)).toEqual({ lodging: 54, transport: 20, entries: 20, food: 35, total: 129 });
  });

  it("cuenta dos veces el costo por tramo de una ida y vuelta", () => {
    const day = makeDay("2026-11-18", "Mié", {
      transport: [{ mode: "tren", from: "Kioto", to: "Inari (ida y vuelta)", cost: "¥150 por tramo" }],
      activitiesDay: [],
      activitiesNight: [],
    });
    expect(dayCostBreakdown(day).transport).toBe(2);
  });

  it("no cuenta lo opcional ni las alternativas", () => {
    const day = makeDay("2026-11-12", "Jue", {
      transport: [{ mode: "bicicleta", from: "A", to: "B", cost: "~¥1,500", note: "Opcional" }],
      activitiesDay: ["Opcional: onsen Tsuboyu (~¥800)", "Alternativa: cascada Kegon (~¥600)", "Templo (~¥300)"],
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
