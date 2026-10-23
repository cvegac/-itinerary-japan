"use client";

import type { LucideIcon } from "lucide-react";
import { BedDouble, Bus, CalendarDays, Wallet } from "lucide-react";

export type View = "itinerary" | "costs" | "lodging" | "buses";

type Props = {
  view: View;
  onChange: (view: View) => void;
  costTotal: number;
  lodgingNights: number;
  showBuses: boolean;
  /** "bottom": barra inferior del celular; "inline": pestañas del panel lateral */
  variant: "bottom" | "inline";
};

export default function ViewTabs({ view, onChange, costTotal, lodgingNights, showBuses, variant }: Props) {
  const tabs: { id: View; label: string; icon: LucideIcon; hint: string }[] = [
    { id: "itinerary", label: "Itinerario", icon: CalendarDays, hint: "" },
    { id: "costs", label: "Costos", icon: Wallet, hint: `~$${costTotal} USD` },
    { id: "lodging", label: "Hospedaje", icon: BedDouble, hint: `${lodgingNights} noches` },
    ...(showBuses ? [{ id: "buses" as const, label: "Buses", icon: Bus, hint: "" }] : []),
  ];

  if (variant === "bottom") {
    return (
      <nav
        role="tablist"
        aria-label="Secciones del viaje"
        className="absolute inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
      >
        {tabs.map(({ id, label, icon: Icon }) => {
          const active = view === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(id)}
              className={`flex h-16 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors ${
                active ? "text-accent" : "text-muted"
              }`}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </button>
          );
        })}
      </nav>
    );
  }

  return (
    <nav role="tablist" aria-label="Secciones del viaje" className="flex flex-wrap gap-1 px-3 pb-3">
      {tabs.map(({ id, label, icon: Icon, hint }) => {
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
          </button>
        );
      })}
    </nav>
  );
}
