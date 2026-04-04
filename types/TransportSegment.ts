export type TransportSegment = {
  /** Tipo: tren, bus, metro, ferry, teleférico, caminar, monorriel, bus-nocturno */
  mode: string;
  /** Nombre de la línea o servicio (ej: "Keio Line", "Willer Express") */
  line?: string;
  /** Origen */
  from: string;
  /** Destino */
  to: string;
  /** Duración estimada */
  duration?: string;
  /** Costo estimado */
  cost?: string;
  /** Notas adicionales */
  note?: string;
};