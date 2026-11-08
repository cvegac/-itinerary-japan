import { useEffect, useState } from "react";

// Pronóstico del día con Open-Meteo (gratis, sin clave). Cubre ~15 días adelante.
// Cada pronóstico que llega se guarda en el dispositivo (localStorage "viajes-clima"):
// sin señal, por ejemplo en un sendero, se muestra el último guardado y de cuándo es.

/** Un momento del día: temperatura, lluvia y tiempo a esa hora */
export type ForecastPart = { label: string; hour: number; temp: number; rain: number | null; code: number };

export type Forecast = { code: number; max: number; min: number; rain: number | null; parts: ForecastPart[] };

/** Lo que muestra la app: el pronóstico y, si viene de lo guardado (sin red), cuándo llegó */
export type ForecastState = { forecast: Forecast; savedAt: string | null };

const MAX_DAYS_AHEAD = 15;
/** Mañana, mediodía, tarde y noche (hora de Japón) */
const PARTS: [string, number][] = [
  ["Mañana", 8],
  ["Mediodía", 12],
  ["Tarde", 16],
  ["Noche", 20],
];
const STORAGE_KEY = "viajes-clima";
/** Lo guardado hace más que esto ya no sirve: se borra al guardar algo nuevo */
const KEEP_DAYS = 20;

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
    hourly: "temperature_2m,precipitation_probability,weather_code",
    timezone: "Asia/Tokyo",
    start_date: date,
    end_date: date,
  });
  return `https://api.open-meteo.com/v1/forecast?${params}`;
}

type OpenMeteo = {
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: (number | null)[];
  };
  hourly?: {
    time?: string[];
    temperature_2m?: (number | null)[];
    precipitation_probability?: (number | null)[];
    weather_code?: (number | null)[];
  };
};

function parseParts(hourly: OpenMeteo["hourly"]): ForecastPart[] {
  if (!hourly?.time?.length) return [];
  return PARTS.flatMap(([label, hour]) => {
    const i = hourly.time!.findIndex((t) => +t.slice(11, 13) === hour);
    const temp = hourly.temperature_2m?.[i];
    const code = hourly.weather_code?.[i];
    if (i < 0 || temp == null || code == null) return [];
    return [{ label, hour, temp: Math.round(temp), rain: hourly.precipitation_probability?.[i] ?? null, code }];
  });
}

export function parseForecast(json: unknown): Forecast | null {
  const { daily: d, hourly } = (json as OpenMeteo) ?? {};
  if (!d?.time?.length || d.weather_code?.[0] === undefined) return null;
  return {
    code: d.weather_code[0],
    max: Math.round(d.temperature_2m_max?.[0] ?? NaN),
    min: Math.round(d.temperature_2m_min?.[0] ?? NaN),
    rain: d.precipitation_probability_max?.[0] ?? null,
    parts: parseParts(hourly),
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

// ── Guardado en el dispositivo ─────────────────────────────────────────────
type Saved = Record<string, { f: Forecast; at: string }>;

function readAll(): Saved {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Saved) : {};
  } catch {
    return {};
  }
}

/** Guarda el pronóstico de ese día y lugar; borra lo que tenga más de 20 días. Si falla, no pasa nada */
export function saveForecast(url: string, forecast: Forecast, now: Date): void {
  const limit = now.getTime() - KEEP_DAYS * 86400000;
  const kept = Object.entries(readAll()).filter(([, v]) => Date.parse(v.at) >= limit);
  const all: Saved = { ...Object.fromEntries(kept), [url]: { f: forecast, at: now.toISOString() } };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Sin espacio o bloqueado: seguimos sin guardar
  }
}

export function readSavedForecast(url: string): ForecastState | null {
  const saved = readAll()[url];
  return saved ? { forecast: saved.f, savedAt: saved.at } : null;
}

// Lo que ya llegó por red en esta sesión (no hace falta pedirlo de nuevo)
const memory = new Map<string, Forecast>();

/** Para los tests: olvida lo traído en esta sesión */
export function clearForecastMemory(): void {
  memory.clear();
}

/**
 * Pronóstico de un día en un lugar. Con red lo trae (y lo guarda); sin red, o si la
 * red falla, devuelve el último guardado con su hora. null fuera de rango o sin nada.
 */
export function useForecast(date: string, place: [number, number], today: string | null): ForecastState | null {
  const url = today && isForecastable(date, today) ? forecastUrl(date, place) : null;
  const [state, setState] = useState<ForecastState | null>(null);

  useEffect(() => {
    if (!url) return setState(null);
    const fresh = memory.get(url);
    if (fresh) return setState({ forecast: fresh, savedAt: null });
    const saved = readSavedForecast(url);
    // Mientras llega el nuevo, lo guardado (si hay)
    setState(saved);
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    let cancelled = false;
    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        const f = parseForecast(json);
        if (!f) throw new Error("sin pronóstico");
        memory.set(url, f);
        saveForecast(url, f, new Date());
        if (!cancelled) setState({ forecast: f, savedAt: null });
      })
      .catch(() => !cancelled && setState(saved));
    return () => {
      cancelled = true;
    };
  }, [url]);

  return state;
}
