// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cachedRates, fetchRates, parseRates, rememberRates } from "./rates";

// Formato real de fawazahmed0/currency-api (23 oct 2026)
const SAMPLE = { date: "2026-10-23", usd: { jpy: 156.94439449, cop: 3181.47368203, eur: 0.86 } };

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("parseRates", () => {
  it("lee cuántos yenes y pesos vale un dólar, y la fecha", () => {
    expect(parseRates(SAMPLE)).toEqual({ date: "2026-10-23", perUsd: { USD: 1, JPY: 156.94439449, COP: 3181.47368203 } });
  });

  it("devuelve null si falta algo", () => {
    expect(parseRates({ date: "2026-10-23", usd: { jpy: 156 } })).toBeNull();
    expect(parseRates({ error: true })).toBeNull();
  });
});

describe("fetchRates", () => {
  it("si el primer servidor falla, prueba el de respaldo", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("caído"))
      .mockResolvedValueOnce({ ok: true, json: async () => SAMPLE });
    vi.stubGlobal("fetch", fetchMock);
    const rates = await fetchRates();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(rates?.perUsd.JPY).toBeCloseTo(156.94);
  });

  it("sin conexión devuelve null", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("sin red")));
    expect(await fetchRates()).toBeNull();
  });
});

describe("cotización recordada", () => {
  it("se guarda solo cuando se lo pide y se puede leer después", () => {
    expect(cachedRates()).toBeNull();
    expect(localStorage.length).toBe(0);
    rememberRates(parseRates(SAMPLE)!);
    expect(cachedRates()?.date).toBe("2026-10-23");
  });
});
