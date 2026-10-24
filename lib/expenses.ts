import { toUsd, type Currency } from "@/lib/money";
import { useSyncedRecords } from "@/lib/synced-records";

// Gastos reales y retiros de efectivo del viaje (sincronizados, ver synced-records)

export type PaymentMethod = "cash" | "card";

/** Tipo de gasto: los cuatro primeros son los mismos rubros del presupuesto (lib/budget.ts) */
export type ExpenseCategory = "comida" | "transporte" | "hospedaje" | "entradas" | "compras" | "otros";

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string; icon: string }[] = [
  { value: "comida", label: "Comida", icon: "🍜" },
  { value: "transporte", label: "Transporte", icon: "🚆" },
  { value: "hospedaje", label: "Hospedaje", icon: "🛏️" },
  { value: "entradas", label: "Entradas y actividades", icon: "🎟️" },
  { value: "compras", label: "Compras y souvenirs", icon: "🛍️" },
  { value: "otros", label: "Otros", icon: "📦" },
];

export type Expense = {
  id: string;
  /** Día del itinerario (YYYY-MM-DD) */
  date: string;
  /** Monto en la moneda en que se cobró */
  amount: number;
  currency: Currency;
  method: PaymentMethod;
  /** Sin tipo: se cargó antes de que existiera (cuenta como "otros") */
  category?: ExpenseCategory;
  /** Noches que cubre un pago de hospedaje (YYYY-MM-DD): el monto se reparte
   *  entre ellas. Sin esto, cuenta solo para `date` */
  nights?: string[];
  note: string;
  createdAt: number;
  /** Cotización al registrarlo: cuántas unidades de su moneda valía un dólar */
  perUsd?: number;
  /** Fecha de esa cotización (YYYY-MM-DD) */
  rateDate?: string;
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

export function expenseCategory(e: Expense): ExpenseCategory {
  return e.category ?? "otros";
}

export function categoryInfo(e: Expense) {
  const value = expenseCategory(e);
  return EXPENSE_CATEGORIES.find((c) => c.value === value)!;
}

/** Un gasto en dólares: con su cotización guardada o, si no tiene, la de respaldo */
export function expenseUsd(e: Expense): number {
  return e.perUsd ? e.amount / e.perUsd : toUsd(e.amount, e.currency);
}

/** Los días a los que corresponde el gasto: las noches que paga, o el día en que se hizo */
export function expenseDates(e: Expense): string[] {
  return e.nights?.length ? e.nights : [e.date];
}

/** La parte del gasto que le toca a cada uno de sus días, en dólares */
export function expenseShareUsd(e: Expense): number {
  return expenseUsd(e) / expenseDates(e).length;
}

/** Lo gastado cada día, en dólares (sumando todas las monedas; el hospedaje,
 *  repartido entre sus noches) */
export function spentByDate(expenses: Expense[]): Record<string, number> {
  const totals: Record<string, number> = {};
  expenses.forEach((e) => expenseDates(e).forEach((d) => (totals[d] = (totals[d] ?? 0) + expenseShareUsd(e))));
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
  // Un hospedaje de varias noches aparece en cada una, con su parte en el total
  expenses.forEach((e) =>
    expenseDates(e).forEach((date) => {
      const d = day(date);
      d.expenses.push(e);
      d.totalUsd += expenseShareUsd(e);
    })
  );
  withdrawals.forEach((w) => day(w.date).withdrawals.push(w));
  return Array.from(days.values()).sort((a, b) => a.date.localeCompare(b.date));
}
