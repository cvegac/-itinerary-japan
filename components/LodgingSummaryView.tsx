"use client";

import { BedDouble, MapPin, Recycle } from "lucide-react";
import { computeLodgingSummary } from "@/lib/itinerary-utils";
import { placeUrl } from "@/lib/google-maps";
import type { DayEntry } from "@/types/DayEntry";
import type { NearbyShop } from "@/types/Trip";

type Props = {
  itinerary: DayEntry[];
  onDaySelect: (day: DayEntry) => void;
  /** Tiendas de segunda mano por hospedaje (clave: lodgingPlace) */
  shops?: Record<string, NearbyShop[]>;
};

const usd = (amount: number) => `US$${Math.round(amount).toLocaleString("en-US")}`;

function shortDate(date: string): string {
  return new Date(date + "T12:00:00").toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
}

export default function LodgingSummaryView({ itinerary, onDaySelect, shops }: Props) {
  const stays = computeLodgingSummary(itinerary);
  const totalNights = stays.reduce((sum, s) => sum + s.nights, 0);
  const totalCost = stays.reduce((sum, s) => sum + (s.cost ?? 0), 0);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-4">
      <header>
        <h2 className="text-2xl font-bold">Hospedaje</h2>
        <p className="text-sm text-muted">
          {stays.length} lugares · {totalNights} noches
          {totalCost > 0 && ` · ${usd(totalCost)} en total`} · la fecha de fin es el check-out
        </p>
      </header>

      <ol className="flex flex-col gap-2.5">
        {stays.map((s, i) => (
          <li key={s.checkIn}>
            <button
              type="button"
              onClick={() => {
                const day = itinerary.find((it) => it.date === s.checkIn);
                if (day) onDaySelect(day);
              }}
              className="flex w-full gap-3 rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:bg-surface-2"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-bold">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="text-sm font-semibold capitalize">
                    {shortDate(s.checkIn)} → {shortDate(s.checkOut)}
                  </span>
                  <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-xs font-bold text-indigo-700">
                    {s.nights} {s.nights === 1 ? "noche" : "noches"}
                  </span>
                </span>
                <span className="mt-1.5 flex items-center gap-1.5 text-sm font-medium">
                  <MapPin className="size-4 shrink-0 text-muted" aria-hidden />
                  {s.place}
                </span>
                <span className="mt-1 flex items-start gap-1.5 text-sm text-muted">
                  <BedDouble className="mt-0.5 size-4 shrink-0" aria-hidden />
                  {s.recommendation}
                </span>
                {s.cost !== undefined && (
                  <span className="mt-1.5 flex items-baseline gap-1.5 text-sm">
                    <span className="font-bold">{usd(s.cost)}</span>
                    {s.nights > 1 && <span className="text-xs text-muted">· {usd(s.cost / s.nights)} por noche</span>}
                  </span>
                )}
              </span>
            </button>
            {shops?.[s.place] && (
              <ul aria-label={`Segunda mano cerca de ${s.place}`} className="ml-12 mt-1.5 flex flex-col gap-1">
                {shops[s.place].map((shop) => (
                  <li key={shop.name}>
                    <a
                      href={placeUrl(shop.coords)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm hover:bg-line"
                    >
                      <Recycle className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
                      <span className="min-w-0">
                        <span className="block font-medium">{shop.name}</span>
                        <span className="block text-xs text-muted">
                          {shop.what} · {shop.howFar}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
