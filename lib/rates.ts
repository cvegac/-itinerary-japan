import { useEffect, useState } from "react";
import type { Currency } from "@/lib/money";

// Cotización del día (fawazahmed0/currency-api: gratis, sin clave, por CDN, con
// el peso colombiano). Se guarda con cada gasto la del momento de registrarlo.

export type RateSnapshot = { date: string; perUsd: Record<Currency, number> };
export type RateSource = "live" | "cached" | "fixed";

const URLS = [
  "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
  // Respaldo oficial del mismo proyecto
  "https://latest.currency-api.pages.dev/v1/currencies/usd.json",
];
/** Última cotización conocida, para usar sin conexión (se guarda al registrar un gasto) */
const CACHE_KEY = "viajes-cambio";

type ApiResponse = { date?: string; usd?: { jpy?: number; cop?: number } };

export function parseRates(json: unknown): RateSnapshot | null {
  const { date, usd } = (json ?? {}) as ApiResponse;
  if (!date || !usd?.jpy || !usd?.cop) return null;
  return { date, perUsd: { USD: 1, JPY: usd.jpy, COP: usd.cop } };
}

export async function fetchRates(): Promise<RateSnapshot | null> {
  for (const url of URLS) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const rates = parseRates(await res.json());
      if (rates) return rates;
    } catch {
      // probar el siguiente
    }
  }
  return null;
}

export function cachedRates(): RateSnapshot | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as RateSnapshot) : null;
  } catch {
    return null;
  }
}

export function rememberRates(rates: RateSnapshot) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(rates));
  } catch {
    // Sin almacenamiento: la próxima vez sin conexión se usa el cambio fijo
  }
}

// Una consulta por sesión alcanza: la cotización cambia una vez por día
let session: Promise<RateSnapshot | null> | null = null;

/** Olvida la consulta de esta sesión (para que los tests no dependan del orden) */
export function forgetRatesSession() {
  session = null;
}

/** Cotización para registrar gastos: la de hoy, la última conocida o ninguna (cambio fijo) */
export function useRates(): { rates: RateSnapshot | null; source: RateSource } {
  const [state, setState] = useState<{ rates: RateSnapshot | null; source: RateSource }>({
    rates: null,
    source: "fixed",
  });

  useEffect(() => {
    const cached = cachedRates();
    if (cached) setState({ rates: cached, source: "cached" });
    let cancelled = false;
    session ??= fetchRates();
    session.then((live) => {
      if (!live) session = null; // sin conexión: reintentar la próxima vez
      if (live && !cancelled) setState({ rates: live, source: "live" });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
