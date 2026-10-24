import type { DayEntry } from "@/types/DayEntry";

// El tipo de cambio vive en lib/money.ts (fuente única de los cambios)
import { YEN_PER_USD } from "@/lib/money";
import { costYen, priceYen } from "@/lib/cost";
export { YEN_PER_USD };
/** Comida por día, en USD */
export const FOOD_USD = 35;

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
    if (!leg.cost || leg.optional) return sum;
    const roundTrip = leg.cost.perLeg && /ida y vuelta/.test(`${leg.from} ${leg.to}`);
    return sum + costYen(leg.cost) * (roundTrip ? 2 : 1);
  }, 0);

  const entriesYen = [...day.activitiesDay, ...day.activitiesNight].reduce(
    (sum, a) => (typeof a === "string" || !a.price || a.optional ? sum : sum + priceYen(a.price)),
    0
  );

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
