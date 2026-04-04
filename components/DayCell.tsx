"use client";

import type { DayEntry } from "@/types/DayEntry";

const CATEGORY_COLORS: Record<string, string> = {
  Naturaleza: "bg-emerald-100 hover:bg-emerald-200 border-emerald-300 text-emerald-900",
  Logística: "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700",
  Ciudad: "bg-orange-100 hover:bg-orange-200 border-orange-300 text-orange-900",
  Paisaje: "bg-sky-100 hover:bg-sky-200 border-sky-300 text-sky-900",
  Vistas: "bg-violet-100 hover:bg-violet-200 border-violet-300 text-violet-900",
  Compras: "bg-pink-100 hover:bg-pink-200 border-pink-300 text-pink-900",
  Libre: "bg-yellow-100 hover:bg-yellow-200 border-yellow-300 text-yellow-900",
};

const CATEGORY_DOT: Record<string, string> = {
  Naturaleza: "bg-emerald-500",
  Logística: "bg-slate-400",
  Ciudad: "bg-orange-500",
  Paisaje: "bg-sky-500",
  Vistas: "bg-violet-500",
  Compras: "bg-pink-500",
  Libre: "bg-yellow-500",
};

type Props = {
  day: DayEntry;
  isSelected: boolean;
  onClick: () => void;
};

export default function DayCell({ day, isSelected, onClick }: Props) {
  const date = new Date(day.date + "T12:00:00");
  const dayNum = date.getDate();

  const colorClass =
    CATEGORY_COLORS[day.category] ??
    "bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-700";

  const dotColor = CATEGORY_DOT[day.category] ?? "bg-gray-400";

  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col items-start justify-between
        w-full h-[72px] p-1.5 rounded-lg border text-left
        transition-all duration-150 cursor-pointer
        ${colorClass}
        ${isSelected ? "ring-2 ring-offset-1 ring-red-500 shadow-md scale-[1.03]" : ""}
      `}
    >
      <div className="flex items-center justify-between w-full">
        <span className="text-sm font-bold leading-none">{dayNum}</span>
        <div className="flex gap-0.5">
          {day.nightBus && (
            <span className="text-[9px] bg-orange-400 text-orange-900 rounded px-1 py-0.5 font-semibold leading-none">
              🚌
            </span>
          )}
          {day.isTransit && (
            <span className="text-[9px] bg-amber-400 text-amber-900 rounded px-1 py-0.5 font-semibold leading-none">
              🚄
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 w-full overflow-hidden">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
        <span className="text-[10px] leading-tight truncate opacity-80">
          {day.label}
        </span>
      </div>
    </button>
  );
}
