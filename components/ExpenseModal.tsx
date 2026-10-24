"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { EXPENSE_CATEGORIES, expenseCategory, type Expense, type ExpenseCategory, type PaymentMethod, type Withdrawal } from "@/lib/expenses";
import { CURRENCIES, formatMoney, toUsd, type Currency } from "@/lib/money";
import { rememberRates, useRates } from "@/lib/rates";
import Segmented from "@/components/Segmented";

type Kind = "expense" | "withdrawal";

type Props = {
  /** Días que se pueden elegir (los del viaje, o solo uno) */
  dates: { date: string; label: string }[];
  defaultDate: string;
  initialKind?: Kind;
  /** Registro a editar: abre con sus datos y sin poder pasar de gasto a retiro */
  editing?: { kind: "expense"; record: Expense } | { kind: "withdrawal"; record: Withdrawal };
  onClose: () => void;
  onSaveExpense: (expense: Omit<Expense, "id" | "createdAt">) => void;
  onSaveWithdrawal: (withdrawal: Omit<Withdrawal, "id" | "createdAt">) => void;
};

/** Modal para registrar o editar un gasto (con su tipo, su moneda y cómo se pagó) o un retiro de efectivo */
export default function ExpenseModal({
  dates,
  defaultDate,
  initialKind = "expense",
  editing,
  onClose,
  onSaveExpense,
  onSaveWithdrawal,
}: Props) {
  const savedExpense = editing?.kind === "expense" ? editing.record : undefined;
  const [kind, setKind] = useState<Kind>(editing?.kind ?? initialKind);
  const [date, setDate] = useState(editing?.record.date ?? defaultDate);
  const [amount, setAmount] = useState(
    editing ? String(editing.kind === "expense" ? editing.record.amount : editing.record.amountYen) : ""
  );
  const [currency, setCurrency] = useState<Currency>(savedExpense?.currency ?? "JPY");
  const [method, setMethod] = useState<PaymentMethod>(savedExpense?.method ?? "cash");
  const [category, setCategory] = useState<ExpenseCategory>(savedExpense ? expenseCategory(savedExpense) : "comida");
  const [note, setNote] = useState(editing?.record.note ?? "");

  const isExpense = kind === "expense";
  // Decimales solo en dólares; en yenes y pesos, solo dígitos
  const value = Number(
    isExpense && currency === "USD" ? amount.replace(",", ".").replace(/[^\d.]/g, "") : amount.replace(/[^\d]/g, "")
  );
  const title = `${editing ? "Editar" : "Registrar"} ${isExpense ? "gasto" : "retiro"}`;

  // Cotización del momento (o la última conocida); se guarda con el gasto. Al
  // editar sin cambiar la moneda queda la del día en que se registró
  const { rates, source } = useRates();
  const keepRate = !!savedExpense && savedExpense.currency === currency;
  const keptRate = keepRate && savedExpense.perUsd ? { perUsd: savedExpense.perUsd, rateDate: savedExpense.rateDate } : null;
  const perUsd = currency === "USD" ? 1 : keepRate ? (keptRate?.perUsd ?? null) : (rates?.perUsd[currency] ?? null);
  const usdValue = perUsd ? value / perUsd : toUsd(value, currency);
  const rateNote = keepRate
    ? keptRate?.rateDate
      ? `cambio del ${shortDate(keptRate.rateDate)}, cuando lo registraste`
      : "cambio aproximado (se registró sin cotización)"
    : source === "live"
      ? `cambio del ${shortDate(rates!.date)}`
      : source === "cached"
        ? `última conocida (${shortDate(rates!.date)}), sin conexión`
        : "cambio aproximado, sin conexión";

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!value) return;
    if (isExpense) {
      const withRate = keepRate
        ? (keptRate ?? {})
        : rates && currency !== "USD"
          ? { perUsd: rates.perUsd[currency], rateDate: rates.date }
          : {};
      onSaveExpense({ date, amount: value, currency, method, category, note: note.trim(), ...withRate });
      // La del momento queda como "última conocida" para registrar sin conexión
      if (!keepRate && source === "live" && rates) rememberRates(rates);
    }
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

        {!editing && (
          <Segmented
            name="tipo"
            value={kind}
            onChange={setKind}
            options={[
              { value: "expense", label: "Gasto" },
              { value: "withdrawal", label: "Retiro" },
            ]}
          />
        )}

        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <label htmlFor="monto" className={label}>
              {isExpense ? "Monto" : "Monto (¥)"}
            </label>
            <input
              id="monto"
              aria-label="Monto"
              inputMode="decimal"
              autoFocus={!editing}
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

        {isExpense && currency !== "USD" && (
          <p className="-mt-2 text-xs text-muted">
            1 US$ = {formatMoney(perUsd ?? 1 / toUsd(1, currency), currency, 2)} · {rateNote}
            {value > 0 && <span className="font-semibold text-fg"> · ≈ US${usdValue.toFixed(2)}</span>}
          </p>
        )}

        {isExpense && (
          <div>
            <label htmlFor="categoria" className={label}>
              Tipo de gasto
            </label>
            <select
              id="categoria"
              aria-label="Tipo de gasto"
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className={field}
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.icon} {c.label}
                </option>
              ))}
            </select>
          </div>
        )}

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

function shortDate(date: string): string {
  return new Date(date + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}
