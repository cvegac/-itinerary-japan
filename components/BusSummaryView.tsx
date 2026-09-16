"use client";

import type { NightBusSummary } from "@/types/Trip";

type Props = {
  nightBusSummary: NightBusSummary;
  onClose: () => void;
};

export default function BusSummaryView({ nightBusSummary, onClose }: Props) {
  return (
    <div className="flex-1 bg-gray-50 overflow-y-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-orange-900 flex items-center gap-2">
            🚌 Buses Nocturnos — Japan Bus Pass 5 días
          </h2>
          <button
            onClick={onClose}
            className="bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
          >
            Volver al itinerario
          </button>
        </div>

        {/* Resumen de ahorro */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-orange-100 shadow-sm p-4 flex flex-col gap-1">
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Buses usados</span>
            <span className="text-2xl font-bold text-orange-800">{nightBusSummary.totalBuses}</span>
          </div>
          <div className="bg-white rounded-lg border border-orange-100 shadow-sm p-4 flex flex-col gap-1">
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Costo Pass</span>
            <span className="text-2xl font-bold text-red-600">{nightBusSummary.japanBusPass}</span>
          </div>
          <div className="bg-white rounded-lg border border-emerald-100 shadow-sm p-4 flex flex-col gap-1">
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Hoteles ahorrados</span>
            <span className="text-2xl font-bold text-emerald-700">{nightBusSummary.totalHotelSaved}</span>
          </div>
          <div className="bg-white rounded-lg border border-emerald-100 shadow-sm p-4 flex flex-col gap-1">
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Ahorro neto</span>
            <span className="text-2xl font-bold text-emerald-700">{nightBusSummary.netSaving}</span>
          </div>
        </div>

        {/* Tabla detallada */}
        <div className="bg-white rounded-lg border border-orange-100 shadow-sm overflow-hidden">
          <div className="bg-orange-50 px-4 py-2.5 border-b border-orange-100 flex items-center justify-between">
            <span className="text-sm font-bold text-orange-900">Detalle por bus</span>
            <span className="text-xs text-orange-600 font-medium bg-orange-100 px-2 py-0.5 rounded-full">
              ⏱ {nightBusSummary.totalTimeSaved} ganados
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="text-sm w-full">
              <thead>
                <tr className="text-gray-400 font-medium border-b border-gray-100 bg-gray-50/50 text-xs">
                  <th className="text-left font-normal py-2 px-4">#</th>
                  <th className="text-left font-normal py-2 pr-4">Noche</th>
                  <th className="text-left font-normal py-2 pr-4">Ruta</th>
                  <th className="text-left font-normal py-2 pr-4">Costo bus</th>
                  <th className="text-left font-normal py-2 pr-4">Hotel ahorrado</th>
                  <th className="text-left font-normal py-2 pr-4">Tiempo ganado</th>
                </tr>
              </thead>
              <tbody>
                {nightBusSummary.buses.map((b) => (
                  <tr key={b.number} className="border-b last:border-b-0 border-gray-50 text-gray-700 hover:bg-orange-50 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-orange-700">{b.number}</td>
                    <td className="py-2.5 pr-4">{b.night}</td>
                    <td className="py-2.5 pr-4 font-medium">{b.route}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{b.cost}</td>
                    <td className="py-2.5 pr-4 font-semibold text-emerald-600">{b.hotelSaved}</td>
                    <td className="py-2.5 pr-4 text-sky-600 font-medium">{b.timeSaved}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 text-sm text-orange-700 font-medium bg-orange-100/50 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-center border border-orange-200 gap-2">
          <span>🌙 Cada bus nocturno reemplaza una noche de hotel y aprovecha horas de viaje mientras dormís.</span>
          <span className="font-bold text-orange-800 bg-white px-3 py-1 rounded-full shadow-sm shadow-orange-200 text-base">
            Ahorro total: {nightBusSummary.netSaving}
          </span>
        </div>
      </div>
    </div>
  );
}
