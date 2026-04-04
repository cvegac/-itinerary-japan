import type { TransportSegment } from "./TransportSegment";

export type DayEntry = {
  date: string;
  /** Título descriptivo del día: qué vas a hacer/ver (NO "Llegada" o "Salida") */
  label: string;
  location: string;
  category: string;
  notes: string;
  weekday: string;
  food: string;
  /** Array de segmentos de transporte para ese día */
  transport: TransportSegment[];
  accommodation: string;
  zona: string;
  accommodationCoords: [number, number];
  budget: string;
  activitiesDay: string[];
  activitiesNight: string[];
  isTransit: boolean;
  /** Si esa noche toma bus nocturno, el número de bus (ej: "#1") */
  nightBus?: string;
  /** Tiempo diurno ahorrado por el bus nocturno */
  timeSaved?: string;
  /** Ruta del bus nocturno (ej: "Tokio → Utsunomiya") */
  busRoute?: string;
  /** Costo del bus nocturno */
  busCost?: string;
  /** Hotel ahorrado por dormir en el bus */
  hotelSaved?: string;
};
