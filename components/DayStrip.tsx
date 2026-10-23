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
  onSelect: (day: DayEntry) => void;
};

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** Tira horizontal de días: se desliza con el dedo y centra el día elegido */
export default function DayStrip({ itinerary, startDate, selectedDate, onSelect }: Props) {
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView?.({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [selectedDate]);

  return (
    <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 py-1 snap-x">
      {itinerary.map((day, i) => {
        const selected = day.date === selectedDate;
        const [, month, dayOfMonth] = day.date.split("-").map(Number);
        const showMonth = i === 0 || dayOfMonth === 1;
        return (
          <button
            key={day.date}
            ref={selected ? selectedRef : undefined}
            type="button"
            onClick={() => onSelect(day)}
            aria-current={selected ? "date" : undefined}
            aria-label={`Día ${i + 1}, ${day.weekday} ${dayOfMonth} ${MONTHS[month - 1]}: ${day.label}`}
            className={`relative snap-center shrink-0 w-12 rounded-xl pt-2 pb-1.5 flex flex-col items-center transition-colors ${
              selected ? "bg-fg text-bg shadow-md" : "bg-surface-2 text-fg hover:bg-line"
            }`}
          >
            <span
              className="absolute top-0 inset-x-2 h-0.5 rounded-full"
              style={{ background: weekColor(day.date, startDate, WEEK_COLORS_HEX) }}
            />
            <span className={`text-[10px] font-medium uppercase ${selected ? "opacity-80" : "text-muted"}`}>
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
