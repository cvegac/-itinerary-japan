import type { DayEntry } from "@/types/DayEntry";

/** Tipo de cambio de los presupuestos (~156.9 el 2026-10-23, según currency-api) */
export const YEN_PER_USD = 157;
/** Comida por día, en USD */
export const FOOD_USD = 35;

const MONEY = /([¥$])\s*(\d[\d,]*)(?:\s*[–-]\s*[¥$]?(\d[\d,]*))?/;

const toNumber = (s: string) => Number(s.replace(/,/g, ""));

/**
 * Monto en yenes de un texto de costo ("~¥1,000–2,000", "¥200 + ¥100 de
 * impuesto", "~$50"). Los rangos cuentan por su punto medio, las partes
 * separadas por "+" se suman y los dólares se pasan a yenes. Solo cuenta el
 * primer monto de cada parte: lo demás suele ser una aclaración.
 */
export function parseCostYen(text: string): number {
  return text.split("+").reduce((sum, part) => {
    const m = part.match(MONEY);
    if (!m) return sum;
    const low = toNumber(m[2]);
    const amount = m[3] ? (low + toNumber(m[3])) / 2 : low;
    return sum + (m[1] === "$" ? amount * YEN_PER_USD : amount);
  }, 0);
}

const isOptional = (text: string) => /^(opcional|alternativa)\b/i.test(text.trim());

export type CostBreakdown = {
  lodging: number;
  transport: number;
  entries: number;
  food: number;
  total: number;
};

/**
 * Presupuesto del día en USD: hospedaje real de esa noche + los tramos de
 * transporte + las entradas que figuran en las actividades + comida.
 * No cuenta lo marcado como opcional ni las alternativas.
 */
export function dayCostBreakdown(day: DayEntry): CostBreakdown {
  const transportYen = day.transport.reduce((sum, leg) => {
    if (!leg.cost || (leg.note && isOptional(leg.note))) return sum;
    const roundTrip = /por tramo/.test(leg.cost) && /ida y vuelta/.test(`${leg.from} ${leg.to}`);
    return sum + parseCostYen(leg.cost) * (roundTrip ? 2 : 1);
  }, 0);

  const entriesYen = [...day.activitiesDay, ...day.activitiesNight]
    .filter((a) => !isOptional(a))
    .reduce((sum, a) => sum + parseCostYen(a), 0);

  const lodging = day.lodgingCost ?? 0;
  const transport = transportYen / YEN_PER_USD;
  const entries = entriesYen / YEN_PER_USD;

  return {
    lodging,
    transport: Math.round(transport),
    entries: Math.round(entries),
    food: FOOD_USD,
    total: Math.round(lodging + transport + entries + FOOD_USD),
  };
}
