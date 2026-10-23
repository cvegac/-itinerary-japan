"use client";

import type { LucideIcon } from "lucide-react";
import {
  BedDouble,
  Bike,
  Bus,
  CableCar,
  CarTaxiFront,
  Clock,
  Coins,
  Footprints,
  MapPin,
  MessageSquare,
  Moon,
  Plane,
  Ship,
  StickyNote,
  Sun,
  TrainFront,
  TramFront,
  Utensils,
} from "lucide-react";
import type { DayEntry } from "@/types/DayEntry";
import type { TransportSegment } from "@/types/TransportSegment";
import { categoryStyle } from "@/lib/categories";
import { poiLetter } from "@/lib/map-geo";

type Props = {
  day: DayEntry;
  dayNumber: number;
  /** Se tocó un lugar de la lista: el mapa vuela hasta él */
  onFocusPoi?: (index: number) => void;
};

const TRANSPORT_ICON: Record<string, LucideIcon> = {
  tren: TrainFront,
  metro: TramFront,
  monorriel: TramFront,
  tranvía: TramFront,
  bus: Bus,
  "bus-nocturno": Bus,
  "bus + funicular": CableCar,
  ferry: Ship,
  barco: Ship,
  teleférico: CableCar,
  caminar: Footprints,
  bicicleta: Bike,
  avión: Plane,
  taxi: CarTaxiFront,
};

export default function DayDetail({ day, dayNumber, onFocusPoi }: Props) {
  const longDate = new Date(day.date + "T12:00:00").toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const formatted = longDate.charAt(0).toUpperCase() + longDate.slice(1);
  const pois = day.pois ?? [];

  return (
    <article className="flex flex-col gap-5 pb-6">
      {/* Encabezado */}
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted">
          <span>Día {dayNumber}</span>
          <span aria-hidden>·</span>
          <span>{formatted}</span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold leading-tight text-balance">{day.label}</h2>
          <span className="shrink-0 rounded-full bg-accent/10 px-2.5 py-1 text-sm font-bold text-accent tabular-nums">
            {day.budget}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${categoryStyle(day.category).chip}`}>
            {day.category}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium">
            <MapPin className="size-3.5 text-muted" aria-hidden />
            {day.location}
          </span>
          {day.isTransit && (
            <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
              En tránsito
            </span>
          )}
          {day.nightBus && (
            <span className="rounded-full bg-orange-500/15 px-2.5 py-1 text-xs font-semibold text-orange-700 dark:text-orange-300">
              Bus nocturno {day.nightBus} esta noche
            </span>
          )}
        </div>
      </header>

      {/* Notas */}
      {day.notes && (
        <div className="flex gap-3 rounded-2xl bg-amber-500/10 p-3.5 text-sm leading-relaxed">
          <StickyNote className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <p>{day.notes}</p>
        </div>
      )}

      {/* Lugares del día (los mismos puntos del mapa) */}
      {pois.length > 0 && (
        <Section title="Lugares">
          <ul aria-label="Lugares del día" className="flex flex-col gap-1.5">
            {pois.map((poi, i) => (
              <li key={poi.name}>
                <button
                  type="button"
                  onClick={() => onFocusPoi?.(i)}
                  className="flex w-full items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-line active:scale-[0.99]"
                >
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      poi.night ? "bg-slate-800 text-amber-200" : "bg-fg text-bg"
                    }`}
                  >
                    {poiLetter(i)}
                  </span>
                  <span className="flex-1 font-medium">{poi.name}</span>
                  {poi.night ? (
                    <Moon className="size-4 text-muted" aria-label="De noche" />
                  ) : (
                    <Sun className="size-4 text-muted" aria-label="De día" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Transporte */}
      {day.transport.length > 0 && (
        <Section title="Cómo moverse">
          <TransportTimeline segments={day.transport} />
        </Section>
      )}

      {/* Actividades */}
      <div className="grid gap-3 sm:grid-cols-2">
        <ActivityList title="De día" icon={Sun} items={day.activitiesDay} tone="amber" />
        <ActivityList title="De noche" icon={Moon} items={day.activitiesNight} tone="indigo" />
      </div>

      {/* Hospedaje y comida */}
      <div className="grid gap-3 sm:grid-cols-2">
        {!day.isTransit && (
          <InfoCard icon={BedDouble} label="Dormís en" value={day.accommodation} detail={day.zona} />
        )}
        {day.food && <InfoCard icon={Utensils} label="Para comer" value={day.food} />}
      </div>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-bold uppercase tracking-wide text-muted">{title}</h3>
      {children}
    </section>
  );
}

function TransportTimeline({ segments }: { segments: TransportSegment[] }) {
  return (
    <ol aria-label="Tramos de transporte" className="relative flex flex-col gap-3 pl-1">
      {segments.map((seg, i) => {
        const Icon = TRANSPORT_ICON[seg.mode] ?? TrainFront;
        const last = i === segments.length - 1;
        return (
          <li key={i} className="relative flex gap-3">
            {!last && <span className="absolute left-[15px] top-8 bottom-[-12px] w-px bg-line" aria-hidden />}
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-2">
              <Icon className="size-4" aria-label={seg.mode} />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-center gap-x-1.5 text-sm font-semibold">
                <span>{seg.from}</span>
                <span className="text-muted" aria-hidden>→</span>
                <span>{seg.to}</span>
              </div>
              {seg.line && <div className="text-xs text-muted">{seg.line}</div>}
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                {seg.duration && (
                  <span className="inline-flex items-center gap-1 text-muted">
                    <Clock className="size-3.5" aria-hidden />
                    {seg.duration}
                  </span>
                )}
                {seg.cost && (
                  <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
                    <Coins className="size-3.5" aria-hidden />
                    {seg.cost}
                  </span>
                )}
              </div>
              {seg.note && (
                <div className="mt-1 flex gap-1 text-xs text-amber-700 dark:text-amber-400">
                  <MessageSquare className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  <span>{seg.note}</span>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function ActivityList({
  title,
  icon: Icon,
  items,
  tone,
}: {
  title: string;
  icon: LucideIcon;
  items: string[];
  tone: "amber" | "indigo";
}) {
  if (items.length === 0) return null;
  const accent = tone === "amber" ? "text-amber-600 dark:text-amber-400" : "text-indigo-600 dark:text-indigo-400";
  const dot = tone === "amber" ? "bg-amber-400" : "bg-indigo-400";
  return (
    <section className="rounded-2xl border border-line p-3.5">
      <h3 className={`mb-2 flex items-center gap-1.5 text-sm font-bold ${accent}`}>
        <Icon className="size-4" aria-hidden />
        {title}
      </h3>
      <ul className="flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-snug">
            <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${dot}`} aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl bg-surface-2 p-3.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
      <div className="min-w-0">
        <div className="text-xs font-medium text-muted">{label}</div>
        <div className="text-sm font-semibold leading-snug">{value}</div>
        {detail && <div className="mt-0.5 text-xs text-muted">{detail}</div>}
      </div>
    </div>
  );
}
