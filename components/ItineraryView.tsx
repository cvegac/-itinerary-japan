"use client";

import { useState, useRef, Suspense, lazy } from "react";
import { WEEK_COLORS_CLASS, LEGEND, getWeekLabel, getTotalWeeks } from "@/lib/itinerary-utils";
import type { DayEntry } from "@/types/DayEntry";
import type { MapMode } from "@/components/TripMap";
import Calendar from "@/components/Calendar";
import DayDetail from "@/components/DayDetail";
import type { TripMonth } from "@/types/Trip";

const TripMap = lazy(() => import("@/components/TripMap"));

type Props = {
  itinerary: DayEntry[];
  startDate: string;
  months: TripMonth[];
  mapCenter: [number, number];
  mapZoom: number;
  selectedDay: DayEntry | null;
  onDaySelect: (day: DayEntry) => void;
};

export default function ItineraryView({
  itinerary,
  startDate,
  months,
  mapCenter,
  mapZoom,
  selectedDay,
  onDaySelect,
}: Props) {
  const [mapMode, setMapMode] = useState<MapMode>("day");
  const [mapSize, setMapSize] = useState<"normal" | "large" | "full">("normal");
  const detailRef = useRef<HTMLDivElement>(null);

  const totalWeeks = getTotalWeeks(itinerary, startDate);
  const weekLegend = Array.from({ length: totalWeeks }, (_, i) => ({
    label: `Semana ${i + 1}`,
    color: WEEK_COLORS_CLASS[i % WEEK_COLORS_CLASS.length],
  }));

  function cycleMapSize() {
    setMapSize((s) => (s === "normal" ? "large" : s === "large" ? "full" : "normal"));
  }

  function handleDaySelect(day: DayEntry) {
    onDaySelect(day);
    if (window.innerWidth < 1024) {
      setTimeout(() => {
        detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">
      {/* Left: Calendar */}
      <aside className="lg:w-[550px] xl:w-[650px] flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto p-4 flex flex-col gap-4">
        <div className="flex flex-wrap gap-3 justify-center mb-1">
          {LEGEND.slice(0, 7).map((l) => (
            <div key={l.label} className="flex items-center gap-1">
              <span className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
              <span className="text-xs text-gray-600 font-medium">{l.label}</span>
            </div>
          ))}
        </div>
        <Calendar
          itinerary={itinerary}
          months={months}
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
              {mapMode === "week" && `📅 Semana ${getWeekLabel(selectedDay?.date, startDate, itinerary)}`}
              {mapMode === "full" && `🗾 Ruta completa (${itinerary.length} días)`}
            </span>

            {(mapMode === "week" || mapMode === "full") && weekLegend.length > 0 && (
              <div className="hidden sm:flex items-center gap-2 border-l border-gray-300 pl-4">
                {weekLegend.map((week) => (
                  <div key={week.label} className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${week.color}`} />
                    <span className="text-[12px] text-gray-400 font-semibold">{week.label}</span>
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
            <TripMap
              day={selectedDay}
              mode={mapMode}
              onDaySelect={onDaySelect}
              itinerary={itinerary}
              startDate={startDate}
              center={mapCenter}
              zoom={mapZoom}
            />
          </Suspense>
        </div>

        {/* Toggle strip */}
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
  );
}
