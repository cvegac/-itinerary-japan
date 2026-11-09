"use client";

import { useState, type ReactNode } from "react";
import { Layers, X } from "lucide-react";
import type { DayLayer, MapMode } from "@/components/TripMap";
import MapModeControl from "@/components/MapModeControl";
import DayLayerControl from "@/components/DayLayerControl";

type Props = {
  mode: MapMode;
  onModeChange: (mode: MapMode) => void;
  dayLayer: DayLayer;
  onDayLayerChange: (layer: DayLayer) => void;
  showShops: boolean;
  onShowShopsChange: (show: boolean) => void;
  /** Sin tiendas cargadas no hay interruptor */
  hasShops: boolean;
  terrain: boolean;
  onTerrainChange: (on: boolean) => void;
  /** Extra al pie del menú (ej. el uso sin conexión) */
  children?: ReactNode;
};

/** Todo lo que se puede cambiar del mapa, detrás de un solo botón: así el mapa
 *  queda libre. El punto en el botón avisa si algo no está como de costumbre */
export default function MapLayersMenu({
  mode,
  onModeChange,
  dayLayer,
  onDayLayerChange,
  showShops,
  onShowShopsChange,
  hasShops,
  terrain,
  onTerrainChange,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const changed = mode !== "day" || dayLayer !== "all" || showShops || terrain;

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Capas del mapa"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="relative flex size-10 items-center justify-center rounded-full border border-line bg-surface/90 text-fg shadow-md backdrop-blur-md active:scale-95"
      >
        <Layers className="size-5" aria-hidden />
        {changed && <span data-active className="absolute right-1 top-1 size-2.5 rounded-full border-2 border-surface bg-accent" />}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Cerrar capas"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-label="Capas del mapa"
            className="absolute left-0 top-full z-50 mt-2 flex w-72 max-w-[calc(100vw-1.5rem)] flex-col gap-3 rounded-2xl border border-line bg-surface p-3.5 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">Mapa</h2>
              <button
                type="button"
                aria-label="Cerrar panel"
                onClick={() => setOpen(false)}
                className="-m-1 rounded-lg p-1 text-muted hover:bg-surface-2"
              >
                <X className="size-4" />
              </button>
            </div>

            <Group title="Vista">
              <MapModeControl mode={mode} onChange={onModeChange} className="shadow-none" />
            </Group>
            {mode === "day" && (
              <Group title="Qué ver del día">
                <DayLayerControl layer={dayLayer} onChange={onDayLayerChange} className="shadow-none" />
              </Group>
            )}

            <div className="flex flex-col gap-1">
              {hasShops && <Switch label="♻️ Segunda mano" checked={showShops} onChange={onShowShopsChange} />}
              <Switch label="⛰️ Relieve 3D" checked={terrain} onChange={onTerrainChange} />
            </div>

            {children && <div className="border-t border-line pt-3">{children}</div>}
          </div>
        </>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{title}</span>
      {children}
    </div>
  );
}

function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-3 rounded-xl px-1 py-1.5 text-sm hover:bg-surface-2"
    >
      <span>{label}</span>
      <span className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${checked ? "bg-emerald-500" : "bg-line"}`}>
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${checked ? "left-[18px]" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}
