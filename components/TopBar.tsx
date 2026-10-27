"use client";

import Link from "next/link";
import { ArrowLeft, LocateFixed, Search } from "lucide-react";
import type { TripMeta } from "@/types/Trip";
import type { DayEntry } from "@/types/DayEntry";
import type { TripStatus } from "@/lib/trip-time";
import OfflineControl from "@/components/OfflineControl";
import AccountControl from "@/components/AccountControl";

type Props = {
  meta: TripMeta;
  /** Para descargar el mapa del viaje */
  itinerary?: DayEntry[];
  status: TripStatus | null;
  onToday: () => void;
  /** Abre la búsqueda en todos los días */
  onSearch?: () => void;
  /** En el celular flota sobre el mapa */
  floating?: boolean;
};

export default function TopBar({ meta, itinerary, status, onToday, onSearch, floating = false }: Props) {
  return (
    <header
      className={
        floating
          ? "absolute inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-30 flex items-center gap-2 rounded-2xl border border-line bg-surface/90 px-2 py-2 shadow-lg backdrop-blur-md"
          : "flex items-center gap-2 px-3 py-3"
      }
    >
      <Link
        href="/"
        aria-label="Volver a mis viajes"
        className="flex size-9 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-fg"
      >
        <ArrowLeft className="size-5" />
      </Link>
      <span className="text-2xl leading-none" aria-hidden>
        {meta.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-bold leading-tight">{meta.title}</h1>
        <p className="truncate text-xs text-muted">{meta.subtitle}</p>
      </div>
      {status?.kind === "during" && (
        <button
          type="button"
          onClick={onToday}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-accent-fg shadow-sm active:scale-95"
        >
          <LocateFixed className="size-4" aria-hidden />
          Hoy
        </button>
      )}
      {status?.kind === "before" && (
        <span className="shrink-0 rounded-full bg-surface-2 px-3 py-1.5 text-xs font-semibold text-muted">
          {status.daysUntil === 1 ? "Mañana empieza" : `Faltan ${status.daysUntil} días`}
        </span>
      )}
      {onSearch && (
        <button
          type="button"
          aria-label="Buscar en el viaje"
          onClick={onSearch}
          className="flex size-9 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <Search className="size-5" />
        </button>
      )}
      <OfflineControl itinerary={itinerary} />
      <AccountControl />
    </header>
  );
}
