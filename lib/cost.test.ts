import { describe, expect, it } from "vitest";
import { costYen, formatCost, formatPrice, priceYen } from "./cost";

describe("formatCost", () => {
  it.each([
    [{ amount: 910, currency: "JPY" }, "¥910"],
    [{ amount: 1000, max: 2000, currency: "JPY", approx: true }, "~¥1,000–2,000"],
    [{ amount: 3800, currency: "JPY", detail: "ida y vuelta" }, "¥3,800 ida y vuelta"],
    [{ amount: 150, currency: "JPY", perLeg: true }, "¥150 por tramo"],
    [{ amount: 1540, currency: "JPY", detail: "(o con el pase)" }, "¥1,540 (o con el pase)"],
    [{ amount: 53, currency: "USD", approx: true }, "~US$53"],
    [{ amount: 20000, currency: "COP", approx: true, detail: "(~$5)" }, "~COP 20,000 (~$5)"],
    [{ amount: 0, currency: "JPY", included: "el pase" }, "Incluido en el pase"],
    [
      { amount: 3000, currency: "JPY", included: "el NIKKO PASS World Heritage Area", detail: "2 días" },
      "Incluido en el NIKKO PASS World Heritage Area (¥3,000, 2 días)",
    ],
  ] as const)("%o → %s", (cost, text) => {
    expect(formatCost(cost)).toBe(text);
  });
});

describe("costYen", () => {
  it("cuenta el punto medio de un rango y pasa otras monedas a yenes", () => {
    expect(costYen({ amount: 1000, max: 2000, currency: "JPY" })).toBe(1500);
    expect(costYen({ amount: 50, currency: "USD" })).toBe(50 * 157);
  });

  it("un pase incluido sin precio no suma; con precio, sí", () => {
    expect(costYen({ amount: 0, currency: "JPY", included: "el pase" })).toBe(0);
    expect(costYen({ amount: 3000, currency: "JPY", included: "el pase" })).toBe(3000);
  });
});

describe("precios de las actividades", () => {
  it("se muestran aproximados y suman en yenes", () => {
    expect(formatPrice({ amount: 650, max: 800, currency: "JPY", approx: true })).toBe("~¥650–800");
    expect(priceYen({ amount: 650, max: 800, currency: "JPY" })).toBe(725);
  });
});
