"use client";

import { useState, useRef, Suspense, lazy } from "react";
import { ITINERARY, NIGHT_BUS_SUMMARY } from "@/data/itinerary";
import type { DayEntry } from "@/types/DayEntry";
import Calendar from "@/components/Calendar";
import DayDetail from "@/components/DayDetail";
import type { MapMode } from "@/components/JapanMap";

const JapanMap = lazy(() => import("@/components/JapanMap"));

const LEGEND = [
  { label: "Naturaleza", color: "bg-emerald-400" },
  { label: "Logística", color: "bg-slate-400" },
  { label: "Ciudad", color: "bg-orange-400" },
  { label: "Paisaje", color: "bg-sky-400" },
  { label: "Vistas", color: "bg-violet-400" },
  { label: "Compras", color: "bg-pink-400" },
  { label: "Libre", color: "bg-yellow-400" },
  { label: "Bus Nocturno", color: "bg-orange-400", icon: "🚌" },
];

const WEEK_LABELS = ["1 nov", "8 nov", "15 nov", "22 nov", "29 nov"];

function getWeekLabel(date?: string): string {
  if (!date) return "";
  const d = new Date(date + "T12:00:00");
  const start = new Date("2026-11-01T12:00:00");
  const diffDays = Math.floor((d.getTime() - start.getTime()) / 86400000);
  const wi = Math.min(Math.floor(diffDays / 7), WEEK_LABELS.length - 1);
  return `${wi + 1}/5 (${WEEK_LABELS[wi]})`;
}

const COST_SUMMARY = (() => {
  const weeks: { weekNum: number; label: string; days: any[]; total: number }[] = [];
  let wIndex = -1;
  let gTotal = 0;

  ITINERARY.forEach((day, i) => {
    const budgetRaw = day.budget.replace(/[^0-9]/g, "");
    const cost = budgetRaw ? parseInt(budgetRaw, 10) : 0;
    
    if (i % 7 === 0) {
      wIndex++;
      weeks.push({ weekNum: wIndex + 1, label: WEEK_LABELS[wIndex] || `Semana ${wIndex + 1}`, days: [], total: 0 });
    }
    
    weeks[wIndex].total += cost;
    gTotal += cost;
    weeks[wIndex].days.push({
      date: day.date,
      label: day.label,
      budget: day.budget,
      cost
    });
  });

  return { weeks, total: gTotal };
})();

export default function Page() {
  const [selectedDay, setSelectedDay] = useState<DayEntry>(ITINERARY[0]);
  const [showBusSummary, setShowBusSummary] = useState(false);
  const [showCostSummary, setShowCostSummary] = useState(false);
  const [mapMode, setMapMode] = useState<MapMode>("day");
  const [mapSize, setMapSize] = useState<"normal" | "large" | "full">("normal");
  const detailRef = useRef<HTMLDivElement>(null);

  function cycleMapSize() {
    setMapSize((s) => s === "normal" ? "large" : s === "large" ? "full" : "normal");
  }

  const handleDaySelect = (day: DayEntry) => {
    setSelectedDay(day);
    if (window.innerWidth < 1024) {
      setTimeout(() => {
        detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🇯🇵</span>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">
              Japón 2026
            </h1>
            <p className="text-xs text-gray-500">
              1 Nov – 5 Dic · 35 días · {ITINERARY.length} jornadas
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {/* Cost summary pill */}
          <div className="relative group z-50">
            <button
              onClick={() => { setShowCostSummary(!showCostSummary); setShowBusSummary(false); }}
              className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
            >
              💰 Costos · ~${COST_SUMMARY.total} USD
            </button>
            
            {/* Tooltip con desglose global */}
            <div className="absolute top-full lg:right-0 mt-2 w-max bg-white rounded-lg shadow-lg border border-emerald-200 p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
              <h4 className="text-emerald-900 font-bold border-b border-emerald-100 pb-1 mb-2">Presupuesto por Semana</h4>
              <div className="flex flex-col gap-1 text-sm text-gray-700">
                {COST_SUMMARY.weeks.map(w => (
                  <div key={w.weekNum} className="flex justify-between gap-6">
                    <span className="text-gray-500">Semana {w.weekNum} ({w.label}):</span>
                    <span className="font-semibold text-emerald-600">${w.total}</span>
                  </div>
                ))}
                <div className="border-t border-gray-100 mt-1 pt-1 flex justify-between gap-6">
                  <span className="font-bold text-gray-900">Total Viaje (35 días):</span>
                  <span className="font-bold text-emerald-600">${COST_SUMMARY.total}</span>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mt-2 text-center">(Click para expandir tabla detallada)</p>
            </div>
          </div>

          {/* Bus nocturno pill */}
          <div className="relative group z-40">
            <button
              onClick={() => { setShowBusSummary(!showBusSummary); setShowCostSummary(false); }}
              className="flex items-center gap-1.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-800 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
            >
            🚌 {NIGHT_BUS_SUMMARY.totalBuses} buses nocturnos · Ahorro {NIGHT_BUS_SUMMARY.netSaving}
          </button>
          
          {/* Tooltip con desglose de costos al hacer hover */}
          <div className="absolute top-full lg:right-0 mt-2 w-max bg-white rounded-lg shadow-lg border border-orange-200 p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
            <h4 className="text-orange-900 font-bold border-b border-orange-100 pb-1 mb-2">Desglose de Costos</h4>
            <div className="flex flex-col gap-1 text-sm text-gray-700">
              <div className="flex justify-between gap-6">
                <span className="text-gray-500">Ahorro en Hoteles:</span>
                <span className="font-semibold text-emerald-600">{NIGHT_BUS_SUMMARY.totalHotelSaved}</span>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-gray-500">Costo Japan Bus Pass:</span>
                <span className="font-medium text-red-500">-{NIGHT_BUS_SUMMARY.japanBusPass}</span>
              </div>
              <div className="border-t border-gray-100 mt-1 pt-1 flex justify-between gap-6">
                <span className="font-bold text-gray-900">Ahorro Neto Real:</span>
                <span className="font-bold text-emerald-600">{NIGHT_BUS_SUMMARY.netSaving}</span>
              </div>
            </div>
            
            <div className="mt-3 pt-2 border-t border-orange-100">
               <div className="flex items-center gap-1.5 text-xs text-orange-700 font-medium bg-orange-50 px-2 py-1.5 rounded">
                  <span>⏱</span>
                  <span>Tiempo turístico ganado: <span className="font-bold">{NIGHT_BUS_SUMMARY.totalTimeSaved}</span></span>
               </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-2 text-center">(Click para expandir tabla detallada)</p>
          </div>
        </div>
        </div>
      </header>

      {/* Cost summary panel */}
      {showCostSummary && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-3 max-h-[60vh] overflow-y-auto">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-emerald-900">
                💰 Detalle de Presupuesto Diario Est. (~${COST_SUMMARY.total} USD)
              </h2>
              <button
                onClick={() => setShowCostSummary(false)}
                className="text-emerald-400 hover:text-emerald-700 text-lg leading-none"
              >
                ×
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
              {COST_SUMMARY.weeks.map((week) => (
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
                          <tr key={i} className="border-b last:border-b-0 border-gray-50 text-gray-700 hover:bg-emerald-50 cursor-pointer transition-colors" onClick={() => { setSelectedDay(ITINERARY.find(it => it.date === d.date) || ITINERARY[0]); setShowCostSummary(false); }}>
                            <td className="py-1.5 px-3 whitespace-nowrap text-gray-500">{new Date(d.date + "T12:00:00").toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short'})}</td>
                            <td className="py-1.5 pr-3 font-medium truncate max-w-[120px] sm:max-w-[150px]" title={d.label}>{d.label}</td>
                            <td className="py-1.5 pr-3 text-right font-bold text-emerald-600">{d.budget}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 text-xs text-emerald-700 font-medium bg-emerald-100/30 p-2 rounded flex justify-between border border-emerald-200">
               <span>Podes hacer clic en cualquier día para saltar a él en el itinerario principal.</span>
               <span className="font-bold text-emerald-800 animate-pulse">Total acumulado: ${COST_SUMMARY.total}</span>
            </div>
            
          </div>
        </div>
      )}

      {/* Bus summary panel */}
      {showBusSummary && (
        <div className="bg-orange-50 border-b border-orange-200 px-4 py-3">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-orange-900">
                🚌 Resumen de Buses Nocturnos — Japan Bus Pass 5 días
              </h2>
              <button
                onClick={() => setShowBusSummary(false)}
                className="text-orange-400 hover:text-orange-700 text-lg leading-none"
              >
                ×
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="text-xs w-full">
                <thead>
                  <tr className="text-orange-600 font-semibold border-b border-orange-200">
                    <th className="text-left py-1 pr-4">#</th>
                    <th className="text-left py-1 pr-4">Noche</th>
                    <th className="text-left py-1 pr-4">Ruta</th>
                    <th className="text-left py-1 pr-4">Costo bus</th>
                    <th className="text-left py-1 pr-4">Hotel ahorrado</th>
                    <th className="text-left py-1">Tiempo ganado</th>
                  </tr>
                </thead>
                <tbody>
                  {NIGHT_BUS_SUMMARY.buses.map((b) => (
                    <tr key={b.number} className="border-b border-orange-100 text-orange-900">
                      <td className="py-1 pr-4 font-bold">{b.number}</td>
                      <td className="py-1 pr-4">{b.night}</td>
                      <td className="py-1 pr-4">{b.route}</td>
                      <td className="py-1 pr-4">{b.cost}</td>
                      <td className="py-1 pr-4">{b.hotelSaved}</td>
                      <td className="py-1">{b.timeSaved}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-6 mt-2 text-xs text-orange-700 font-semibold">
              <span>💰 Pass: {NIGHT_BUS_SUMMARY.japanBusPass}</span>
              <span>🏨 Ahorro hoteles: {NIGHT_BUS_SUMMARY.totalHotelSaved}</span>
              <span>✅ Ahorro neto: {NIGHT_BUS_SUMMARY.netSaving}</span>
              <span>⏱ {NIGHT_BUS_SUMMARY.totalTimeSaved}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">
        {/* Left: Calendar */}
        <aside className="lg:w-[520px] xl:w-[600px] flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto p-4 flex flex-col gap-4">
          <div className="flex flex-wrap gap-3 justify-center mb-1">
            {LEGEND.slice(0, 7).map((l) => (
              <div key={l.label} className="flex items-center gap-1">
                <span className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
                <span className="text-xs text-gray-600 font-medium">{l.label}</span>
              </div>
            ))}
          </div>
          <Calendar
            selectedDate={selectedDay?.date ?? null}
            onDaySelect={handleDaySelect}
          />
        </aside>

        {/* Right: Map + Detail */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Map toolbar */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-200 flex-shrink-0 flex-wrap gap-2">
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-500 font-medium">
                {mapMode === "day" && `📍 ${selectedDay?.location ?? ""}`}
                {mapMode === "week" && `📅 Semana ${getWeekLabel(selectedDay?.date)}`}
                {mapMode === "full" && `🗾 Ruta completa (${ITINERARY.length} días)`}
              </span>

              {/* Leyenda de colores de semana (sólo útil si hay más de 1 día mostrado, o en general para entender el color) */}
              {(mapMode === "week" || mapMode === "full") && (
                <div className="hidden sm:flex items-center gap-2 border-l border-gray-300 pl-4">
                  {[
                    { w: "Semana 1", c: "bg-red-500" },
                    { w: "Semana 2", c: "bg-orange-500" },
                    { w: "Semana 3", c: "bg-yellow-500" },
                    { w: "Semana 4", c: "bg-green-500" },
                    { w: "Semana 5", c: "bg-blue-500" },
                  ].map((week) => (
                    <div key={week.w} className="flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${week.c}`} />
                      <span className="text-[12px] text-gray-400 font-semibold">{week.w}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-1 ml-auto">
              {(["day", "week", "full"] as MapMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMapMode(m)}
                  className={`text-[11px] px-2.5 py-1 rounded-full font-semibold transition-colors ${
                    mapMode === m
                      ? "bg-gray-800 text-white"
                      : "bg-white text-gray-500 border border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {m === "day" ? "Día" : m === "week" ? "Semana" : "Completa"}
                </button>
              ))}
            </div>
          </div>

          {/* Map */}
          <div
            className={`bg-gray-200 flex-shrink-0 transition-all duration-300 ${
              mapSize === "normal"
                ? "h-[300px] lg:h-[38%]"
                : mapSize === "large"
                ? "h-[480px] lg:h-[65%]"
                : "flex-1"
            }`}
          >
            <Suspense
              fallback={
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                  Cargando mapa...
                </div>
              }
            >
              <JapanMap day={selectedDay} mode={mapMode} />
            </Suspense>
          </div>

          {/* Toggle strip — click para cambiar tamaño del mapa */}
          <button
            onClick={cycleMapSize}
            title={mapSize === "full" ? "Mostrar detalle" : "Expandir mapa"}
            className="flex items-center justify-center gap-2 w-full flex-shrink-0 py-1 bg-gray-100 hover:bg-gray-200 border-y border-gray-200 transition-colors group"
          >
            <span className="text-[10px] text-gray-400 group-hover:text-gray-600 font-medium">
              {mapSize === "normal" && "expandir mapa ▼"}
              {mapSize === "large" && "mapa completo ▼"}
              {mapSize === "full" && "▲ mostrar detalle"}
            </span>
          </button>

          {/* Detail panel */}
          <div
            ref={detailRef}
            className={`overflow-y-auto bg-white p-5 transition-all duration-300 ${
              mapSize === "full" ? "hidden" : "flex-1"
            }`}
          >
            {selectedDay ? (
              <DayDetail day={selectedDay} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                Seleccioná un día en el calendario
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
