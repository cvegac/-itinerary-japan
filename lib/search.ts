import type { DayEntry } from "@/types/DayEntry";
import type { SharedNote } from "@/lib/shared-notes";

// Búsqueda en todo el itinerario, en el dispositivo: sin tildes ni mayúsculas,
// y con varias palabras el día tiene que tenerlas todas (en cualquier parte).

export type SearchMatch = { field: string; text: string };
export type SearchHit = { day: DayEntry; matches: SearchMatch[] };

/** Cuántas coincidencias se muestran por día */
const MAX_MATCHES = 3;

export function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function dayFields(day: DayEntry): SearchMatch[] {
  const activities = [...day.activitiesDay, ...day.activitiesNight].map((a) => (typeof a === "string" ? a : a.text));
  return [
    { field: "Día", text: day.label },
    { field: "Ciudad", text: day.location },
    { field: "Notas", text: day.notes },
    ...activities.map((text) => ({ field: "Actividad", text })),
    ...(day.pois ?? []).map((p) => ({ field: "Lugar", text: p.name })),
    ...day.transport.map((t) => ({
      field: "Transporte",
      text: [`${t.from} → ${t.to}`, t.line, t.note].filter(Boolean).join(" · "),
    })),
    { field: "Comida", text: day.food },
    { field: "Hospedaje", text: day.accommodation },
  ].filter((f) => f.text);
}

export function searchItinerary(itinerary: DayEntry[], query: string, notes: SharedNote[] = []): SearchHit[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  return itinerary.flatMap((day) => {
    const fields = [
      ...dayFields(day),
      ...notes.filter((n) => n.day === day.date).map((n) => ({ field: "Nota", text: n.text })),
    ];
    const all = normalize(fields.map((f) => f.text).join(" "));
    if (!words.every((w) => all.includes(w))) return [];
    const matches = fields.filter((f) => words.some((w) => normalize(f.text).includes(w))).slice(0, MAX_MATCHES);
    return [{ day, matches }];
  });
}
