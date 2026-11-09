import type { DayEntry } from "./DayEntry";
import type { TripRoutes } from "@/lib/route-plan";
import type { Places, TripTransit } from "@/lib/transit";

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
  /** Desde cuándo se puede hacer (YYYY-MM-DD), ej. el día que salen los boletos. Sin esto: ya */
  from?: string;
  /** Sitio donde se hace (reservar, comprar, ver el horario) */
  url?: string;
};

export type TripNoteSection = {
  title: string;
  items: string[];
};

/** Tema largo: en Notas se ve el título y el resumen, y se abre en una ventana */
export type TripNoteTopic = {
  id: string;
  emoji: string;
  title: string;
  summary: string;
  sections: TripNoteSection[];
};

export type TripNotes = {
  tasks: TripTask[];
  sections: TripNoteSection[];
  topics?: TripNoteTopic[];
};

/** Tienda cerca de un hospedaje (Hard Off, Book Off, 2nd Street…) */
export type NearbyShop = {
  name: string;
  /** Qué vende */
  what: string;
  coords: [number, number];
  /** Cómo llegar desde el hospedaje, ej. "~10 min a pie" */
  howFar: string;
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
  /** Dónde queda cada estación, parada y aeropuerto de los tramos (<viaje>-places.json) */
  places?: Places;
  /** Trazado de los tramos de tren, bus y avión por fecha (scripts/fetch-transit.mjs) */
  transit?: TripTransit;
  /** Tiendas de segunda mano por hospedaje, con la clave de lodgingPlace */
  shops?: Record<string, NearbyShop[]>;
};
