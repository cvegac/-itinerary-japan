"use client";

import type { MapMode } from "@/components/TripMap";

const MODES: { id: MapMode; label: string }[] = [
  { id: "day", label: "Día" },
  { id: "week", label: "Semana" },
  { id: "full", label: "Completo" },
];

export default function MapModeControl({
  mode,
  onChange,
  className = "",
  style,
}: {
  mode: MapMode;
  onChange: (mode: MapMode) => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Qué mostrar en el mapa"
      style={style}
      className={`inline-flex rounded-full border border-line bg-surface/90 p-1 shadow-md backdrop-blur-md ${className}`}
    >
      {MODES.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={mode === id}
          onClick={() => onChange(id)}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            mode === id ? "bg-fg text-bg" : "text-muted hover:text-fg"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
