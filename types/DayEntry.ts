import type { TransportSegment } from "./TransportSegment";
import type { Money } from "@/lib/cost";

/** Actividad del día: un texto, o un texto con su entrada (que suma al presupuesto) */
export type Activity = string | { text: string; price?: Money; optional?: boolean };

export type Weekday = "Dom" | "Lun" | "Mar" | "Mié" | "Jue" | "Vie" | "Sáb";

/** Lugar a visitar ese día, en el orden del recorrido */
export type PointOfInterest = {
  name: string;
  coords: [number, number];
  /** Se visita de noche */
  night?: boolean;
  /** Ícono a mano; si falta se deduce del nombre (lib/poi-icons.ts) */
  icon?: string;
};

export type DayEntry = {
  date: string;
  /** Título descriptivo del día: qué vas a hacer/ver (NO "Llegada" o "Salida") */
  label: string;
  location: string;
  category: string;
  notes: string;
  weekday: Weekday;
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
  /** Para mostrarle al taxista: nombre y dirección en japonés, y teléfono */
  lodgingJa?: { name: string; address: string; phone?: string };
  /** Horarios de la reserva, ej. "15:00–19:00" y "hasta 11:00" */
  checkIn?: string;
  checkOut?: string;
  /** Puntos de interés del día (coordenadas verificadas con OpenStreetMap).
   *  El mapa los muestra solo en modo "día". */
  pois?: PointOfInterest[];
  /** El orden de los lugares es intencional (sendero, tren, alquiler de bici,
   *  horario): las rutas lo respetan en vez de optimizarlo */
  keepOrder?: boolean;
  /** Por qué se respeta ese orden (documentación, no se muestra) */
  keepOrderReason?: string;
  /** Día de sendero (Kumano Kodo, Nakasendo…): los tramos largos a pie se
   *  trazan por el camino en vez de marcarse como tren o bus */
  hike?: boolean;
  budget: string;
  activitiesDay: Activity[];
  activitiesNight: Activity[];
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
