"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { Expense, PaymentMethod, Withdrawal } from "@/lib/expenses";
import { CURRENCIES, type Currency } from "@/lib/money";
import Segmented from "@/components/Segmented";

type Kind = "expense" | "withdrawal";

type Props = {
  /** Días que se pueden elegir (los del viaje, o solo uno) */
  dates: { date: string; label: string }[];
  defaultDate: string;
  initialKind?: Kind;
  onClose: () => void;
  onSaveExpense: (expense: Omit<Expense, "id" | "createdAt">) => void;
  onSaveWithdrawal: (withdrawal: Omit<Withdrawal, "id" | "createdAt">) => void;
};

/** Modal para registrar un gasto (con su moneda y cómo se pagó) o un retiro de efectivo */
export default function ExpenseModal({
  dates,
  defaultDate,
  initialKind = "expense",
  onClose,
  onSaveExpense,
  onSaveWithdrawal,
}: Props) {
  const [kind, setKind] = useState<Kind>(initialKind);
  const [date, setDate] = useState(defaultDate);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("JPY");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [note, setNote] = useState("");

  const isExpense = kind === "expense";
  // Decimales solo en dólares; en yenes y pesos, solo dígitos
  const value = Number(
    isExpense && currency === "USD" ? amount.replace(",", ".").replace(/[^\d.]/g, "") : amount.replace(/[^\d]/g, "")
  );
  const title = isExpense ? "Registrar gasto" : "Registrar retiro";

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!value) return;
    if (isExpense) onSaveExpense({ date, amount: value, currency, method, note: note.trim() });
    else onSaveWithdrawal({ date, amountYen: value, note: note.trim() });
    onClose();
  }

  const field = "w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm";
  const label = "mb-1 block text-xs font-semibold text-muted";

  // Directo en el body: dentro de la vista o de la hoja del día (que tienen su
  // propio z-index), la barra de navegación quedaba encima del botón Guardar
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90dvh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-3xl bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" aria-label="Cerrar" onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-surface-2">
            <X className="size-5" />
          </button>
        </div>

        <Segmented
          name="tipo"
          value={kind}
          onChange={setKind}
          options={[
            { value: "expense", label: "Gasto" },
            { value: "withdrawal", label: "Retiro" },
          ]}
        />

        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <label htmlFor="monto" className={label}>
              {isExpense ? "Monto" : "Monto (¥)"}
            </label>
            <input
              id="monto"
              aria-label="Monto"
              inputMode="decimal"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`${field} tabular-nums`}
            />
          </div>
          {isExpense && (
            <div className="w-36 shrink-0">
              <label htmlFor="moneda" className={label}>
                Moneda
              </label>
              <select
                id="moneda"
                aria-label="Moneda"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className={field}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {isExpense && (
          <div>
            <span className={label}>Cómo pagaste</span>
            <Segmented
              name="pago"
              value={method}
              onChange={setMethod}
              options={[
                { value: "cash", label: "Efectivo" },
                { value: "card", label: "Tarjeta" },
              ]}
            />
          </div>
        )}

        <div>
          <label htmlFor="dia" className={label}>
            Día
          </label>
          <select id="dia" aria-label="Día" value={date} onChange={(e) => setDate(e.target.value)} className={field}>
            {dates.map((d) => (
              <option key={d.date} value={d.date}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="nota" className={label}>
            En qué {isExpense ? "" : "(cajero, comisión…)"}
          </label>
          <input
            id="nota"
            aria-label="En qué"
            placeholder="Opcional"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={field}
          />
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm font-semibold text-muted hover:bg-surface-2">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!value}
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-fg disabled:opacity-40"
          >
            Guardar
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
