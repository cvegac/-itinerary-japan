"use client";

import { WEEK_COLORS_HEX, computeCostSummary } from "@/lib/itinerary-utils";
import type { DayEntry } from "@/types/DayEntry";

type Props = {
  itinerary: DayEntry[];
  startDate: string;
  onDaySelect: (day: DayEntry) => void;
};

function shortDate(date: string): string {
  return new Date(date + "T12:00:00").toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
}

export default function CostSummaryView({ itinerary, startDate, onDaySelect }: Props) {
  const summary = computeCostSummary(itinerary, startDate);
  const max = Math.max(...summary.weeks.flatMap((w) => w.days.map((d) => d.cost)), 1);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-4">
      <header>
        <h2 className="text-2xl font-bold">Presupuesto</h2>
        <p className="text-sm text-muted">
          ~<span className="font-bold text-fg tabular-nums">${summary.total}</span> USD por persona · comida y
          entradas incluidas · tocá un día para verlo
        </p>
      </header>

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
                    <span className="w-12 shrink-0 text-right font-semibold tabular-nums">{d.budget}</span>
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
