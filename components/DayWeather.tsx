"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Forecast } from "@/lib/weather";
import { weatherLabel } from "@/lib/weather";

type Props = {
  forecast: Forecast;
  /** Si viene de lo guardado en el dispositivo (sin red): cuándo llegó */
  savedAt: string | null;
};

function savedLabel(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
  const time = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${day}, ${time}`;
}

/** Clima de la mañana, el mediodía, la tarde y la noche, para saber qué capas llevar.
 *  Arranca en una línea (ícono y temperatura) para no empujar el resto del día hacia
 *  abajo; al tocarla se abre con la lluvia de cada momento */
export default function DayWeather({ forecast, savedAt }: Props) {
  const [open, setOpen] = useState(false);
  if (forecast.parts.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        aria-expanded={open}
        aria-label={`Clima por momento del día: ${forecast.parts.map((p) => `${p.label} ${p.temp}°`).join(", ")}`}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between gap-2 rounded-xl bg-sky-500/10 px-3 py-1.5 text-sm text-sky-900"
      >
        <span className="flex flex-wrap items-center gap-x-2.5 tabular-nums">
          {forecast.parts.map((p) => (
            <span key={p.hour} className="whitespace-nowrap">
              <span aria-hidden>{weatherLabel(p.code).icon}</span> {p.temp}°
            </span>
          ))}
        </span>
        <ChevronDown className={`size-4 shrink-0 text-sky-800 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open && (
        <ul aria-label="Clima por momento del día" className="grid grid-cols-4 gap-1.5">
          {forecast.parts.map((p) => {
            const w = weatherLabel(p.code);
            return (
              <li key={p.hour} className="flex flex-col items-center rounded-xl bg-sky-500/10 px-1 py-1.5 text-sky-900">
                <span className="text-[11px] font-medium text-sky-800">{p.label}</span>
                <span aria-label={w.text} title={w.text}>
                  {w.icon}
                </span>
                <span className="text-sm font-semibold tabular-nums">{p.temp}°</span>
                {p.rain !== null && (
                  <span className="text-[11px] tabular-nums text-sky-800">
                    <span aria-label="Probabilidad de lluvia">💧</span> {p.rain} %
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {savedAt && (
        <p className="text-xs text-muted">Sin conexión: pronóstico guardado el {savedLabel(savedAt)}</p>
      )}
    </div>
  );
}
