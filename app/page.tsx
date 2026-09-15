"use client";

import { useState } from "react";
import { ITINERARY } from "@/data/itinerary";
import type { DayEntry } from "@/types/DayEntry";
import AppHeader from "@/components/AppHeader";
import CostSummaryView from "@/components/CostSummaryView";
import BusSummaryView from "@/components/BusSummaryView";
import ItineraryView from "@/components/ItineraryView";

type ActiveView = "itinerary" | "costs" | "buses";

export default function Page() {
  const [selectedDay, setSelectedDay] = useState<DayEntry>(ITINERARY[0]);
  const [activeView, setActiveView] = useState<ActiveView>("itinerary");

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
      />

      {activeView === "costs" && (
        <CostSummaryView
          onDaySelect={handleDaySelectFromCosts}
          onClose={() => setActiveView("itinerary")}
        />
      )}

      {activeView === "buses" && (
        <BusSummaryView onClose={() => setActiveView("itinerary")} />
      )}

      {activeView === "itinerary" && (
        <ItineraryView
          selectedDay={selectedDay}
          onDaySelect={setSelectedDay}
        />
      )}
    </div>
  );
}
