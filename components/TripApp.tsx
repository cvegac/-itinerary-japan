"use client";

import { useState } from "react";
import type { DayEntry } from "@/types/DayEntry";
import type { TripData } from "@/types/Trip";
import { computeCostSummary, computeLodgingSummary } from "@/lib/itinerary-utils";
import AppHeader from "@/components/AppHeader";
import CostSummaryView from "@/components/CostSummaryView";
import LodgingSummaryView from "@/components/LodgingSummaryView";
import BusSummaryView from "@/components/BusSummaryView";
import ItineraryView from "@/components/ItineraryView";

type ActiveView = "itinerary" | "costs" | "lodging" | "buses";

type Props = {
  tripData: TripData;
};

export default function TripApp({ tripData }: Props) {
  const { meta, itinerary, nightBusSummary } = tripData;
  const [selectedDay, setSelectedDay] = useState<DayEntry | null>(itinerary[0] ?? null);
  const [activeView, setActiveView] = useState<ActiveView>("itinerary");

  const costTotal = computeCostSummary(itinerary, meta.startDate).total;
  const lodgingNights = computeLodgingSummary(itinerary).reduce((sum, s) => sum + s.nights, 0);

  function handleToggleCosts() {
    setActiveView((v) => (v === "costs" ? "itinerary" : "costs"));
  }

  function handleToggleLodging() {
    setActiveView((v) => (v === "lodging" ? "itinerary" : "lodging"));
  }

  function handleToggleBus() {
    setActiveView((v) => (v === "buses" ? "itinerary" : "buses"));
  }

  function handleDaySelectFromSummary(day: DayEntry) {
    setSelectedDay(day);
    setActiveView("itinerary");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader
        activeView={activeView}
        onToggleCosts={handleToggleCosts}
        onToggleLodging={handleToggleLodging}
        onToggleBus={handleToggleBus}
        tripMeta={meta}
        dayCount={itinerary.length}
        costTotal={costTotal}
        lodgingNights={lodgingNights}
        nightBusSummary={nightBusSummary}
      />

      {activeView === "costs" && (
        <CostSummaryView
          itinerary={itinerary}
          startDate={meta.startDate}
          onDaySelect={handleDaySelectFromSummary}
          onClose={() => setActiveView("itinerary")}
        />
      )}

      {activeView === "lodging" && (
        <LodgingSummaryView
          itinerary={itinerary}
          onDaySelect={handleDaySelectFromSummary}
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
