import type { DayEntry } from "@/types/DayEntry";
import type { TripData } from "@/types/Trip";

export function makeDay(date: string, weekday: string, overrides: Partial<DayEntry> = {}): DayEntry {
  return {
    date,
    label: `Plan del ${date}`,
    location: "Tokio",
    category: "Naturaleza",
    notes: "Nota del día",
    weekday,
    food: "Ramen",
    transport: [],
    accommodation: "K's House Tokyo",
    lodgingPlace: "Asakusa, Tokio",
    zona: "Asakusa",
    accommodationCoords: [35.7119, 139.7983],
    budget: "$100",
    activitiesDay: ["Templo"],
    activitiesNight: ["Cena"],
    isTransit: false,
    ...overrides,
  };
}

export const fixtureTrip: TripData = {
  meta: {
    slug: "test",
    emoji: "🇯🇵",
    title: "Viaje de prueba",
    subtitle: "1 Nov – 3 Nov",
    startDate: "2026-11-01",
    months: [{ year: 2026, month: 11, label: "Noviembre 2026" }],
    mapCenter: [35.7, 139.8],
    mapZoom: 6,
  },
  itinerary: [
    makeDay("2026-11-01", "Dom", { label: "Llegada a Asakusa" }),
    makeDay("2026-11-02", "Lun", { label: "Excursión a Nikko", location: "Nikko" }),
    makeDay("2026-11-03", "Mar", { label: "Vuelo a Hiroshima", lodgingPlace: "Centro, Hiroshima" }),
  ],
};
