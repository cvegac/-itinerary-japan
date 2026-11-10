"use client";

import { useEffect, useRef } from "react";
import type { DayEntry } from "@/types/DayEntry";
import { WEEK_COLORS_HEX } from "@/lib/itinerary-utils";
import { weekColor } from "@/lib/map-geo";
import { categoryStyle } from "@/lib/categories";

type Props = {
  itinerary: DayEntry[];
  startDate: string;
  selectedDate: string | null;
  /** El día de hoy (durante el viaje) se pinta de otro color */
  todayDate?: string | null;
  onSelect: (day: DayEntry) => void;
};

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** Tira horizontal de días: se desliza con el dedo y centra el día elegido */
export default function DayStrip({ itinerary, startDate, selectedDate, todayDate = null, onSelect }: Props) {
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView?.({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [selectedDate]);

  return (
    // touch-pan-x: con scroll propio, Chrome dejaría pasar el gesto vertical al
    // navegador (tirar para recargar) en vez de a la hoja que la contiene
    <div className="no-scrollbar flex touch-pan-x gap-1.5 overflow-x-auto px-4 py-1 snap-x">
      {itinerary.map((day, i) => {
        const selected = day.date === selectedDate;
        const today = day.date === todayDate;
        const [, month, dayOfMonth] = day.date.split("-").map(Number);
        const showMonth = i === 0 || dayOfMonth === 1;
        return (
          <button
            key={day.date}
            ref={selected ? selectedRef : undefined}
            type="button"
            onClick={() => onSelect(day)}
            aria-current={selected ? "date" : undefined}
            aria-label={`Día ${i + 1}${today ? " (hoy)" : ""}, ${day.weekday} ${dayOfMonth} ${MONTHS[month - 1]}: ${day.label}`}
            className={`relative snap-center shrink-0 w-12 rounded-xl pt-2 pb-1.5 flex flex-col items-center transition-colors ${
              selected
                ? today
                  ? "bg-sky-600 text-white shadow-md"
                  : "bg-fg text-bg shadow-md"
                : today
                  ? "bg-sky-100 text-sky-900 ring-1 ring-sky-300 hover:bg-sky-200"
                  : "bg-surface-2 text-fg hover:bg-line"
            }`}
          >
            <span
              className="absolute top-0 inset-x-2 h-0.5 rounded-full"
              style={{ background: weekColor(day.date, startDate, WEEK_COLORS_HEX) }}
            />
            <span className={`text-[10px] font-medium uppercase ${selected ? "opacity-80" : today ? "text-sky-700" : "text-muted"}`}>
              {showMonth ? MONTHS[month - 1] : day.weekday}
            </span>
            <span className="text-lg font-bold leading-tight tabular-nums">{dayOfMonth}</span>
            <span className={`mt-0.5 w-1.5 h-1.5 rounded-full ${categoryStyle(day.category).dot}`} />
          </button>
        );
      })}
    </div>
  );
}
