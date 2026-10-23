import type { TransportSegment } from "./TransportSegment";

/** Lugar a visitar ese día, en el orden del recorrido */
export type PointOfInterest = {
  name: string;
  coords: [number, number];
  /** Se visita de noche */
  night?: boolean;
};

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
  /** Barrio y ciudad donde se duerme esa noche (ej: "Asakusa, Tokio"). Lo usa
   *  el resumen de hospedaje; si falta, se muestra `zona`. */
  lodgingPlace?: string;
  zona: string;
  accommodationCoords: [number, number];
  /** Puntos de interés del día (coordenadas verificadas con OpenStreetMap).
   *  El mapa los muestra solo en modo "día". */
  pois?: PointOfInterest[];
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
