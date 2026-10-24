"use client";

import { Banknote, CreditCard, Landmark, Pencil, X } from "lucide-react";
import { categoryInfo, expenseDates, type Expense, type Withdrawal } from "@/lib/expenses";
import { formatMoney } from "@/lib/money";

// Filas de gastos y retiros (en el resumen de costos y en el día): tocar la fila
// la abre para editarla; la X la quita

/** date: el día que se está mostrando; un hospedaje de varias noches muestra la parte de esa noche */
export function ExpenseRow({
  expense: e,
  date,
  onEdit,
  onRemove,
}: {
  expense: Expense;
  date: string;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const name = e.note || formatMoney(e.amount, e.currency);
  const category = categoryInfo(e);
  // Un hospedaje de varias noches muestra la parte de esta noche
  const dates = expenseDates(e);
  return (
    <li className="flex items-center gap-1 text-sm">
      <button
        type="button"
        aria-label={`Editar gasto ${name}`}
        onClick={onEdit}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-lg py-1 text-left hover:bg-surface-2"
      >
        <span role="img" aria-label={category.label} title={category.label} className="w-5 shrink-0 text-center">
          {category.icon}
        </span>
        {e.method === "cash" ? (
          <Banknote className="size-4 shrink-0 text-emerald-600" aria-label="Pagado en efectivo" />
        ) : (
          <CreditCard className="size-4 shrink-0 text-sky-600" aria-label="Pagado con tarjeta" />
        )}
        <span
          title={[
            dates.length > 1 ? `Pagaste ${formatMoney(e.amount, e.currency)} por ${dates.length} noches` : "",
            e.currency === "USD"
              ? ""
              : e.perUsd
                ? `1 US$ = ${formatMoney(e.perUsd, e.currency, 2)} (${e.rateDate})`
                : "Cambio aproximado: se registró sin cotización",
          ]
            .filter(Boolean)
            .join(" · ") || undefined}
          className="w-24 shrink-0 font-semibold tabular-nums"
        >
          {formatMoney(e.amount / dates.length, e.currency)}
        </span>
        <span className="min-w-0 flex-1 truncate text-muted">
          {dates.length > 1 && (
            <span className="mr-1.5 rounded bg-surface-2 px-1 text-xs font-medium">{`noche ${dates.indexOf(date) + 1} de ${dates.length}`}</span>
          )}
          {e.note}
        </span>
        <Pencil className="size-3.5 shrink-0 text-muted" aria-hidden />
      </button>
      <RemoveButton label={`Quitar gasto ${name}`} onClick={onRemove} />
    </li>
  );
}

export function WithdrawalRow({
  withdrawal: w,
  onEdit,
  onRemove,
}: {
  withdrawal: Withdrawal;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const name = w.note || formatMoney(w.amountYen, "JPY");
  return (
    <li className="flex items-center gap-1 text-sm">
      <button
        type="button"
        aria-label={`Editar retiro ${name}`}
        onClick={onEdit}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-lg py-1 text-left hover:bg-surface-2"
      >
        <Landmark className="size-4 shrink-0 text-amber-600" aria-hidden />
        <span className="shrink-0 font-semibold tabular-nums">Retiro {formatMoney(w.amountYen, "JPY")}</span>
        <span className="min-w-0 flex-1 truncate text-muted">{w.note}</span>
        <Pencil className="size-3.5 shrink-0 text-muted" aria-hidden />
      </button>
      <RemoveButton label={`Quitar retiro ${name}`} onClick={onRemove} />
    </li>
  );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="rounded-lg p-1 text-muted hover:bg-surface-2">
      <X className="size-4" aria-hidden />
    </button>
  );
}
