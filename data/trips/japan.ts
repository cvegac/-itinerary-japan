// El itinerario es un JSON validado con lib/schema.ts (ver README.md)
import itinerary from "./japan-itinerary.json";
import routes from "./japan-routes.json";
import { NOTES } from "./japan-notes";
import type { TripData } from "@/types/Trip";
import type { DayEntry } from "@/types/DayEntry";
import type { TripRoutes } from "@/lib/route-plan";

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
    mapCenter: [35.2, 136.5],
    mapZoom: 6,
  },
  itinerary: itinerary as DayEntry[],
  notes: NOTES,
  // Precalculadas con scripts/fetch-routes.mjs (un test avisa si quedan viejas)
  routes: routes as unknown as TripRoutes,
};
