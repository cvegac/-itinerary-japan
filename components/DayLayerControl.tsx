"use client";

import type { DayLayer } from "@/components/TripMap";

const LAYERS: { id: DayLayer; label: string }[] = [
  { id: "all", label: "Todo" },
  { id: "transit", label: "Transporte" },
  { id: "route", label: "Recorrido" },
];

/** En el mapa del día: ver todo, solo los trenes y buses, o solo los lugares y el recorrido */
export default function DayLayerControl({
  layer,
  onChange,
  className = "",
}: {
  layer: DayLayer;
  onChange: (layer: DayLayer) => void;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Qué ver del día"
      className={`inline-flex rounded-full border border-line bg-surface/90 p-1 shadow-md backdrop-blur-md ${className}`}
    >
      {LAYERS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={layer === id}
          onClick={() => onChange(id)}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            layer === id ? "bg-accent text-white" : "text-muted hover:text-fg"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
