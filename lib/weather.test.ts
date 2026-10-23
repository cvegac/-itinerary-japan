import { describe, expect, it } from "vitest";
import { forecastUrl, isForecastable, parseForecast, weatherLabel } from "./weather";

describe("isForecastable", () => {
  it("hay pronóstico desde hoy hasta 15 días adelante", () => {
    expect(isForecastable("2026-10-23", "2026-10-23")).toBe(true);
    expect(isForecastable("2026-11-07", "2026-10-23")).toBe(true);
    expect(isForecastable("2026-11-08", "2026-10-23")).toBe(false);
    expect(isForecastable("2026-10-22", "2026-10-23")).toBe(false);
  });
});

describe("forecastUrl", () => {
  it("pide el día exacto, en hora de Japón", () => {
    const url = new URL(forecastUrl("2026-11-01", [35.7119, 139.7983]));
    expect(url.origin).toBe("https://api.open-meteo.com");
    expect(url.searchParams.get("latitude")).toBe("35.71");
    expect(url.searchParams.get("longitude")).toBe("139.8");
    expect(url.searchParams.get("start_date")).toBe("2026-11-01");
    expect(url.searchParams.get("end_date")).toBe("2026-11-01");
    expect(url.searchParams.get("timezone")).toBe("Asia/Tokyo");
  });
});

describe("parseForecast", () => {
  it("lee el pronóstico del día (formato real de Open-Meteo)", () => {
    const json = {
      daily: {
        time: ["2026-11-01"],
        weather_code: [51],
        temperature_2m_max: [17.8],
        temperature_2m_min: [13.1],
        precipitation_probability_max: [13],
      },
    };
    expect(parseForecast(json)).toEqual({ code: 51, max: 18, min: 13, rain: 13 });
  });

  it("devuelve null si la respuesta es un error o viene vacía", () => {
    expect(parseForecast({ error: true, reason: "fuera de rango" })).toBeNull();
    expect(parseForecast({ daily: { time: [] } })).toBeNull();
  });
});

describe("weatherLabel", () => {
  it.each([
    [0, "☀️", "Despejado"],
    [2, "⛅", "Parcialmente nublado"],
    [3, "☁️", "Nublado"],
    [45, "🌫️", "Niebla"],
    [51, "🌦️", "Llovizna"],
    [63, "🌧️", "Lluvia"],
    [73, "🌨️", "Nieve"],
    [81, "🌦️", "Chubascos"],
    [95, "⛈️", "Tormenta"],
  ])("código %s → %s %s", (code, icon, text) => {
    expect(weatherLabel(code)).toEqual({ icon, text });
  });
});
