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
  /** Precio real de esa noche en USD (total de la reserva / noches). Lo usa el
   *  presupuesto del día (lib/budget.ts) */
  lodgingCost?: number;
  /** Puntos de interés del día (coordenadas verificadas con OpenStreetMap).
   *  El mapa los muestra solo en modo "día". */
  pois?: PointOfInterest[];
  /** El orden de los lugares es intencional (sendero, tren, alquiler de bici,
   *  horario): las rutas lo respetan en vez de optimizarlo */
  keepOrder?: boolean;
  /** Día de sendero (Kumano Kodo, Nakasendo…): los tramos largos a pie se
   *  trazan por el camino en vez de marcarse como tren o bus */
  hike?: boolean;
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
