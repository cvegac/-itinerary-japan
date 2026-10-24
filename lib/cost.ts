import { COP_PER_USD, YEN_PER_USD, type Currency } from "@/lib/money";

// Montos del itinerario como datos (antes eran frases que se interpretaban con
// expresiones regulares): se muestran con formatCost/formatPrice y el
// presupuesto los suma con costYen/priceYen.

/** Un precio: exacto, o un rango de amount a max */
export type Money = {
  amount: number;
  max?: number;
  currency: Currency;
  /** Aproximado: se muestra con "~" */
  approx?: boolean;
};

/** Costo de un tramo de transporte */
export type Cost = Money & {
  /** El precio es por tramo; si el tramo es "ida y vuelta" cuenta dos veces */
  perLeg?: boolean;
  /** Lo cubre un pase (su nombre); el amount, si hay, es lo que cuesta el pase */
  included?: string;
  /** Aclaración que va después del precio: "ida y vuelta", "(o con el pase)"… */
  detail?: string;
};

const YEN_PER: Record<Currency, number> = { JPY: 1, USD: YEN_PER_USD, COP: YEN_PER_USD / COP_PER_USD };

function number(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function formatPrice(m: Money): string {
  const symbol = m.currency === "JPY" ? "¥" : m.currency === "USD" ? "US$" : "COP ";
  const range = m.max !== undefined ? `${number(m.amount)}–${number(m.max)}` : number(m.amount);
  return `${m.approx ? "~" : ""}${symbol}${range}`;
}

export function formatCost(c: Cost): string {
  if (c.included) {
    const inside = [c.amount ? formatPrice(c) : "", c.detail ?? ""].filter(Boolean).join(", ");
    return `Incluido en ${c.included}${inside ? ` (${inside})` : ""}`;
  }
  return [formatPrice(c), c.perLeg ? "por tramo" : "", c.detail ?? ""].filter(Boolean).join(" ");
}

/** En yenes; los rangos cuentan por su punto medio */
export function priceYen(m: Money): number {
  const value = m.max !== undefined ? (m.amount + m.max) / 2 : m.amount;
  return value * YEN_PER[m.currency];
}

export const costYen = (c: Cost): number => priceYen(c);
