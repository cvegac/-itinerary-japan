import type { DayEntry, Weekday } from "@/types/DayEntry";
import type { TripData } from "@/types/Trip";

export function makeDay(date: string, weekday: Weekday, overrides: Partial<DayEntry> = {}): DayEntry {
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
    makeDay("2026-11-03", "Mar", { label: "Vuelo a Hiroshima", lodgingPlace: "Centro, Hiroshima", lodgingCost: 41 }),
  ],
  notes: {
    tasks: [
      { id: "bus-nikko", text: "Reservar el bus a Nikko", detail: "Se llena los fines de semana", date: "2026-11-02" },
      { id: "yenes", text: "Llevar yenes en efectivo" },
    ],
    sections: [{ title: "Pagar en efectivo", items: ["Ueno: ¥17,000"] }],
    topics: [
      {
        id: "tax-free",
        emoji: "🧾",
        title: "Compras sin impuesto",
        summary: "Cómo te devuelven el 10%",
        sections: [
          { title: "Al comprar", items: ["Mostrá el pasaporte"] },
          { title: "En el aeropuerto", items: ["Pasá por la terminal antes de despachar"] },
        ],
      },
    ],
  },
};
