"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Download, Trash2 } from "lucide-react";
import type { DayEntry } from "@/types/DayEntry";
import type { MapLayers } from "@/lib/map-tiles";
import {
  deleteTripMap,
  downloadTripMap,
  estimateTripMap,
  tripMapStatus,
  type DownloadProgress,
  type TripMapStatus,
} from "@/lib/map-download";

type Props = {
  itinerary: DayEntry[];
  online: boolean;
  /** Activa el uso sin conexión si hace falta: sin service worker el mapa no se usaría */
  ensureOffline: () => Promise<void>;
  onChange: () => void;
};

const NONE: MapLayers = { detail: false, wide: false, relief: false };
const mb = (bytes: number) => `${Math.round(bytes / 1e6)} MB`;

type Phase = { kind: "idle" } | { kind: "downloading"; progress: DownloadProgress } | { kind: "done"; failed: number; bytes: number; cancelled: boolean };

/** Descarga anticipada del mapa del viaje: la base siempre, las demás capas opcionales */
export default function MapDownload({ itinerary, online, ensureOffline, onChange }: Props) {
  const [layers, setLayers] = useState<MapLayers>(NONE);
  const [status, setStatus] = useState<TripMapStatus | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const abort = useRef<AbortController | null>(null);

  async function refresh() {
    const s = await tripMapStatus(itinerary);
    setStatus(s);
    // Lo ya descargado aparece marcado
    if (s.downloaded) setLayers((l) => ({ detail: l.detail || s.layers.detail, wide: l.wide || s.layers.wide, relief: l.relief || s.layers.relief }));
  }

  useEffect(() => {
    refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const estimate = estimateTripMap(itinerary, layers);
  const downloading = phase.kind === "downloading";

  async function download() {
    abort.current = new AbortController();
    setPhase({ kind: "downloading", progress: { done: 0, total: 0, failed: 0, bytes: 0 } });
    await ensureOffline();
    const result = await downloadTripMap(itinerary, {
      layers,
      signal: abort.current.signal,
      onProgress: (progress) => setPhase({ kind: "downloading", progress }),
    }).catch(() => ({ failed: 1, bytes: 0, cancelled: false }));
    setPhase({ kind: "done", failed: result.failed, bytes: result.bytes, cancelled: result.cancelled });
    await refresh();
    onChange();
  }

  async function remove() {
    await deleteTripMap();
    setLayers(NONE);
    setPhase({ kind: "idle" });
    await refresh();
    onChange();
  }

  const options: { key: keyof MapLayers; label: string; hint: string; size: string }[] = [
    { key: "detail", label: "Más zoom en cada lugar", hint: "Detalle máximo hasta 2 km de cada punto", size: `+${mb(estimate.detailBytes)}` },
    { key: "wide", label: "Alrededores de cada base", hint: "Zona de 35 km alrededor de cada hospedaje", size: `+${mb(estimate.wideBytes)}` },
    { key: "relief", label: "Relieve", hint: "Montañas sombreadas en las capas elegidas", size: `+${mb(estimate.reliefBytes)}` },
  ];

  return (
    <section aria-label="Mapa del viaje" className="mt-4 border-t border-line pt-4">
      <h3 className="text-sm font-bold">Mapa del viaje sin conexión</h3>
      <p className="mt-0.5 text-xs text-muted">
        {status?.downloaded ? "Descargado. Podés sumar capas: solo baja lo que falta." : "Bajalo con wifi antes de salir."}
      </p>

      <ul className="mt-3 flex flex-col gap-2">
        <li>
          <label className="flex items-start gap-2.5 text-sm">
            <input type="checkbox" checked disabled className="mt-0.5 size-4 accent-emerald-600" />
            <span className="flex-1">
              Mapa base <span className="text-xs text-muted">· ruta, bases y lugares</span>
              {status?.downloaded && <Downloaded />}
            </span>
            <span className="text-xs font-semibold tabular-nums text-muted">≈{mb(estimate.baseBytes)}</span>
          </label>
        </li>
        {options.map(({ key, label, hint, size }) => (
          <li key={key}>
            <label className="flex items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={layers[key]}
                disabled={downloading}
                onChange={(e) => setLayers((l) => ({ ...l, [key]: e.target.checked }))}
                className="mt-0.5 size-4 accent-emerald-600"
              />
              <span className="flex-1">
                {label}
                {status?.layers[key] && <Downloaded />}
                <span className="block text-xs text-muted">{hint}</span>
              </span>
              <span className="text-xs font-semibold tabular-nums text-muted">{size}</span>
            </label>
          </li>
        ))}
      </ul>

      {downloading ? (
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-emerald-500 transition-[width]"
              style={{ width: `${phase.progress.total ? (phase.progress.done / phase.progress.total) * 100 : 0}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-xs text-muted">
            <span className="tabular-nums">
              {phase.progress.total ? `${phase.progress.done} de ${phase.progress.total} · ${mb(phase.progress.bytes)}` : "Preparando…"}
            </span>
            <button type="button" onClick={() => abort.current?.abort()} className="font-semibold text-accent">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={!online}
          onClick={download}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-fg px-3 py-2.5 text-sm font-semibold text-bg transition-opacity disabled:opacity-40"
        >
          <Download className="size-4" aria-hidden />
          Descargar · ≈{mb(estimate.totalBytes)}
        </button>
      )}

      {phase.kind === "done" && (
        <p className="mt-2 text-xs text-muted">
          {phase.cancelled
            ? "Descarga cancelada. Lo bajado queda guardado."
            : phase.failed
              ? `Listo, pero faltaron ${phase.failed} partes: tocá Descargar para completar.`
              : `Listo: ${mb(phase.bytes)} descargados.`}
        </p>
      )}
      {!online && <p className="mt-2 text-xs text-amber-700">Necesitás conexión para descargar.</p>}

      {status?.downloaded && !downloading && (
        <button
          type="button"
          onClick={remove}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-accent"
        >
          <Trash2 className="size-3.5" aria-hidden />
          Borrar mapa descargado
        </button>
      )}
    </section>
  );
}

function Downloaded() {
  return (
    <span className="ml-1.5 inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-700">
      <Check className="size-3" aria-hidden />
      descargado
    </span>
  );
}
