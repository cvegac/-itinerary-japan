"use client";

import { computeLodgingSummary } from "@/lib/itinerary-utils";
import type { DayEntry } from "@/types/DayEntry";

type Props = {
  itinerary: DayEntry[];
  onDaySelect: (day: DayEntry) => void;
  onClose: () => void;
};

function formatDate(date: string): string {
  return new Date(date + "T12:00:00").toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function LodgingSummaryView({ itinerary, onDaySelect, onClose }: Props) {
  const stays = computeLodgingSummary(itinerary);
  const totalNights = stays.reduce((sum, s) => sum + s.nights, 0);

  return (
    <div className="flex-1 bg-gray-50 overflow-y-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <h2 className="text-2xl font-bold text-indigo-900 flex items-center gap-2">
            🏨 Resumen de Hospedaje ({stays.length} lugares · {totalNights} noches)
          </h2>
          <button
            onClick={onClose}
            className="bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
          >
            Volver al itinerario
          </button>
        </div>

        <div className="bg-white rounded-lg border border-indigo-100 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="text-sm w-full">
              <thead>
                <tr className="text-indigo-800 font-semibold border-b border-indigo-100 bg-indigo-50/60">
                  <th className="text-left py-2 px-3 whitespace-nowrap">Fecha inicio</th>
                  <th className="text-left py-2 pr-3 whitespace-nowrap">Fecha fin</th>
                  <th className="text-center py-2 pr-3">Noches</th>
                  <th className="text-left py-2 pr-3">Lugar</th>
                  <th className="text-left py-2 pr-3">Recomendación</th>
                </tr>
              </thead>
              <tbody>
                {stays.map((s) => (
                  <tr
                    key={s.checkIn}
                    className="border-b last:border-b-0 border-gray-100 text-gray-700 hover:bg-indigo-50 cursor-pointer transition-colors"
                    onClick={() => {
                      const found = itinerary.find((it) => it.date === s.checkIn);
                      if (found) onDaySelect(found);
                    }}
                  >
                    <td className="py-2 px-3 whitespace-nowrap text-gray-500">{formatDate(s.checkIn)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap text-gray-500">{formatDate(s.checkOut)}</td>
                    <td className="py-2 pr-3 text-center font-bold text-indigo-600">{s.nights}</td>
                    <td className="py-2 pr-3 font-medium min-w-[160px]">{s.place}</td>
                    <td className="py-2 pr-3 min-w-[200px]">{s.recommendation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 text-sm text-indigo-700 font-medium bg-indigo-100/50 p-4 rounded-lg border border-indigo-200">
          💡 La fecha fin es el día del check-out. Hacé clic en una fila para saltar a la primera noche en el itinerario.
        </div>
      </div>
    </div>
  );
}
