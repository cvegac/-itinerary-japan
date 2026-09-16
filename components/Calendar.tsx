"use client";

import type { DayEntry } from "@/types/DayEntry";
import type { TripMonth } from "@/types/Trip";
import DayCell from "./DayCell";

type Props = {
  itinerary: DayEntry[];
  months: TripMonth[];
  selectedDate: string | null;
  onDaySelect: (day: DayEntry) => void;
};

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay();
}

export default function Calendar({ itinerary, months, selectedDate, onDaySelect }: Props) {
  const byDate = Object.fromEntries(itinerary.map((d) => [d.date, d]));

  return (
    <div className="flex flex-col gap-6 w-full max-w-full overflow-x-auto pb-4 hide-scrollbar">
      <div className="min-w-[550px] xl:min-w-0">
        {months.map(({ year, month, label }) => {
          const totalDays = getDaysInMonth(year, month);
          const firstDow = getFirstDayOfWeek(year, month);
          const rawCells: (DayEntry | null)[] = [
            ...Array(firstDow).fill(null),
            ...Array.from({ length: totalDays }, (_, i) => {
              const d = i + 1;
              const key = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
              return byDate[key] ?? null;
            }),
          ];

          let lastIndex = rawCells.length - 1;
          while (lastIndex >= 0 && rawCells[lastIndex] === null) {
            lastIndex--;
          }

          if (lastIndex < 0) return null; // Mes sin días de viaje

          const cells = rawCells.slice(0, lastIndex + 1);

          return (
            <div key={label} className="mb-6 last:mb-0">
              <h2 className="text-base font-bold text-gray-700 mb-2">{label}</h2>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEKDAYS.map((w) => (
                  <div
                    key={w}
                    className="text-center text-[10px] sm:text-xs font-semibold text-gray-400 py-1"
                  >
                    {w}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((day, i) =>
                  day ? (
                    <DayCell
                      key={day.date}
                      day={day}
                      isSelected={selectedDate === day.date}
                      onClick={() => onDaySelect(day)}
                    />
                  ) : (
                    <div key={`empty-${i}`} className="min-h-[72px] h-full" />
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
