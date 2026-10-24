"use client";

import { useState } from "react";
import { Download, Plus } from "lucide-react";
import { WEEK_COLORS_HEX, computeCostSummary } from "@/lib/itinerary-utils";
import { cashBalance, dailySummary, spentByDate, type Expense, type Withdrawal } from "@/lib/expenses";
import { formatMoney } from "@/lib/money";
import { downloadCsv, expensesCsv } from "@/lib/csv";
import { localISODate } from "@/lib/trip-time";
import type { DayEntry } from "@/types/DayEntry";
import ExpenseModal from "@/components/ExpenseModal";
import { ExpenseRow, WithdrawalRow } from "@/components/ExpenseRows";
import Segmented from "@/components/Segmented";

type Props = {
  /** Para el nombre del archivo exportado */
  slug: string;
  itinerary: DayEntry[];
  startDate: string;
  onDaySelect: (day: DayEntry) => void;
  /** Día que propone el modal: hoy durante el viaje o el día elegido */
  defaultDate: string;
  expenses: Expense[];
  withdrawals: Withdrawal[];
  onAddExpense: (expense: Omit<Expense, "id" | "createdAt">) => void;
  onAddWithdrawal: (withdrawal: Omit<Withdrawal, "id" | "createdAt">) => void;
  onRemoveExpense: (id: string) => void;
  onRemoveWithdrawal: (id: string) => void;
  onUpdateExpense: (id: string, expense: Omit<Expense, "id" | "createdAt">) => void;
  onUpdateWithdrawal: (id: string, withdrawal: Omit<Withdrawal, "id" | "createdAt">) => void;
};

/** Qué abre el modal: registrar algo nuevo o editar lo ya cargado */
type Editing = { kind: "expense"; record: Expense } | { kind: "withdrawal"; record: Withdrawal };
type ModalState = { editing?: Editing } | null;

function shortDate(date: string): string {
  return new Date(date + "T12:00:00").toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
}

const budgetUsd = (day?: DayEntry) => (day ? Number(day.budget.replace(/[^\d]/g, "")) : 0);
const usd = (amount: number) => `US$${Math.round(amount).toLocaleString("en-US")}`;

export default function CostSummaryView(props: Props) {
  const { itinerary, expenses, withdrawals, defaultDate } = props;
  const [tab, setTab] = useState<"daily" | "budget">("daily");
  const [modal, setModal] = useState<ModalState>(null);
  const editing = modal?.editing;

  const spent = spentByDate(expenses);
  const spentTotal = Object.values(spent).reduce((sum, v) => sum + v, 0);
  // Presupuesto de los días con gastos cargados, para comparar parejo
  const budgetOfSpentDays = itinerary.filter((d) => spent[d.date]).reduce((sum, d) => sum + budgetUsd(d), 0);
  const cash = cashBalance(expenses, withdrawals);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-4">
      <header className="flex flex-col gap-3">
        <h2 className="text-2xl font-bold">Costos y gastos</h2>

        <div className="grid grid-cols-2 gap-2.5">
          <div aria-label="Gastado" className="rounded-2xl border border-line bg-surface p-3.5">
            <div className="text-xs font-semibold text-muted">Gastado</div>
            <div
              className={`text-xl font-bold tabular-nums ${
                spentTotal > budgetOfSpentDays ? "text-red-700" : spentTotal > 0 ? "text-emerald-700" : ""
              }`}
            >
              ≈{usd(spentTotal)}
            </div>
            <div className="text-xs text-muted">
              {spentTotal > 0 ? `de ${usd(budgetOfSpentDays)} presupuestados en esos días` : "Nada registrado todavía"}
            </div>
          </div>
          <div aria-label="Efectivo" className="rounded-2xl border border-line bg-surface p-3.5">
            <div className="text-xs font-semibold text-muted">Efectivo</div>
            <div className={`text-xl font-bold tabular-nums ${cash.balance < 0 ? "text-red-700" : ""}`}>
              {formatMoney(cash.balance, "JPY")}
            </div>
            <div className="text-xs text-muted">
              retiraste {formatMoney(cash.withdrawn, "JPY")} · pagaste {formatMoney(cash.spentCash, "JPY")} en efectivo
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {/* Uno solo: en el modal se elige si es un gasto o un retiro del cajero */}
          <button
            type="button"
            onClick={() => setModal({})}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg"
          >
            <Plus className="size-4" aria-hidden />
            Registrar
          </button>
          {(expenses.length > 0 || withdrawals.length > 0) && (
            <button
              type="button"
              onClick={() =>
                downloadCsv(`gastos-${props.slug}-${localISODate(new Date())}.csv`, expensesCsv(expenses, withdrawals))
              }
              className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-4 py-2.5 text-sm font-semibold"
            >
              <Download className="size-4" aria-hidden />
              Exportar CSV
            </button>
          )}
        </div>

        <Segmented
          name="Vista"
          value={tab}
          onChange={setTab}
          options={[
            { value: "daily", label: "Resumen diario" },
            { value: "budget", label: "Presupuesto" },
          ]}
        />
      </header>

      {tab === "daily" ? (
        <DailySummary {...props} onEdit={(e) => setModal({ editing: e })} />
      ) : (
        <BudgetWeeks {...props} spent={spent} />
      )}

      {modal && (
        <ExpenseModal
          dates={itinerary.map((d) => ({ date: d.date, label: `${shortDate(d.date)} · ${d.label}` }))}
          defaultDate={defaultDate}
          editing={editing}
          onClose={() => setModal(null)}
          onSaveExpense={editing ? (e) => props.onUpdateExpense(editing.record.id, e) : props.onAddExpense}
          onSaveWithdrawal={editing ? (w) => props.onUpdateWithdrawal(editing.record.id, w) : props.onAddWithdrawal}
        />
      )}
    </div>
  );
}

/** Lo registrado en la nube o el dispositivo, día por día */
function DailySummary({
  itinerary,
  expenses,
  withdrawals,
  onRemoveExpense,
  onRemoveWithdrawal,
  onDaySelect,
  onEdit,
}: Props & { onEdit: (editing: Editing) => void }) {
  const days = dailySummary(expenses, withdrawals);
  if (days.length === 0) {
    return (
      <p className="rounded-2xl bg-surface-2 p-4 text-sm text-muted">
        Todavía no registraste gastos ni retiros. Tocá Registrar, o cargalos desde cada día.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {days.map((d) => {
        const day = itinerary.find((it) => it.date === d.date);
        const budget = budgetUsd(day);
        return (
          <section
            key={d.date}
            aria-label={`${shortDate(d.date)}${day ? `: ${day.label}` : ""}`}
            className="rounded-2xl border border-line bg-surface"
          >
            <button
              type="button"
              onClick={() => day && onDaySelect(day)}
              className="flex w-full items-baseline justify-between gap-3 border-b border-line px-4 py-2.5 text-left"
            >
              <span className="min-w-0">
                <span className="block text-sm font-bold capitalize">{shortDate(d.date)}</span>
                {day && <span className="block truncate text-xs text-muted">{day.label}</span>}
              </span>
              {d.expenses.length > 0 && (
                <span
                  className={`shrink-0 text-sm font-bold tabular-nums ${
                    d.totalUsd > budget ? "text-red-700" : "text-emerald-700"
                  }`}
                >
                  ≈{usd(d.totalUsd)} <span className="font-normal text-muted">de {usd(budget)}</span>
                </span>
              )}
            </button>
            <ul className="flex flex-col px-3 py-1.5">
              {d.expenses.map((e) => (
                <ExpenseRow
                  key={e.id}
                  expense={e}
                  onEdit={() => onEdit({ kind: "expense", record: e })}
                  onRemove={() => onRemoveExpense(e.id)}
                />
              ))}
              {d.withdrawals.map((w) => (
                <WithdrawalRow
                  key={w.id}
                  withdrawal={w}
                  onEdit={() => onEdit({ kind: "withdrawal", record: w })}
                  onRemove={() => onRemoveWithdrawal(w.id)}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/** El presupuesto por semana, con lo gastado de verdad al lado de cada día */
function BudgetWeeks({ itinerary, startDate, onDaySelect, spent }: Props & { spent: Record<string, number> }) {
  const summary = computeCostSummary(itinerary, startDate);
  const max = Math.max(...summary.weeks.flatMap((w) => w.days.map((d) => d.cost)), 1);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        ~<span className="font-bold text-fg tabular-nums">${summary.total}</span> USD por persona · hospedaje, transporte,
        comida y entradas · tocá un día para verlo
      </p>
      {summary.weeks.map((week) => {
        const color = WEEK_COLORS_HEX[(week.weekNum - 1) % WEEK_COLORS_HEX.length];
        return (
          <section key={week.weekNum} className="overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <span className="size-2.5 rounded-full" style={{ background: color }} />
                Semana {week.weekNum}
                <span className="font-normal text-muted">· desde el {week.label}</span>
              </h3>
              <span className="text-sm font-bold tabular-nums">${week.total}</span>
            </div>
            <ul>
              {week.days.map((d) => (
                <li key={d.date}>
                  <button
                    type="button"
                    onClick={() => {
                      const day = itinerary.find((it) => it.date === d.date);
                      if (day) onDaySelect(day);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors hover:bg-surface-2"
                  >
                    <span className="w-20 shrink-0 text-xs capitalize text-muted">{shortDate(d.date)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{d.label}</span>
                      <span className="mt-1 block h-1 rounded-full bg-surface-2">
                        <span
                          className="block h-1 rounded-full"
                          style={{ width: `${(d.cost / max) * 100}%`, background: color }}
                        />
                      </span>
                    </span>
                    <span className="w-16 shrink-0 text-right tabular-nums">
                      <span className="block font-semibold">{d.budget}</span>
                      {spent[d.date] !== undefined && (
                        <span
                          className={`block text-xs font-semibold ${
                            spent[d.date] > d.cost ? "text-red-700" : "text-emerald-700"
                          }`}
                        >
                          ≈{usd(spent[d.date])} real
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
