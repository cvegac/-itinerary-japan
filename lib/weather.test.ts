// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearForecastMemory,
  forecastUrl,
  isForecastable,
  parseForecast,
  readSavedForecast,
  saveForecast,
  useForecast,
  weatherLabel,
} from "./weather";

const DAILY = {
  time: ["2026-11-01"],
  weather_code: [51],
  temperature_2m_max: [17.8],
  temperature_2m_min: [13.1],
  precipitation_probability_max: [13],
};
// Formato real de Open-Meteo: 24 horas del día pedido
const HOURLY = {
  time: Array.from({ length: 24 }, (_, h) => `2026-11-01T${String(h).padStart(2, "0")}:00`),
  temperature_2m: Array.from({ length: 24 }, (_, h) => 10 + h * 0.4),
  precipitation_probability: Array.from({ length: 24 }, (_, h) => (h === 20 ? 40 : 0)),
  weather_code: Array.from({ length: 24 }, (_, h) => (h < 12 ? 0 : 3)),
};

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

  it("pide también la temperatura, la lluvia y el tiempo hora por hora", () => {
    const url = new URL(forecastUrl("2026-11-01", [35.7119, 139.7983]));
    expect(url.searchParams.get("hourly")).toBe("temperature_2m,precipitation_probability,weather_code");
  });
});

describe("parseForecast", () => {
  it("lee el pronóstico del día (formato real de Open-Meteo)", () => {
    expect(parseForecast({ daily: DAILY })).toEqual({ code: 51, max: 18, min: 13, rain: 13, parts: [] });
  });

  it("arma la mañana, el mediodía, la tarde y la noche con las horas 8, 12, 16 y 20", () => {
    expect(parseForecast({ daily: DAILY, hourly: HOURLY })!.parts).toEqual([
      { label: "Mañana", hour: 8, temp: 13, rain: 0, code: 0 },
      { label: "Mediodía", hour: 12, temp: 15, rain: 0, code: 3 },
      { label: "Tarde", hour: 16, temp: 16, rain: 0, code: 3 },
      { label: "Noche", hour: 20, temp: 18, rain: 40, code: 3 },
    ]);
  });

  it("devuelve null si la respuesta es un error o viene vacía", () => {
    expect(parseForecast({ error: true, reason: "fuera de rango" })).toBeNull();
    expect(parseForecast({ daily: { time: [] } })).toBeNull();
  });
});

describe("pronóstico guardado en el dispositivo", () => {
  const url = forecastUrl("2026-11-09", [34.25, 135.58]);
  const f = { code: 3, max: 14, min: 6, rain: 10, parts: [] };

  afterEach(() => localStorage.clear());

  it("guarda el último pronóstico de cada día y lugar, con la hora en que llegó", () => {
    saveForecast(url, f, new Date("2026-11-08T14:05:00"));
    expect(readSavedForecast(url)).toEqual({ forecast: f, savedAt: new Date("2026-11-08T14:05:00").toISOString() });
    expect(readSavedForecast(forecastUrl("2026-11-10", [34.25, 135.58]))).toBeNull();
  });

  it("borra lo guardado hace más de 20 días", () => {
    const old = forecastUrl("2026-10-10", [35, 135]);
    saveForecast(old, f, new Date("2026-10-09T10:00:00"));
    saveForecast(url, f, new Date("2026-11-08T14:05:00"));
    expect(readSavedForecast(old)).toBeNull();
    expect(readSavedForecast(url)).not.toBeNull();
  });

  it("si el almacenamiento falla, sigue sin guardar", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("lleno");
    });
    expect(() => saveForecast(url, f, new Date())).not.toThrow();
    vi.restoreAllMocks();
  });
});

describe("useForecast", () => {
  const date = "2026-11-01";
  const place: [number, number] = [35.71, 139.8];
  const url = forecastUrl(date, place);

  afterEach(() => {
    localStorage.clear();
    clearForecastMemory();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("con internet trae el pronóstico, lo guarda y no lo marca como guardado", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ json: async () => ({ daily: DAILY, hourly: HOURLY }) })));
    const { result } = renderHook(() => useForecast(date, place, "2026-11-01"));
    await waitFor(() => expect(result.current?.forecast.max).toBe(18));
    expect(result.current!.savedAt).toBeNull();
    expect(readSavedForecast(url)?.forecast.max).toBe(18);
  });

  it("sin internet muestra el último guardado y de cuándo es", async () => {
    saveForecast(url, { code: 3, max: 14, min: 6, rain: 10, parts: [] }, new Date("2026-10-31T09:00:00"));
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useForecast(date, place, "2026-11-01"));
    await act(async () => {});
    expect(result.current).toEqual({
      forecast: { code: 3, max: 14, min: 6, rain: 10, parts: [] },
      savedAt: new Date("2026-10-31T09:00:00").toISOString(),
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("si la red falla, también usa el guardado", async () => {
    saveForecast(url, { code: 3, max: 14, min: 6, rain: 10, parts: [] }, new Date("2026-10-31T09:00:00"));
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("sin señal"))));
    const { result } = renderHook(() => useForecast(date, place, "2026-11-01"));
    await act(async () => {});
    expect(result.current?.savedAt).toBe(new Date("2026-10-31T09:00:00").toISOString());
  });

  it("sin internet y sin nada guardado no muestra nada", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const { result } = renderHook(() => useForecast(date, place, "2026-11-01"));
    await act(async () => {});
    expect(result.current).toBeNull();
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
