"use client";

import { Banknote, CreditCard, Landmark, Pencil, X } from "lucide-react";
import { categoryInfo, type Expense, type Withdrawal } from "@/lib/expenses";
import { formatMoney } from "@/lib/money";

// Filas de gastos y retiros (en el resumen de costos y en el día): tocar la fila
// la abre para editarla; la X la quita

export function ExpenseRow({ expense: e, onEdit, onRemove }: { expense: Expense; onEdit: () => void; onRemove: () => void }) {
  const name = e.note || formatMoney(e.amount, e.currency);
  const category = categoryInfo(e);
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
          title={
            e.currency === "USD"
              ? undefined
              : e.perUsd
                ? `1 US$ = ${formatMoney(e.perUsd, e.currency, 2)} (${e.rateDate})`
                : "Cambio aproximado: se registró sin cotización"
          }
          className="w-24 shrink-0 font-semibold tabular-nums"
        >
          {formatMoney(e.amount, e.currency)}
        </span>
        <span className="min-w-0 flex-1 truncate text-muted">{e.note}</span>
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
