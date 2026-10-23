import type { DayEntry } from "./DayEntry";
import type { TripRoutes } from "@/lib/route-plan";

export type NightBus = {
  number: string;
  night: string;
  route: string;
  cost: string;
  hotelSaved: string;
  timeSaved: string;
};

export type NightBusSummary = {
  totalBuses: number;
  japanBusPass: string;
  totalHotelSaved: string;
  netSaving: string;
  totalTimeSaved: string;
  buses: NightBus[];
};

export type TripMonth = {
  year: number;
  month: number;
  label: string;
};

export type TripMeta = {
  slug: string;
  emoji: string;
  title: string;
  subtitle: string;
  /** Fecha del primer día del itinerario (YYYY-MM-DD), usada para calcular semanas */
  startDate: string;
  months: TripMonth[];
  mapCenter: [number, number];
  mapZoom: number;
};

export type TripTask = {
  /** Fijo: con él se recuerda en el dispositivo si la tarea está hecha */
  id: string;
  text: string;
  detail?: string;
  /** Día del itinerario relacionado (YYYY-MM-DD) */
  date?: string;
};

export type TripNoteSection = {
  title: string;
  items: string[];
};

export type TripNotes = {
  tasks: TripTask[];
  sections: TripNoteSection[];
};

export type TripData = {
  meta: TripMeta;
  itinerary: DayEntry[];
  /** Tareas por hacer y notas para tener a mano */
  notes?: TripNotes;
  /** Opcional: no todos los viajes usan buses nocturnos */
  nightBusSummary?: NightBusSummary;
  /** Rutas precalculadas por fecha (scripts/fetch-routes.mjs) */
  routes?: TripRoutes;
};
