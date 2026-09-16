import { ITINERARY, NIGHT_BUS_SUMMARY } from "./japan-itinerary";
import type { TripData } from "@/types/Trip";

export const japanTrip: TripData = {
  meta: {
    slug: "japan",
    emoji: "🇯🇵",
    title: "Japón 2026",
    subtitle: "1 Nov – 5 Dic · 35 días",
    startDate: "2026-11-01",
    months: [
      { year: 2026, month: 11, label: "Noviembre 2026" },
      { year: 2026, month: 12, label: "Diciembre 2026" },
    ],
    mapCenter: [36.5, 137.0],
    mapZoom: 6,
  },
  itinerary: ITINERARY,
  nightBusSummary: NIGHT_BUS_SUMMARY,
};
