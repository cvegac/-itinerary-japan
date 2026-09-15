"use client";

import { ITINERARY } from "@/data/itinerary";
import { COST_SUMMARY, NIGHT_BUS_SUMMARY } from "@/lib/itinerary-utils";

type ActiveView = "itinerary" | "costs" | "buses";

type Props = {
  activeView: ActiveView;
  onToggleCosts: () => void;
  onToggleBus: () => void;
};

export default function AppHeader({ activeView, onToggleCosts, onToggleBus }: Props) {
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🇯🇵</span>
        <div>
          <h1 className="text-lg font-bold text-gray-900 leading-tight">Japón 2026</h1>
          <p className="text-xs text-gray-500">
            1 Nov – 5 Dic · 35 días · {ITINERARY.length} jornadas
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        {/* Cost pill */}
        <button
          onClick={onToggleCosts}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors border ${
            activeView === "costs"
              ? "bg-emerald-600 text-white border-emerald-700"
              : "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800"
          }`}
        >
          💰 Costos · ~${COST_SUMMARY.total} USD
        </button>

        {/* Bus pill */}
        <button
          onClick={onToggleBus}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors border ${
            activeView === "buses"
              ? "bg-orange-600 text-white border-orange-700"
              : "bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-800"
          }`}
        >
          🚌 {NIGHT_BUS_SUMMARY.totalBuses} buses · {NIGHT_BUS_SUMMARY.netSaving}
        </button>
      </div>
    </header>
  );
}
