"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Cloud, CloudCheck, CloudOff, X } from "lucide-react";
import {
  disableOffline,
  enableOffline,
  isOfflineEnabled,
  isOfflineSupported,
  storageUsage,
} from "@/lib/offline";

type Status = "checking" | "off" | "saving" | "on" | "error" | "unsupported";

function useOnline(): boolean {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("online", cb);
      window.addEventListener("offline", cb);
      return () => {
        window.removeEventListener("online", cb);
        window.removeEventListener("offline", cb);
      };
    },
    () => navigator.onLine,
    () => true
  );
}

function formatMB(bytes: number): string {
  return (bytes / 1e6).toLocaleString("es-AR", { maximumFractionDigits: 1 }) + " MB";
}

/** Botón de la barra superior + panel para activar el uso sin conexión */
export default function OfflineControl() {
  const online = useOnline();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("checking");
  const [usage, setUsage] = useState<number | null>(null);

  // Estado inicial; si ya estaba activado y hay red, se actualiza a la última versión publicada
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isOfflineSupported()) return setStatus("unsupported");
      const enabled = await isOfflineEnabled();
      if (cancelled) return;
      setStatus(enabled ? "on" : "off");
      if (enabled) {
        if (navigator.onLine) await enableOffline().catch(() => {});
        if (!cancelled) setUsage(await storageUsage());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle() {
    if (status === "on") {
      setStatus("saving");
      await disableOffline();
      setUsage(null);
      setStatus("off");
      return;
    }
    setStatus("saving");
    try {
      await enableOffline();
      setUsage(await storageUsage());
      setStatus("on");
    } catch {
      setStatus("error");
    }
  }

  const Icon = !online ? CloudOff : status === "on" ? CloudCheck : Cloud;
  const iconColor = !online ? "text-amber-600" : status === "on" ? "text-emerald-600" : "text-muted";

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label="Uso sin conexión"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="relative flex size-9 items-center justify-center rounded-xl transition-colors hover:bg-surface-2"
      >
        <Icon className={`size-5 ${iconColor}`} aria-hidden />
        {!online && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-amber-500" />}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Cerrar"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-label="Uso sin conexión"
            className="absolute right-0 top-full z-50 mt-3 w-72 rounded-2xl border border-line bg-surface p-4 text-left shadow-xl"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold">Usar sin conexión</h2>
                {!online && <p className="text-xs font-semibold text-amber-700">Ahora estás sin conexión</p>}
              </div>
              <button
                type="button"
                aria-label="Cerrar panel"
                onClick={() => setOpen(false)}
                className="-m-1 rounded-lg p-1 text-muted hover:bg-surface-2"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm">Guardar la app en este celular</span>
              <button
                type="button"
                role="switch"
                aria-label="Usar sin conexión"
                aria-checked={status === "on"}
                disabled={status === "checking" || status === "saving" || status === "unsupported" || (!online && status !== "on")}
                onClick={toggle}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                  status === "on" ? "bg-emerald-500" : "bg-line"
                }`}
              >
                <span
                  className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${
                    status === "on" ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-muted">
              {status === "checking" && "Revisando…"}
              {status === "off" && "Desactivado: no se guarda nada en este celular."}
              {status === "saving" && "Un momento…"}
              {status === "on" &&
                `Activado${usage ? ` · ${formatMB(usage)} guardados` : ""}. La app y el itinerario abren sin internet; el mapa muestra las zonas que ya miraste. Al desactivarlo se borra todo.`}
              {status === "error" && "No se pudo guardar. Probá de nuevo con conexión."}
              {status === "unsupported" && "Este navegador no permite usar la app sin conexión."}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
