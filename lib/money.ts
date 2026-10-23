import { YEN_PER_USD } from "@/lib/budget";

export type Currency = "JPY" | "USD" | "COP";

export const CURRENCIES: { code: Currency; label: string }[] = [
  { code: "JPY", label: "¥ Yen" },
  { code: "USD", label: "US$ Dólar" },
  { code: "COP", label: "COP Peso" },
];

/** Cambio aproximado del peso; el del yen es el del presupuesto (lib/budget.ts) */
export const COP_PER_USD = 4000;

const PER_USD: Record<Currency, number> = { USD: 1, JPY: YEN_PER_USD, COP: COP_PER_USD };

/** Monto en dólares, con los cambios fijos del presupuesto */
export function toUsd(amount: number, currency: Currency): number {
  return amount / PER_USD[currency];
}

export function formatMoney(amount: number, currency: Currency): string {
  if (currency === "JPY") return `¥${Math.round(amount).toLocaleString("en-US")}`;
  if (currency === "COP") return `COP ${Math.round(amount).toLocaleString("en-US")}`;
  const cents = Number.isInteger(amount) ? 0 : 2;
  return `US$${amount.toLocaleString("en-US", { minimumFractionDigits: cents, maximumFractionDigits: 2 })}`;
}
