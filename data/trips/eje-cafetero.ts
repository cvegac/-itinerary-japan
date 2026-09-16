import type { TripData } from "@/types/Trip";

// Stub: sin días cargados todavía. Cargá el itinerario acá con el mismo
// shape que data/trips/japan-itinerary.ts (array de DayEntry) y ajustá
// meta.startDate / meta.months a las fechas reales del viaje.
export const ejeCafeteroTrip: TripData = {
  meta: {
    slug: "eje-cafetero",
    emoji: "☕",
    title: "Eje Cafetero",
    subtitle: "Itinerario pendiente de completar",
    startDate: "2026-01-01",
    months: [{ year: 2026, month: 1, label: "Enero 2026" }],
    mapCenter: [4.81, -75.69],
    mapZoom: 9,
  },
  itinerary: [],
};
