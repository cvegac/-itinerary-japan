import { describe, expect, it } from "vitest";
import { formatMoney, toUsd } from "./money";

describe("toUsd", () => {
  it("pasa cada moneda a dólares con los cambios de respaldo", () => {
    expect(toUsd(1500, "JPY")).toBe(10);
    expect(toUsd(32000, "COP")).toBe(10);
    expect(toUsd(12.5, "USD")).toBe(12.5);
  });
});

describe("formatMoney", () => {
  it("muestra cada moneda a su manera", () => {
    expect(formatMoney(1600, "JPY")).toBe("¥1,600");
    expect(formatMoney(12.5, "USD")).toBe("US$12.50");
    expect(formatMoney(12, "USD")).toBe("US$12");
    expect(formatMoney(209930, "COP")).toBe("COP 209,930");
    expect(formatMoney(156.944, "JPY", 2)).toBe("¥156.94");
  });
});
