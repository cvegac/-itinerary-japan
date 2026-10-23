import { YEN_PER_USD } from "@/lib/budget";

export type Currency = "JPY" | "USD" | "COP";

export const CURRENCIES: { code: Currency; label: string }[] = [
  { code: "JPY", label: "¥ Yen" },
  { code: "USD", label: "US$ Dólar" },
  { code: "COP", label: "COP Peso" },
];

/** Cambios de respaldo, para cuando un gasto no tiene su cotización guardada (sin
 *  conexión y sin una conocida). Peso: ~3,184 el 2026-10-23; yen: el del presupuesto */
export const COP_PER_USD = 3200;

const PER_USD: Record<Currency, number> = { USD: 1, JPY: YEN_PER_USD, COP: COP_PER_USD };

/** Monto en dólares con los cambios de respaldo (para un gasto, mejor expenseUsd) */
export function toUsd(amount: number, currency: Currency): number {
  return amount / PER_USD[currency];
}

/** decimals: para mostrar una cotización (¥156.94); los montos van sin decimales */
export function formatMoney(amount: number, currency: Currency, decimals?: number): string {
  const n =
    decimals === undefined
      ? Math.round(amount).toLocaleString("en-US")
      : amount.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  if (currency === "JPY") return `¥${n}`;
  if (currency === "COP") return `COP ${n}`;
  const cents = Number.isInteger(amount) ? 0 : 2;
  return `US$${amount.toLocaleString("en-US", { minimumFractionDigits: cents, maximumFractionDigits: 2 })}`;
}
