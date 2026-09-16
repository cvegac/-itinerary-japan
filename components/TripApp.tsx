"use client";

import { useState } from "react";
import type { DayEntry } from "@/types/DayEntry";
import type { TripData } from "@/types/Trip";
import { computeCostSummary } from "@/lib/itinerary-utils";
import AppHeader from "@/components/AppHeader";
import CostSummaryView from "@/components/CostSummaryView";
import BusSummaryView from "@/components/BusSummaryView";
import ItineraryView from "@/components/ItineraryView";

type ActiveView = "itinerary" | "costs" | "buses";

type Props = {
  tripData: TripData;
};

export default function TripApp({ tripData }: Props) {
  const { meta, itinerary, nightBusSummary } = tripData;
  const [selectedDay, setSelectedDay] = useState<DayEntry | null>(itinerary[0] ?? null);
  const [activeView, setActiveView] = useState<ActiveView>("itinerary");

  const costTotal = computeCostSummary(itinerary, meta.startDate).total;

  function handleToggleCosts() {
    setActiveView((v) => (v === "costs" ? "itinerary" : "costs"));
  }

  function handleToggleBus() {
    setActiveView((v) => (v === "buses" ? "itinerary" : "buses"));
  }

  function handleDaySelectFromCosts(day: DayEntry) {
    setSelectedDay(day);
    setActiveView("itinerary");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader
        activeView={activeView}
        onToggleCosts={handleToggleCosts}
        onToggleBus={handleToggleBus}
        tripMeta={meta}
        dayCount={itinerary.length}
        costTotal={costTotal}
        nightBusSummary={nightBusSummary}
      />

      {activeView === "costs" && (
        <CostSummaryView
          itinerary={itinerary}
          startDate={meta.startDate}
          onDaySelect={handleDaySelectFromCosts}
          onClose={() => setActiveView("itinerary")}
        />
      )}

      {activeView === "buses" && nightBusSummary && (
        <BusSummaryView nightBusSummary={nightBusSummary} onClose={() => setActiveView("itinerary")} />
      )}

      {activeView === "itinerary" && (
        <ItineraryView
          itinerary={itinerary}
          startDate={meta.startDate}
          months={meta.months}
          mapCenter={meta.mapCenter}
          mapZoom={meta.mapZoom}
          selectedDay={selectedDay}
          onDaySelect={setSelectedDay}
        />
      )}
    </div>
  );
}
