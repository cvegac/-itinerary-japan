import type { Cost } from "@/lib/cost";

export type TransportSegment = {
  /** Tipo: tren, bus, metro, ferry, teleférico, caminar, monorriel, bus-nocturno */
  mode: string;
  /** Nombre de la línea o servicio (ej: "Keio Line", "Willer Express") */
  line?: string;
  /** Origen */
  from: string;
  /** Destino */
  to: string;
  /** Paradas intermedias por donde pasa (para trazarlo en el mapa por el camino
   *  correcto, ej. el cambio de línea en Kamakura). Nombres de <viaje>-places.json */
  via?: string[];
  /** Duración estimada */
  duration?: string;
  /** Costo estimado, como dato (lib/cost.ts) */
  cost?: Cost;
  /** Cómo se paga, de lo más cómodo a lo de respaldo: ids de lib/pay.ts
   *  (suica, boleto, tarjeta, efectivo, app) o el nombre de un pase */
  pay?: string[];
  /** No forma parte del plan base: no suma al presupuesto */
  optional?: boolean;
  /** Notas adicionales */
  note?: string;
};
