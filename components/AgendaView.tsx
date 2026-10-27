"use client";

import { useEffect, useRef } from "react";
import { ChevronDown, MessageSquare } from "lucide-react";
import type { DayEntry } from "@/types/DayEntry";
import { dayNotes, type SharedNote } from "@/lib/shared-notes";

type Props = {
  itinerary: DayEntry[];
  /** Día abierto (con todo su detalle); null: todos cerrados */
  openDate: string | null;
  onToggle: (day: DayEntry) => void;
  renderDetail: (day: DayEntry) => React.ReactNode;
  notes: SharedNote[];
  unseen: SharedNote[];
  names: Record<string, string>;
  me: string | null;
};

function shortDate(date: string): string {
  return new Date(date + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

/** El itinerario como agenda: día por día, con sus notas a la vista */
export default function AgendaView({ itinerary, openDate, onToggle, renderDetail, notes, unseen, names, me }: Props) {
  const rows = useRef(new Map<string, HTMLLIElement>());

  // El día abierto queda arriba de todo (al entrar y al abrir otro)
  useEffect(() => {
    if (openDate) rows.current.get(openDate)?.scrollIntoView?.({ block: "start" });
  }, [openDate]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-4">
      <header>
        <h2 className="text-2xl font-bold">Agenda</h2>
        <p className="text-sm text-muted">Tocá un día para ver todo, con las notas de los dos</p>
      </header>

      <ul aria-label="Días del viaje" className="flex flex-col gap-2">
        {itinerary.map((day, i) => {
          const open = day.date === openDate;
          const own = dayNotes(notes, day.date);
          const fresh = unseen.filter((n) => n.day === day.date).length;
          return (
            <li
              key={day.date}
              ref={(el) => {
                if (el) rows.current.set(day.date, el);
                else rows.current.delete(day.date);
              }}
              className={`scroll-mt-4 overflow-hidden rounded-2xl border bg-surface ${open ? "border-accent/40" : "border-line"}`}
            >
              <button
                type="button"
                aria-expanded={open}
                onClick={() => onToggle(day)}
                className="flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-surface-2"
              >
                <span className="w-12 shrink-0 text-center">
                  <span className="block text-xs text-muted">{day.weekday}</span>
                  <span className="block text-sm font-bold">{shortDate(day.date)}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-muted">
                    Día {i + 1} · {day.location}
                  </span>
                  <span className="block text-sm font-semibold leading-snug">{day.label}</span>
                  {own.length > 0 && (
                    <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="inline-flex items-center gap-1 text-muted">
                        <MessageSquare className="size-3.5" aria-hidden />
                        {own.length === 1 ? "1 nota" : `${own.length} notas`}
                      </span>
                      {fresh > 0 && (
                        <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-fg">
                          {fresh === 1 ? "1 nueva" : `${fresh} nuevas`}
                        </span>
                      )}
                    </span>
                  )}
                  {/* El comienzo de cada nota, en orden: una nueva no tapa las anteriores */}
                  {!open &&
                    own.map((n) => (
                      <span key={n.id} data-testid="note-preview" className="mt-0.5 block truncate text-xs text-muted">
                        <span className="font-semibold text-fg">
                          {n.author === me ? "Vos" : (names[n.author] ?? "Alguien")}
                          {n.place && ` · ${n.place}`}
                        </span>
                        : {n.text}
                      </span>
                    ))}
                </span>
                <ChevronDown className={`mt-1 size-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
              </button>
              {open && <div className="border-t border-line px-4 pt-4">{renderDetail(day)}</div>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
