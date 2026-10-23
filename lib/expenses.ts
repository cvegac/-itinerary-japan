import { toUsd, type Currency } from "@/lib/money";
import { useSyncedRecords } from "@/lib/synced-records";

// Gastos reales y retiros de efectivo del viaje (sincronizados, ver synced-records)

export type PaymentMethod = "cash" | "card";

export type Expense = {
  id: string;
  /** Día del itinerario (YYYY-MM-DD) */
  date: string;
  /** Monto en la moneda en que se cobró */
  amount: number;
  currency: Currency;
  method: PaymentMethod;
  note: string;
  createdAt: number;
};

/** Efectivo sacado del cajero, en yenes */
export type Withdrawal = {
  id: string;
  date: string;
  amountYen: number;
  note: string;
  createdAt: number;
};

/** Los primeros gastos se guardaban solo en yenes, como amountYen */
function normalizeExpense(raw: Expense & { amountYen?: number }): Expense {
  if (raw.amount !== undefined) return raw;
  const { amountYen, ...rest } = raw;
  return { ...rest, amount: amountYen ?? 0, currency: "JPY", method: "card" };
}

export function useExpenses(slug: string) {
  return useSyncedRecords<Expense>(slug, "expenses", "gastos", normalizeExpense);
}

export function useWithdrawals(slug: string) {
  return useSyncedRecords<Withdrawal>(slug, "withdrawals", "retiros");
}

/** Lo gastado cada día, en dólares (sumando todas las monedas) */
export function spentByDate(expenses: Expense[]): Record<string, number> {
  const totals: Record<string, number> = {};
  expenses.forEach((e) => (totals[e.date] = (totals[e.date] ?? 0) + toUsd(e.amount, e.currency)));
  return totals;
}

/** Efectivo en yenes: lo retirado menos lo pagado en efectivo con yenes */
export function cashBalance(expenses: Expense[], withdrawals: Withdrawal[]) {
  const withdrawn = withdrawals.reduce((sum, w) => sum + w.amountYen, 0);
  const spentCash = expenses
    .filter((e) => e.method === "cash" && e.currency === "JPY")
    .reduce((sum, e) => sum + e.amount, 0);
  return { withdrawn, spentCash, balance: withdrawn - spentCash };
}

export type DaySummary = { date: string; expenses: Expense[]; withdrawals: Withdrawal[]; totalUsd: number };

/** Gastos y retiros agrupados por día, del primero al último */
export function dailySummary(expenses: Expense[], withdrawals: Withdrawal[]): DaySummary[] {
  const days = new Map<string, DaySummary>();
  const day = (date: string) => {
    if (!days.has(date)) days.set(date, { date, expenses: [], withdrawals: [], totalUsd: 0 });
    return days.get(date)!;
  };
  expenses.forEach((e) => {
    const d = day(e.date);
    d.expenses.push(e);
    d.totalUsd += toUsd(e.amount, e.currency);
  });
  withdrawals.forEach((w) => day(w.date).withdrawals.push(w));
  return Array.from(days.values()).sort((a, b) => a.date.localeCompare(b.date));
}
