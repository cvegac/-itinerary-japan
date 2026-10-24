"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  BedDouble,
  Bike,
  Bus,
  CableCar,
  CarTaxiFront,
  Clock,
  Coins,
  CreditCard,
  Footprints,
  MapPin,
  MessageSquare,
  Moon,
  Phone,
  Plus,
  Plane,
  Ship,
  StickyNote,
  Sun,
  Sunrise,
  Sunset,
  TrainFront,
  TramFront,
  Utensils,
  Wallet,
  X,
} from "lucide-react";
import type { Activity, DayEntry } from "@/types/DayEntry";
import type { TransportSegment } from "@/types/TransportSegment";
import { categoryStyle } from "@/lib/categories";
import { poiLetter } from "@/lib/map-geo";
import { poiIcon } from "@/lib/poi-icons";
import { sunTimes } from "@/lib/sun";
import { expenseUsd, type Expense, type Withdrawal } from "@/lib/expenses";
import { formatMoney } from "@/lib/money";
import { formatCost, formatPrice } from "@/lib/cost";
import ExpenseModal from "@/components/ExpenseModal";
import { localISODate } from "@/lib/trip-time";
import { useForecast, weatherLabel } from "@/lib/weather";
import { orderedPois, poiSignature, type DayRoutes, type Leg } from "@/lib/route-plan";

type Props = {
  day: DayEntry;
  dayNumber: number;
  /** Se tocó un lugar de la lista (índice original): el mapa vuela hasta él */
  onFocusPoi?: (index: number) => void;
  /** Rutas precalculadas del día: orden de visita y cómo moverse */
  routes?: DayRoutes;
  /** En los días de traslado: el día anterior, cuya cama es donde amanecés */
  morningLodging?: DayEntry | null;
  /** Hoy es la primera noche en este hospedaje (por defecto: si cambia la cama) */
  arriving?: boolean;
  /** Gastos reales del día; sin onAddExpense no se muestra la sección */
  expenses?: Expense[];
  onAddExpense?: (expense: Omit<Expense, "id" | "createdAt">) => void;
  onAddWithdrawal?: (withdrawal: Omit<Withdrawal, "id" | "createdAt">) => void;
  onRemoveExpense?: (id: string) => void;
};


/** "KUMANO家-OHGi- (individual con tatami…)" → "KUMANO家-OHGi-" */
const shortName = (accommodation: string) => accommodation.split(" (")[0];

/** "+81 3-3831-8666" → "tel:+81338318666" */
const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

function formatDuration(seconds: number): string {
  const min = Math.max(1, Math.round(seconds / 60));
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")} min`;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toLocaleString("es-AR", { maximumFractionDigits: 1 })} km`;
}

function legText(leg: Leg): string {
  if (leg.mode === "transit") return `Tren o bus · ~${formatDistance(leg.distanceM)}`;
  const how = leg.mode === "bike" ? "en bici" : "a pie";
  return `${formatDuration(leg.durationS)} ${how} · ${formatDistance(leg.distanceM)}`;
}

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

export default function DayDetail({
  day,
  dayNumber,
  onFocusPoi,
  routes,
  morningLodging,
  arriving,
  expenses = [],
  onAddExpense,
  onAddWithdrawal,
  onRemoveExpense,
}: Props) {
  const longDate = new Date(day.date + "T12:00:00").toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const formatted = longDate.charAt(0).toUpperCase() + longDate.slice(1);
  const pois = orderedPois(day, routes);
  // Las rutas valen solo si los lugares del día no cambiaron desde que se calcularon
  // El sol, en el centro de los lugares del día (o en el hospedaje si no hay)
  const sunPlace: [number, number] = day.pois?.length
    ? [
        day.pois.reduce((s, p) => s + p.coords[0], 0) / day.pois.length,
        day.pois.reduce((s, p) => s + p.coords[1], 0) / day.pois.length,
      ]
    : day.accommodationCoords;
  const sun = sunTimes(day.date, sunPlace);
  // "Hoy" sale del reloj del dispositivo: se calcula después de montar
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(localISODate(new Date())), []);
  const forecast = useForecast(day.date, sunPlace, today);
  const weather = forecast && weatherLabel(forecast.code);
  const checkOutPrev = morningLodging?.checkOut;
  const checkInToday = (arriving ?? !!morningLodging) && !day.isTransit ? day.checkIn : undefined;
  const validRoutes = routes && routes.signature === poiSignature(day) ? routes : undefined;
  const legTo = new Map(validRoutes?.legs.map((l) => [l.to, l]) ?? []);
  const reordered = validRoutes?.order.some((v, i) => v !== i) ?? false;
  const savedMin =
    validRoutes?.originalCostS && validRoutes.bestCostS
      ? Math.round((validRoutes.originalCostS - validRoutes.bestCostS) / 60)
      : 0;

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
            <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-700">
              En tránsito
            </span>
          )}
          {day.nightBus && (
            <span className="rounded-full bg-orange-500/15 px-2.5 py-1 text-xs font-semibold text-orange-700">
              Bus nocturno {day.nightBus} esta noche
            </span>
          )}
          {/* Las horas son de Japón: en los días de vuelo afuera no tienen sentido */}
          {!day.enRoute && (
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium tabular-nums">
              <Sunrise className="size-3.5 text-amber-600" aria-hidden />
              <span aria-label="Amanecer">{sun.sunrise}</span>
              <Sunset className="ml-1 size-3.5 text-indigo-600" aria-hidden />
              <span aria-label="Atardecer">{sun.sunset}</span>
            </span>
          )}
          {forecast && weather && (
            <span
              aria-label={`Pronóstico: ${weather.text}`}
              title={weather.text}
              className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2.5 py-1 text-xs font-medium tabular-nums text-sky-800"
            >
              <span aria-hidden>{weather.icon}</span>
              {forecast.min}–{forecast.max} °C
              {forecast.rain !== null && <span className="ml-1">💧 {forecast.rain} %</span>}
            </span>
          )}
        </div>
        {day.hike && (
          <p className="text-xs font-medium text-amber-700">
            Oscurece a las {sun.sunset}: calculá terminar el sendero antes.
          </p>
        )}
      </header>

      {/* Horarios del hospedaje: check-out del de anoche y check-in del de hoy */}
      {(checkOutPrev || checkInToday) && (
        <div
          role="note"
          aria-label="Horarios de hoy"
          className="flex gap-3 rounded-2xl border border-accent/30 bg-accent/5 p-3.5 text-sm"
        >
          <Clock className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
          <div className="flex flex-col gap-0.5">
            {checkOutPrev && <p>Check-out de {shortName(morningLodging!.accommodation)}: <b>{checkOutPrev}</b></p>}
            {checkInToday && <p>Check-in en {shortName(day.accommodation)}: <b>{checkInToday}</b></p>}
          </div>
        </div>
      )}

      {/* Notas */}
      {day.notes && (
        <div className="flex gap-3 rounded-2xl bg-amber-500/10 p-3.5 text-sm leading-relaxed">
          <StickyNote className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
          <p>{day.notes}</p>
        </div>
      )}

      {/* Lugares del día (los mismos puntos del mapa) */}
      {pois.length > 0 && (
        <Section title={validRoutes ? "Lugares, en orden de visita" : "Lugares"}>
          {reordered && savedMin > 0 && (
            <p className="-mt-1 text-xs font-medium text-emerald-700">
              Orden optimizado: ahorra {savedMin} min de traslados respecto del plan original
            </p>
          )}
          {validRoutes && day.hike && (
            <p className="-mt-1 text-xs text-amber-700">
              Tiempos a ritmo de llano: en las subidas del sendero calculá bastante más.
            </p>
          )}
          <ul aria-label="Lugares del día" className="flex flex-col gap-1.5">
            {pois.map(({ poi, index }, position) => {
              const leg = legTo.get(index);
              const lodging = validRoutes?.fromLodging[index];
              return (
              <li key={poi.name}>
                <button
                  type="button"
                  onClick={() => onFocusPoi?.(index)}
                  className="flex w-full items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-line active:scale-[0.99]"
                >
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      poi.night ? "bg-slate-800 text-amber-200" : "bg-fg text-bg"
                    }`}
                  >
                    {poiLetter(position)}
                  </span>
                  <span className="shrink-0 text-lg leading-none" aria-hidden>
                    {poiIcon(poi)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{poi.name}</span>
                    {leg && (
                      <span className="block text-xs text-muted">
                        {leg.from === "lodging" ? "Desde el hospedaje: " : ""}
                        {legText(leg)}
                      </span>
                    )}
                    {lodging && leg?.from !== "lodging" && (
                      <span className="block text-xs text-muted">
                        Desde el hospedaje: {formatDuration(lodging.durationS)} a pie
                      </span>
                    )}
                  </span>
                  {poi.night ? (
                    <Moon className="size-4 text-muted" aria-label="De noche" />
                  ) : (
                    <Sun className="size-4 text-muted" aria-label="De día" />
                  )}
                </button>
              </li>
              );
            })}
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
        {morningLodging && (
          <InfoCard
            icon={Sunrise}
            label="Amanecés en"
            value={morningLodging.accommodation}
            detail={morningLodging.lodgingPlace ?? morningLodging.zona}
          />
        )}
        {!day.isTransit && (
          <InfoCard icon={BedDouble} label="Dormís en" value={day.accommodation} detail={day.zona} />
        )}
        {day.food && <InfoCard icon={Utensils} label="Para comer" value={day.food} />}
      </div>

      {onAddExpense && (
        <DayExpenses
          date={day.date}
          label={`${formatted} · ${day.label}`}
          budget={day.budget}
          expenses={expenses}
          onAdd={onAddExpense}
          onAddWithdrawal={(w) => onAddWithdrawal?.(w)}
          onRemove={(id) => onRemoveExpense?.(id)}
        />
      )}

      {/* Para mostrarle al taxista (o a quien le preguntes) cómo llegar */}
      {!day.isTransit && day.lodgingJa && (
        <section
          aria-label="Mostrar al taxista"
          className="rounded-2xl border-2 border-dashed border-line bg-surface p-4"
        >
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted">
            <CarTaxiFront className="size-4" aria-hidden />
            Mostrar al taxista
          </div>
          <p lang="ja" className="text-lg font-bold leading-snug">
            {day.lodgingJa.name}
          </p>
          <p lang="ja" className="mt-1 text-lg leading-snug">
            {day.lodgingJa.address}
          </p>
          {day.lodgingJa.phone && (
            <a
              href={telHref(day.lodgingJa.phone)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-sm font-semibold"
            >
              <Phone className="size-4" aria-hidden />
              {day.lodgingJa.phone}
            </a>
          )}
        </section>
      )}
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
                  <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                    <Coins className="size-3.5" aria-hidden />
                    {formatCost(seg.cost)}
                  </span>
                )}
              </div>
              {seg.note && (
                <div className="mt-1 flex gap-1 text-xs text-amber-700">
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
  items: Activity[];
  tone: "amber" | "indigo";
}) {
  if (items.length === 0) return null;
  const accent = tone === "amber" ? "text-amber-600" : "text-indigo-600";
  const dot = tone === "amber" ? "bg-amber-400" : "bg-indigo-400";
  return (
    <section className="rounded-2xl border border-line p-3.5">
      <h3 className={`mb-2 flex items-center gap-1.5 text-sm font-bold ${accent}`}>
        <Icon className="size-4" aria-hidden />
        {title}
      </h3>
      <ul className="flex flex-col gap-1.5">
        {items.map((item) => {
          const { text, price } = typeof item === "string" ? { text: item, price: undefined } : item;
          return (
            <li key={text} className="flex gap-2 text-sm leading-snug">
              <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${dot}`} aria-hidden />
              <span>
                {text}
                {price && (
                  <span className="ml-1.5 whitespace-nowrap text-xs font-semibold text-emerald-700">
                    {formatPrice(price)}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Lo gastado de verdad en el día, en su moneda, contra el presupuesto */
function DayExpenses({
  date,
  label,
  budget,
  expenses,
  onAdd,
  onAddWithdrawal,
  onRemove,
}: {
  date: string;
  label: string;
  budget: string;
  expenses: Expense[];
  onAdd: (expense: Omit<Expense, "id" | "createdAt">) => void;
  onAddWithdrawal: (withdrawal: Omit<Withdrawal, "id" | "createdAt">) => void;
  onRemove: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const totalUsd = Math.round(expenses.reduce((sum, e) => sum + expenseUsd(e), 0));
  const over = totalUsd > Number(budget.replace(/[^\d]/g, ""));

  return (
    <section aria-label="Gastos del día" className="flex flex-col gap-2.5 rounded-2xl bg-surface-2 p-3.5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-bold">
          <Wallet className="size-4 text-muted" aria-hidden />
          Gastos del día
        </h3>
        {expenses.length > 0 && (
          <span className={`text-xs font-semibold tabular-nums ${over ? "text-red-700" : "text-emerald-700"}`}>
            Gastaste ≈US${totalUsd} de {budget}
          </span>
        )}
      </div>
      {expenses.length > 0 && (
        <ul className="flex flex-col gap-1">
          {expenses.map((e) => (
            <li key={e.id} className="flex items-center gap-2 text-sm">
              {e.method === "cash" ? (
                <Banknote className="size-4 shrink-0 text-emerald-600" aria-label="Pagado en efectivo" />
              ) : (
                <CreditCard className="size-4 shrink-0 text-sky-600" aria-label="Pagado con tarjeta" />
              )}
              <span className="w-24 shrink-0 font-semibold tabular-nums">{formatMoney(e.amount, e.currency)}</span>
              <span className="min-w-0 flex-1 truncate text-muted">{e.note}</span>
              <button
                type="button"
                aria-label={`Quitar gasto ${e.note || formatMoney(e.amount, e.currency)}`}
                onClick={() => onRemove(e.id)}
                className="rounded-lg p-1 text-muted hover:bg-line"
              >
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 self-start rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-accent-fg"
      >
        <Plus className="size-4" aria-hidden />
        Registrar
      </button>
      {open && (
        <ExpenseModal
          dates={[{ date, label }]}
          defaultDate={date}
          onClose={() => setOpen(false)}
          onSaveExpense={onAdd}
          onSaveWithdrawal={onAddWithdrawal}
        />
      )}
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
