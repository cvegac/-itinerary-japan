import { useEffect, useState } from "react";

// Pronóstico del día con Open-Meteo (gratis, sin clave). Necesita internet y solo
// cubre ~15 días adelante: fuera de eso, o sin conexión, no se muestra nada.
// No guarda nada en el dispositivo: queda en memoria mientras la app está abierta.

export type Forecast = { code: number; max: number; min: number; rain: number | null };

const MAX_DAYS_AHEAD = 15;

const dayNumber = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86400000;

export function isForecastable(date: string, today: string): boolean {
  const ahead = dayNumber(date) - dayNumber(today);
  return ahead >= 0 && ahead <= MAX_DAYS_AHEAD;
}

export function forecastUrl(date: string, [lat, lng]: [number, number]): string {
  const params = new URLSearchParams({
    latitude: String(Math.round(lat * 100) / 100),
    longitude: String(Math.round(lng * 100) / 100),
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: "Asia/Tokyo",
    start_date: date,
    end_date: date,
  });
  return `https://api.open-meteo.com/v1/forecast?${params}`;
}

type OpenMeteoDaily = {
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: (number | null)[];
  };
};

export function parseForecast(json: unknown): Forecast | null {
  const d = (json as OpenMeteoDaily)?.daily;
  if (!d?.time?.length || d.weather_code?.[0] === undefined) return null;
  return {
    code: d.weather_code[0],
    max: Math.round(d.temperature_2m_max?.[0] ?? NaN),
    min: Math.round(d.temperature_2m_min?.[0] ?? NaN),
    rain: d.precipitation_probability_max?.[0] ?? null,
  };
}

/** Códigos del tiempo de la OMM (los que usa Open-Meteo) */
export function weatherLabel(code: number): { icon: string; text: string } {
  if (code === 0 || code === 1) return { icon: "☀️", text: "Despejado" };
  if (code === 2) return { icon: "⛅", text: "Parcialmente nublado" };
  if (code === 3) return { icon: "☁️", text: "Nublado" };
  if (code === 45 || code === 48) return { icon: "🌫️", text: "Niebla" };
  if (code >= 51 && code <= 57) return { icon: "🌦️", text: "Llovizna" };
  if (code >= 61 && code <= 67) return { icon: "🌧️", text: "Lluvia" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { icon: "🌨️", text: "Nieve" };
  if (code >= 80 && code <= 82) return { icon: "🌦️", text: "Chubascos" };
  if (code >= 95) return { icon: "⛈️", text: "Tormenta" };
  return { icon: "🌡️", text: "Pronóstico" };
}

const cache = new Map<string, Forecast | null>();

/** Pronóstico de un día en un lugar; null mientras carga, sin red o fuera de rango */
export function useForecast(date: string, place: [number, number], today: string | null): Forecast | null {
  const url = today && isForecastable(date, today) ? forecastUrl(date, place) : null;
  const [forecast, setForecast] = useState<Forecast | null>(url ? (cache.get(url) ?? null) : null);

  useEffect(() => {
    if (!url) return setForecast(null);
    if (cache.has(url)) return setForecast(cache.get(url) ?? null);
    if (typeof navigator !== "undefined" && !navigator.onLine) return setForecast(null);
    let cancelled = false;
    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        const f = parseForecast(json);
        cache.set(url, f);
        if (!cancelled) setForecast(f);
      })
      .catch(() => !cancelled && setForecast(null));
    return () => {
      cancelled = true;
    };
  }, [url]);

  return forecast;
}
