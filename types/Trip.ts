import type { DayEntry } from "./DayEntry";

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

export type TripData = {
  meta: TripMeta;
  itinerary: DayEntry[];
  /** Opcional: no todos los viajes usan buses nocturnos */
  nightBusSummary?: NightBusSummary;
};
