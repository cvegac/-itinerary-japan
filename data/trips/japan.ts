// El itinerario es un JSON validado con lib/schema.ts (ver README.md)
import itinerary from "./japan-itinerary.json";
import routes from "./japan-routes.json";
import places from "./japan-places.json";
import transit from "./japan-transit.json";
import { NOTES } from "./japan-notes";
import type { TripData } from "@/types/Trip";
import type { DayEntry } from "@/types/DayEntry";
import type { TripRoutes } from "@/lib/route-plan";
import type { Places, TripTransit } from "@/lib/transit";

export const japanTrip: TripData = {
  meta: {
    slug: "japan",
    emoji: "🇯🇵",
    title: "Japón 2026",
    subtitle: "30 Oct – 6 Dic · 35 días en Japón",
    startDate: "2026-10-30",
    months: [
      { year: 2026, month: 10, label: "Octubre 2026" },
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
  places: places as unknown as Places,
  // Trenes por las vías, buses por la ruta y vuelos en arco (scripts/fetch-transit.mjs)
  transit: transit as unknown as TripTransit,
};
