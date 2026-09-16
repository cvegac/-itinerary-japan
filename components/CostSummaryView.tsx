"use client";

import { computeCostSummary } from "@/lib/itinerary-utils";
import type { DayEntry } from "@/types/DayEntry";

type Props = {
  itinerary: DayEntry[];
  startDate: string;
  onDaySelect: (day: DayEntry) => void;
  onClose: () => void;
};

export default function CostSummaryView({ itinerary, startDate, onDaySelect, onClose }: Props) {
  const costSummary = computeCostSummary(itinerary, startDate);

  return (
    <div className="flex-1 bg-gray-50 overflow-y-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-emerald-900 flex items-center gap-2">
            💰 Detalle de Presupuesto Diario (~${costSummary.total} USD)
          </h2>
          <button
            onClick={onClose}
            className="bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
          >
            Volver al itinerario
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
          {costSummary.weeks.map((week) => (
            <div key={week.weekNum} className="bg-white rounded-lg border border-emerald-100 overflow-hidden shadow-sm flex flex-col">
              <div className="bg-emerald-100/50 px-3 py-2 text-emerald-800 font-bold flex justify-between items-center text-sm">
                <span>Semana {week.weekNum} ({week.label})</span>
                <span className="bg-emerald-200/50 px-2.5 py-0.5 rounded-full">${week.total}</span>
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="text-gray-400 font-medium border-b border-gray-100 bg-gray-50/50">
                      <th className="text-left font-normal py-1.5 px-3">Día</th>
                      <th className="text-left font-normal py-1.5 pr-3">Actividad</th>
                      <th className="text-right font-normal py-1.5 pr-3">Costo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {week.days.map((d, i) => (
                      <tr
                        key={i}
                        className="border-b last:border-b-0 border-gray-50 text-gray-700 hover:bg-emerald-50 cursor-pointer transition-colors"
                        onClick={() => {
                          const found = itinerary.find((it) => it.date === d.date);
                          if (found) onDaySelect(found);
                        }}
                      >
                        <td className="py-1.5 px-3 whitespace-nowrap text-gray-500">
                          {new Date(d.date + "T12:00:00").toLocaleDateString("es-AR", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}
                        </td>
                        <td className="py-1.5 pr-3 font-medium truncate max-w-[120px] sm:max-w-[150px]" title={d.label}>
                          {d.label}
                        </td>
                        <td className="py-1.5 pr-3 text-right font-bold text-emerald-600">{d.budget}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-sm text-emerald-700 font-medium bg-emerald-100/50 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-center border border-emerald-200 gap-2">
          <span>💡 Podés hacer clic en cualquier día para saltar a él en el itinerario principal.</span>
          <span className="font-bold text-emerald-800 bg-white px-3 py-1 rounded-full shadow-sm shadow-emerald-200 text-base">
            Total acumulado: ${costSummary.total}
          </span>
        </div>
      </div>
    </div>
  );
}
