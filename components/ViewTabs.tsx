"use client";

import type { LucideIcon } from "lucide-react";
import { BedDouble, Bus, CalendarDays, ListChecks, Map as MapIcon, Wallet } from "lucide-react";

/** "itinerary" es el itinerario sobre el mapa; "agenda", el mismo día por día */
export type View = "itinerary" | "agenda" | "costs" | "lodging" | "buses" | "notes";

type Props = {
  view: View;
  onChange: (view: View) => void;
  costTotal: number;
  lodgingNights: number;
  showBuses: boolean;
  /** Cantidad de tareas; sin notas no se muestra la pestaña */
  taskCount?: number;
  /** Notas nuevas del viaje compartido: se ven en la pestaña de la agenda */
  agendaBadge?: number;
  /** "bottom": barra inferior del celular; "inline": pestañas del panel lateral */
  variant: "bottom" | "inline";
};

export default function ViewTabs({ view, onChange, costTotal, lodgingNights, showBuses, taskCount, agendaBadge = 0, variant }: Props) {
  const tabs: { id: View; label: string; icon: LucideIcon; hint: string; badge?: number }[] = [
    { id: "itinerary", label: "Mapa", icon: MapIcon, hint: "" },
    { id: "agenda", label: "Agenda", icon: CalendarDays, hint: "", badge: agendaBadge },
    { id: "costs", label: "Costos", icon: Wallet, hint: `~$${costTotal} USD` },
    { id: "lodging", label: "Hospedaje", icon: BedDouble, hint: `${lodgingNights} noches` },
    ...(showBuses ? [{ id: "buses" as const, label: "Buses", icon: Bus, hint: "" }] : []),
    ...(taskCount !== undefined ? [{ id: "notes" as const, label: "Notas", icon: ListChecks, hint: `${taskCount} tareas` }] : []),
  ];

  if (variant === "bottom") {
    return (
      <nav
        role="tablist"
        aria-label="Secciones del viaje"
        className="absolute inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
      >
        {tabs.map(({ id, label, icon: Icon, badge }) => {
          const active = view === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(id)}
              className={`relative flex h-16 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors ${
                active ? "text-accent" : "text-muted"
              }`}
            >
              <Icon className="size-5" aria-hidden />
              {label}
              {!!badge && <Badge count={badge} className="absolute left-1/2 top-2 ml-1.5" />}
            </button>
          );
        })}
      </nav>
    );
  }

  return (
    <nav role="tablist" aria-label="Secciones del viaje" className="flex flex-wrap gap-1 px-3 pb-3">
      {tabs.map(({ id, label, icon: Icon, hint, badge }) => {
        const active = view === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            title={hint || undefined}
            onClick={() => onChange(id)}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
              active ? "bg-fg text-bg" : "text-muted hover:bg-surface-2 hover:text-fg"
            }`}
          >
            <Icon className="size-4" aria-hidden />
            {label}
            {!!badge && <Badge count={badge} />}
          </button>
        );
      })}
    </nav>
  );
}

function Badge({ count, className = "" }: { count: number; className?: string }) {
  return (
    <span
      aria-label={count === 1 ? "1 nota nueva" : `${count} notas nuevas`}
      className={`min-w-4 rounded-full bg-red-600 px-1 text-center text-[10px] font-bold leading-4 text-white ${className}`}
    >
      {count}
    </span>
  );
}
