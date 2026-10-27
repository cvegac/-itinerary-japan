"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, Search, X } from "lucide-react";
import type { DayEntry } from "@/types/DayEntry";
import { searchItinerary } from "@/lib/search";
import type { SharedNote } from "@/lib/shared-notes";

type Props = {
  itinerary: DayEntry[];
  /** Notas del viaje compartido: también se busca en ellas */
  notes?: SharedNote[];
  onSelect: (day: DayEntry) => void;
  onClose: () => void;
};

function shortDate(date: string): string {
  return new Date(date + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

/** Busca en todos los días: en qué día está algo, o que no está */
export default function SearchModal({ itinerary, notes, onSelect, onClose }: Props) {
  const [query, setQuery] = useState("");
  const hits = useMemo(() => searchItinerary(itinerary, query, notes), [itinerary, query, notes]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Directo en el body, como ExpenseModal: si no, la barra de navegación queda encima
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 sm:pt-16" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Buscar en el viaje"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-dvh w-full max-w-lg flex-col bg-surface shadow-2xl sm:max-h-[80dvh] sm:rounded-3xl"
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-line px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
          <Search className="size-5 shrink-0 text-muted" aria-hidden />
          <input
            type="search"
            autoFocus
            aria-label="Qué buscás"
            placeholder="Un lugar, una actividad, un tren…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-0 flex-1 bg-transparent py-1.5 text-base outline-none"
          />
          <button type="button" aria-label="Cerrar" onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-surface-2">
            <X className="size-5" />
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {query.trim() && hits.length === 0 && (
            <p className="rounded-2xl bg-surface-2 p-3.5 text-sm text-muted">&ldquo;{query.trim()}&rdquo; no está en el itinerario</p>
          )}
          {hits.length > 0 && (
            <>
              <p className="mb-2 px-1 text-xs font-semibold text-muted">
                {hits.length === 1 ? "Está en 1 día" : `Está en ${hits.length} días`}
              </p>
              <ul aria-label="Resultados" className="flex flex-col gap-2">
                {hits.map(({ day, matches }) => (
                  <li key={day.date}>
                    <button
                      type="button"
                      onClick={() => onSelect(day)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-line p-3 text-left transition-colors hover:bg-surface-2"
                    >
                      <span className="w-12 shrink-0 text-center">
                        <span className="block text-xs text-muted">{day.weekday}</span>
                        <span className="block text-sm font-bold">{shortDate(day.date)}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">{day.label}</span>
                        {matches.map((m, i) => (
                          <span key={i} className="mt-0.5 block truncate text-xs text-muted">
                            <span className="font-semibold">{m.field}:</span> {m.text}
                          </span>
                        ))}
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
