// El itinerario es un JSON validado con lib/schema.ts (ver README.md)
import itinerary from "./eje-cafetero-itinerary.json";
import type { DayEntry } from "@/types/DayEntry";
import type { TripData } from "@/types/Trip";

export const ejeCafeteroTrip: TripData = {
  meta: {
    slug: "eje-cafetero",
    emoji: "☕",
    title: "Eje Cafetero 2026",
    subtitle: "11–17 Oct · 7 días · Pereira → Armenia",
    startDate: "2026-10-11",
    months: [{ year: 2026, month: 10, label: "Octubre 2026" }],
    mapCenter: [4.63, -75.68],
    mapZoom: 10,
  },
  itinerary: itinerary as DayEntry[],
  // Sin nightBusSummary: en este viaje no se usan buses nocturnos.
};
