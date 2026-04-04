"use client";

import type { DayEntry } from "@/types/DayEntry";
import type { TransportSegment } from "@/types/TransportSegment";

type Props = {
  day: DayEntry;
};

const CATEGORY_BADGE: Record<string, string> = {
  Naturaleza: "bg-emerald-100 text-emerald-800",
  Logística: "bg-slate-100 text-slate-700",
  Ciudad: "bg-orange-100 text-orange-800",
  Paisaje: "bg-sky-100 text-sky-800",
  Vistas: "bg-violet-100 text-violet-800",
  Compras: "bg-pink-100 text-pink-800",
  Libre: "bg-yellow-100 text-yellow-800",
};

export default function DayDetail({ day }: Props) {
  const date = new Date(day.date + "T12:00:00");
  const formatted = date.toLocaleDateString("es-AR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const badgeClass =
    CATEGORY_BADGE[day.category] ?? "bg-gray-100 text-gray-700";

  const isNightBusDay = !!day.nightBus;
  const isNightBusArrival = !!day.timeSaved && !day.nightBus;

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col gap-2 mb-5">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-baseline gap-2">
            <h1 className="text-xl font-bold text-gray-900 leading-tight">
              {day.label}
            </h1>
            <span className="text-sm font-bold text-red-500 whitespace-nowrap">
              {day.budget}
            </span>
          </div>
          <p className="text-sm text-gray-500 capitalize">{formatted}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${badgeClass}`}>
            {day.category}
          </span>
          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-700">
            📍 {day.location}
          </span>
          {day.isTransit ? (
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-800">
              🚄 En tránsito
            </span>
          ) : isNightBusDay ? (
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-orange-100 text-orange-800">
              🚌 Bus nocturno {day.nightBus} esta noche
            </span>
          ) : (
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-800">
              🏠 {day.accommodation}
            </span>
          )}
          {day.zona && (
            <span className="text-xs px-2 py-1 rounded-full bg-gray-50 text-gray-500 border border-gray-200">
              🗺 {day.zona}
            </span>
          )}
        </div>
      </div>

      {/* ── Bloque Bus Nocturno ── */}
      {isNightBusDay && (
        <div className="mb-5 rounded-xl border-2 border-orange-300 bg-orange-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🚌</span>
            <span className="font-bold text-orange-800 text-sm">
              Bus Nocturno {day.nightBus} — Esta noche
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <div className="text-orange-500 font-semibold mb-0.5">Ruta</div>
              <div className="text-orange-900 font-medium">{day.busRoute}</div>
            </div>
            <div>
              <div className="text-orange-500 font-semibold mb-0.5">Costo bus</div>
              <div className="text-orange-900 font-medium">{day.busCost}</div>
            </div>
            <div>
              <div className="text-orange-500 font-semibold mb-0.5">Hotel ahorrado</div>
              <div className="text-orange-900 font-medium">{day.hotelSaved}</div>
            </div>
            <div>
              <div className="text-orange-500 font-semibold mb-0.5">⏱ Tiempo ganado</div>
              <div className="text-orange-900 font-medium">{day.timeSaved}</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Bloque llegada con bus nocturno ── */}
      {isNightBusArrival && (
        <div className="mb-5 rounded-xl border border-teal-200 bg-teal-50 p-3">
          <div className="flex items-center gap-2">
            <span className="text-base">⏰</span>
            <span className="text-xs text-teal-800 font-medium">{day.timeSaved}</span>
          </div>
        </div>
      )}

      {/* Info row */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <InfoCard icon="🍜" label="Comida" value={day.food} />
        <InfoCard icon="📝" label="Notas" value={day.notes} />
      </div>

      {/* Segmentos de transporte */}
      {day.transport.length > 0 && (
        <TransportList segments={day.transport} />
      )}

      {/* Activities */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ActivityList
          title="Actividades del Día"
          icon="☀️"
          items={day.activitiesDay}
          accent="amber"
        />
        <ActivityList
          title="Actividades de la Noche"
          icon="🌙"
          items={day.activitiesNight}
          accent="indigo"
        />
      </div>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="text-xs text-gray-400 font-medium mb-1">
        {icon} {label}
      </div>
      <div className="text-sm text-gray-800 font-medium leading-snug">
        {value}
      </div>
    </div>
  );
}

const TRANSPORT_ICON: Record<string, string> = {
  tren: "🚃",
  metro: "🚇",
  bus: "🚌",
  "bus-nocturno": "🌙",
  ferry: "⛴",
  barco: "🚢",
  teleférico: "🚡",
  caminar: "🚶",
  monorriel: "🚝",
  tranvía: "🚋",
};

function TransportList({ segments }: { segments: TransportSegment[] }) {
  return (
    <div className="mb-5">
      <div className="text-xs text-gray-400 font-medium mb-2">🚃 Transporte del día</div>
      <div className="flex flex-col gap-1.5">
        {segments.map((seg, i) => {
          const icon = TRANSPORT_ICON[seg.mode] ?? "🔹";
          const isBusNocturno = seg.mode === "bus-nocturno";
          return (
            <div
              key={i}
              className={`flex items-start gap-3 rounded-lg px-3 py-2 text-sm ${
                isBusNocturno
                  ? "bg-orange-50 border border-orange-200"
                  : "bg-gray-50 border border-gray-100"
              }`}
            >
              <span className="text-base flex-shrink-0 mt-0.5">{icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`font-semibold ${
                    isBusNocturno ? "text-orange-800" : "text-gray-800"
                  }`}>
                    {seg.from}
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className={`font-semibold ${
                    isBusNocturno ? "text-orange-800" : "text-gray-800"
                  }`}>
                    {seg.to}
                  </span>
                  {seg.line && (
                    <span className="text-xs text-gray-500 italic">({seg.line})</span>
                  )}
                </div>
                <div className="flex gap-3 mt-0.5 text-xs text-gray-500 flex-wrap">
                  {seg.duration && <span>⏱ {seg.duration}</span>}
                  {seg.cost && <span className="text-emerald-700 font-medium">💴 {seg.cost}</span>}
                  {seg.note && <span className="text-amber-700">💬 {seg.note}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActivityList({
  title,
  icon,
  items,
  accent,
}: {
  title: string;
  icon: string;
  items: string[];
  accent: "amber" | "indigo";
}) {
  const headerClass =
    accent === "amber"
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : "bg-indigo-50 text-indigo-800 border-indigo-200";

  const dotClass =
    accent === "amber" ? "bg-amber-400" : "bg-indigo-400";

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <div className={`px-3 py-2 text-sm font-bold border-b ${headerClass}`}>
        {icon} {title}
      </div>
      <ul className="divide-y divide-gray-100">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2 px-3 py-2">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClass}`} />
            <span className="text-sm text-gray-700">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
