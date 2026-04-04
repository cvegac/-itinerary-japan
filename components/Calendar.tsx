"use client";

import { ITINERARY } from "@/data/itinerary";
import type { DayEntry } from "@/types/DayEntry";
import DayCell from "./DayCell";

type Props = {
  selectedDate: string | null;
  onDaySelect: (day: DayEntry) => void;
};

const MONTHS = [
  { year: 2026, month: 11, label: "Noviembre 2026" },
  { year: 2026, month: 12, label: "Diciembre 2026" },
];

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay();
}

export default function Calendar({ selectedDate, onDaySelect }: Props) {
  const byDate = Object.fromEntries(ITINERARY.map((d) => [d.date, d]));

  return (
    <div className="flex flex-col gap-6">
      {MONTHS.map(({ year, month, label }) => {
        const totalDays = getDaysInMonth(year, month);
        const firstDow = getFirstDayOfWeek(year, month);
        const cells: (DayEntry | null)[] = [
          ...Array(firstDow).fill(null),
          ...Array.from({ length: totalDays }, (_, i) => {
            const d = i + 1;
            const key = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            return byDate[key] ?? null;
          }),
        ];

        return (
          <div key={label}>
            <h2 className="text-base font-bold text-gray-700 mb-2">{label}</h2>
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {WEEKDAYS.map((w) => (
                <div
                  key={w}
                  className="text-center text-[10px] font-semibold text-gray-400 py-1"
                >
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((day, i) =>
                day ? (
                  <DayCell
                    key={day.date}
                    day={day}
                    isSelected={selectedDate === day.date}
                    onClick={() => onDaySelect(day)}
                  />
                ) : (
                  <div key={`empty-${i}`} className="h-[72px]" />
                )
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
