"use client";

import { Suspense, lazy, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import type { DayEntry } from "@/types/DayEntry";
import type { TripData } from "@/types/Trip";
import { computeCostSummary, computeLodgingSummary } from "@/lib/itinerary-utils";
import { adjacentDay, localISODate, tripStatus, type Snap, type TripStatus } from "@/lib/trip-time";
import { hasBed, morningLodging } from "@/lib/map-geo";
import { useExpenses, useWithdrawals } from "@/lib/expenses";
import type { MapMode } from "@/components/TripMap";
import TopBar from "@/components/TopBar";
import ViewTabs, { type View } from "@/components/ViewTabs";
import DayStrip from "@/components/DayStrip";
import DayDetail from "@/components/DayDetail";
import BottomSheet from "@/components/BottomSheet";
import MapModeControl from "@/components/MapModeControl";
import CostSummaryView from "@/components/CostSummaryView";
import LodgingSummaryView from "@/components/LodgingSummaryView";
import BusSummaryView from "@/components/BusSummaryView";
import NotesView from "@/components/NotesView";

const TripMap = lazy(() => import("@/components/TripMap"));

// MapLibre pesa ~1 MB: que baje en paralelo con el arranque de la app, no recién
// cuando se monta el mapa (eran ~3,5 s de espera extra en 4G lenta)
if (typeof window !== "undefined" && process.env.NODE_ENV !== "test") {
  void import("@/components/TripMap");
  void import("maplibre-gl");
}

type Props = { tripData: TripData };

const NAV_HEIGHT = 64;
const TOP_INSET = 76; // barra superior flotante
const SWIPE_MIN_PX = 70;

// ── Hooks de pantalla (en el servidor y en los tests: celular) ─────────────
function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query).matches : false),
    () => false
  );
}

function useViewportHeight(): number {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("resize", cb);
      return () => window.removeEventListener("resize", cb);
    },
    () => window.innerHeight,
    () => 800
  );
}

export default function TripApp({ tripData }: Props) {
  const { meta, itinerary, nightBusSummary, routes, notes } = tripData;
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const vh = useViewportHeight();

  const [selectedDay, setSelectedDay] = useState<DayEntry | null>(itinerary[0] ?? null);
  const [view, setView] = useState<View>("itinerary");
  // Gastos y retiros: en el dispositivo y, con sesión, sincronizados
  const expenses = useExpenses(meta.slug);
  const withdrawals = useWithdrawals(meta.slug);
  const [mapMode, setMapMode] = useState<MapMode>("day");
  const [snap, setSnap] = useState<Snap>("half");
  const [focusedPoi, setFocusedPoi] = useState<{ index: number; nonce: number } | null>(null);
  const [status, setStatus] = useState<TripStatus | null>(null);
  const [mapFullscreen, setMapFullscreen] = useState(false);

  // Pantalla completa del mapa: entra con una entrada en el historial, así el
  // botón atrás del celular sale de la pantalla completa y no de la app
  useEffect(() => {
    const onPop = () => setMapFullscreen(false);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  function enterFullscreen() {
    window.history.pushState({ mapFullscreen: true }, "");
    setMapFullscreen(true);
  }
  function exitFullscreen() {
    if (window.history.state?.mapFullscreen) window.history.back();
    else setMapFullscreen(false);
  }

  // "Hoy" depende del reloj del dispositivo: se calcula después de montar para
  // que el HTML estático (generado al compilar) no difiera del primer render
  useEffect(() => {
    const s = tripStatus(itinerary, localISODate(new Date()));
    setStatus(s);
    // Antes del viaje queda en el primer día; durante, en el de hoy; después, en el último
    if (s.kind === "during") setSelectedDay(itinerary[s.index]);
    else if (s.kind === "after") setSelectedDay(itinerary[itinerary.length - 1] ?? null);
  }, [itinerary]);

  const costTotal = computeCostSummary(itinerary, meta.startDate).total;
  const lodgingNights = computeLodgingSummary(itinerary).reduce((sum, s) => sum + s.nights, 0);
  const dayNumber = selectedDay ? itinerary.indexOf(selectedDay) + 1 : 0;
  const dayRoutes = selectedDay ? routes?.[selectedDay.date] : undefined;
  // Primera noche en un hospedaje: el día 1 o cuando cambia la cama
  const morning = selectedDay ? morningLodging(itinerary, selectedDay) : null;
  const prevDay = dayNumber > 1 ? itinerary[dayNumber - 2] : undefined;
  const arriving = !!selectedDay && hasBed(selectedDay) && (!prevDay || !hasBed(prevDay) || !!morning);

  function selectDay(day: DayEntry) {
    setSelectedDay(day);
    setFocusedPoi(null);
    setMapMode("day");
  }

  function goToday() {
    if (status?.kind === "during") selectDay(itinerary[status.index]);
    setView("itinerary");
  }

  function step(dir: 1 | -1) {
    if (!selectedDay) return;
    const next = adjacentDay(itinerary, selectedDay.date, dir);
    if (next) selectDay(next);
  }

  function openFromSummary(day: DayEntry) {
    selectDay(day);
    setView("itinerary");
  }

  // Deslizar el detalle a los costados cambia de día
  const swipe = useRef<{ x: number; y: number } | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    swipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  function onTouchEnd(e: React.TouchEvent) {
    const start = swipe.current;
    swipe.current = null;
    if (!start) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) > SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
  }

  // Alturas de la hoja y margen del mapa para que nada quede tapado
  const sheetHeights: Record<Snap, number> = {
    peek: 196,
    half: Math.round(vh * 0.5),
    full: vh - TOP_INSET - NAV_HEIGHT - 8,
  };
  const mapPadding = mapFullscreen
    ? { top: 80, bottom: 32, left: 32, right: 64 }
    : isDesktop
    ? { top: 72, bottom: 48, left: 48, right: 64 }
    : view === "itinerary"
      ? { top: TOP_INSET + 72, bottom: sheetHeights[snap] + NAV_HEIGHT + 24, left: 32, right: 56 }
      : { top: TOP_INSET, bottom: NAV_HEIGHT, left: 32, right: 32 };

  const stepButtons = (
    <div className="flex shrink-0 gap-1">
      <IconButton label="Día anterior" disabled={dayNumber <= 1} onClick={() => step(-1)}>
        <ChevronLeft className="size-5" />
      </IconButton>
      <IconButton label="Día siguiente" disabled={dayNumber >= itinerary.length} onClick={() => step(1)}>
        <ChevronRight className="size-5" />
      </IconButton>
    </div>
  );

  const strip = (
    <DayStrip
      itinerary={itinerary}
      startDate={meta.startDate}
      selectedDate={selectedDay?.date ?? null}
      onSelect={selectDay}
    />
  );

  const detail = selectedDay && (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <DayDetail
        day={selectedDay}
        dayNumber={dayNumber}
        routes={dayRoutes}
        morningLodging={morning}
        arriving={arriving}
        expenses={expenses.records.filter((e) => e.date === selectedDay.date)}
        onAddExpense={expenses.add}
        onAddWithdrawal={withdrawals.add}
        onRemoveExpense={expenses.remove}
        onFocusPoi={(index) => {
          setMapMode("day");
          setFocusedPoi({ index, nonce: Date.now() });
          if (!isDesktop) setSnap("peek");
        }}
      />
    </div>
  );

  const summaryPage =
    view === "costs" ? (
      <CostSummaryView
        slug={meta.slug}
        itinerary={itinerary}
        startDate={meta.startDate}
        onDaySelect={openFromSummary}
        defaultDate={selectedDay?.date ?? meta.startDate}
        expenses={expenses.records}
        withdrawals={withdrawals.records}
        onAddExpense={expenses.add}
        onAddWithdrawal={withdrawals.add}
        onRemoveExpense={expenses.remove}
        onRemoveWithdrawal={withdrawals.remove}
      />
    ) : view === "lodging" ? (
      <LodgingSummaryView itinerary={itinerary} onDaySelect={openFromSummary} />
    ) : view === "buses" && nightBusSummary ? (
      <BusSummaryView nightBusSummary={nightBusSummary} onClose={() => setView("itinerary")} />
    ) : view === "notes" && notes ? (
      <NotesView notes={notes} itinerary={itinerary} slug={meta.slug} onDaySelect={openFromSummary} />
    ) : null;

  const tabs = (variant: "bottom" | "inline") => (
    <ViewTabs
      view={view}
      onChange={setView}
      costTotal={costTotal}
      lodgingNights={lodgingNights}
      showBuses={!!nightBusSummary}
      taskCount={notes?.tasks.length}
      variant={variant}
    />
  );

  const fullscreenButton = (
    <MapButton label="Pantalla completa" onClick={enterFullscreen}>
      <Maximize2 className="size-5" />
    </MapButton>
  );

  return (
    // fixed a los cuatro bordes: la barra de abajo queda pegada al borde real de la
    // pantalla aunque el navegador muestre u oculte su barra (con h-dvh, en algunos
    // Android quedaba por debajo de lo visible)
    <div className="fixed inset-0 overflow-hidden bg-bg lg:flex">
      {/* El mapa queda siempre en el mismo lugar del árbol: así no se vuelve a crear */}
      <div
        className="absolute inset-0 lg:relative lg:order-2 lg:flex-1"
        style={{
          ["--map-inset-top" as string]: mapFullscreen
            ? "calc(max(0.75rem, env(safe-area-inset-top)) + 52px)"
            : isDesktop
              ? "52px"
              : `${TOP_INSET + 52}px`,
        }}
      >
        <Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-muted">Cargando mapa…</div>}>
          <TripMap
            day={selectedDay}
            mode={mapMode}
            onDaySelect={selectDay}
            itinerary={itinerary}
            startDate={meta.startDate}
            center={meta.mapCenter}
            zoom={meta.mapZoom}
            padding={mapPadding}
            focusedPoi={focusedPoi}
            routes={dayRoutes}
          />
        </Suspense>
        {mapFullscreen ? (
          <div
            className="absolute left-3 z-30 flex items-center gap-2"
            style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
          >
            <MapButton label="Salir de pantalla completa" onClick={exitFullscreen}>
              <Minimize2 className="size-5" />
            </MapButton>
            <MapModeControl mode={mapMode} onChange={setMapMode} />
          </div>
        ) : (
          isDesktop &&
          view === "itinerary" && (
            <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
              <MapModeControl mode={mapMode} onChange={setMapMode} />
              {fullscreenButton}
            </div>
          )
        )}
      </div>

      {mapFullscreen ? null : isDesktop ? (
        <aside className="relative z-10 order-1 flex h-full w-[440px] shrink-0 flex-col border-r border-line bg-surface">
          <TopBar meta={meta} itinerary={itinerary} status={status} onToday={goToday} />
          {tabs("inline")}
          {view === "itinerary" ? (
            <>
              <div className="flex items-center gap-2 border-y border-line py-2 pr-3">
                <div className="min-w-0 flex-1">{strip}</div>
                {stepButtons}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-4">{detail}</div>
            </>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto">{summaryPage}</div>
          )}
        </aside>
      ) : (
        <>
          <TopBar meta={meta} itinerary={itinerary} status={status} onToday={goToday} floating />
          {view === "itinerary" ? (
            <>
              <div
                className="absolute left-3 z-20 flex items-center gap-2"
                style={{ top: "calc(max(0.75rem, env(safe-area-inset-top)) + 64px)" }}
              >
                <MapModeControl mode={mapMode} onChange={setMapMode} />
                {fullscreenButton}
              </div>
              <BottomSheet
                snap={snap}
                heights={sheetHeights}
                bottomOffset={NAV_HEIGHT}
                onSnapChange={setSnap}
                header={
                  <div className="flex items-center gap-1 pr-3">
                    <div className="min-w-0 flex-1">{strip}</div>
                    {stepButtons}
                  </div>
                }
              >
                {detail}
              </BottomSheet>
            </>
          ) : (
            <main
              className="absolute inset-x-0 z-20 overflow-y-auto bg-bg"
              style={{ top: 0, bottom: NAV_HEIGHT, paddingTop: TOP_INSET }}
            >
              {summaryPage}
            </main>
          )}
          {tabs("bottom")}
        </>
      )}
    </div>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-9 items-center justify-center rounded-full bg-surface-2 transition-colors hover:bg-line disabled:opacity-30"
    >
      {children}
    </button>
  );
}

/** Botón redondo que flota sobre el mapa, con el mismo estilo que el selector de modo */
function MapButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface/90 text-fg shadow-md backdrop-blur-md transition-colors hover:bg-surface"
    >
      {children}
    </button>
  );
}
