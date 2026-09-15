"use client";

import { useEffect, useRef } from "react";
import { ITINERARY } from "@/data/itinerary";
import type { DayEntry } from "@/types/DayEntry";

export type MapMode = "day" | "week" | "full";

type Props = {
  day: DayEntry | null;
  mode: MapMode;
  onDaySelect?: (day: DayEntry) => void;
};

// ── Colores por semana ──────────────────────────────────────────────────────
const WEEK_COLORS = [
  "#ef4444", // semana 1 — rojo
  "#f97316", // semana 2 — naranja
  "#eab308", // semana 3 — amarillo
  "#22c55e", // semana 4 — verde
  "#3b82f6", // semana 5 — azul
];

function getWeekIndex(date: string): number {
  const d = new Date(date + "T12:00:00");
  const start = new Date("2026-11-01T12:00:00");
  const diffDays = Math.floor((d.getTime() - start.getTime()) / 86400000);
  return Math.floor(diffDays / 7);
}

function getWeekGroup(selectedDate: string): DayEntry[] {
  const wi = getWeekIndex(selectedDate);
  return ITINERARY.filter((e) => getWeekIndex(e.date) === wi);
}

// ── Helpers Leaflet ─────────────────────────────────────────────────────────
function popupContent(day: DayEntry, highlight = false): string {
  const busHtml = day.nightBus
    ? `<div style="color:#ea580c;font-weight:bold;font-size:11px">🚌 Bus Nocturno ${day.nightBus} esta noche</div>`
    : "";
  const accomHtml = day.isTransit
    ? `<span style="color:#e67e22;font-weight:bold">🚄 En tránsito</span>`
    : `<span style="color:#16a34a;font-weight:bold">🏠 ${day.accommodation}</span>`;

  const bg = highlight ? "background:#fefce8;border-radius:8px;padding:8px;" : "";

  return `
    <div style="font-family:sans-serif;line-height:1.5;${bg}min-width:160px">
      <div style="font-weight:bold;font-size:14px;margin-bottom:3px">${day.label}</div>
      <div style="font-size:11px;color:#555;margin-bottom:3px">📍 ${day.location}</div>
      ${accomHtml}
      ${busHtml}
      <div style="font-size:11px;color:#888;margin-top:3px">${day.budget}</div>
    </div>
  `;
}

function circleIcon(L: any, color: string, number: number, selected: boolean) {
  const size = selected ? 28 : 20;
  const border = selected ? `border: 3px solid #fff; box-shadow: 0 0 0 3px ${color};` : "";
  return L.divIcon({
    className: "",
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};color:#fff;
      display:flex;align-items:center;justify-content:center;
      font-size:${selected ? 11 : 9}px;font-weight:bold;
      ${border}
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    ">${number}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export default function JapanMap({ day, mode, onDaySelect }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);

  // ── Inicializar mapa ─────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current) return;

    const initMap = async () => {
      const L = (await import("leaflet")).default;

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (!mapInstanceRef.current) {
        mapInstanceRef.current = L.map(mapRef.current!, {
          center: [36.5, 137.0],
          zoom: 6,
          zoomControl: true,
        });

        // CARTO Voyager Base map (nombres en inglés/romaji)
        L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          maxZoom: 19,
        }).addTo(mapInstanceRef.current);

        layerGroupRef.current = L.layerGroup().addTo(mapInstanceRef.current);
      }

      // ResizeObserver: llama invalidateSize() cuando el div cambia de tamaño
      const ro = new ResizeObserver(() => {
        mapInstanceRef.current?.invalidateSize();
      });
      if (mapRef.current) ro.observe(mapRef.current);

      renderLayer(L);

      return () => ro.disconnect();
    };

    initMap();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Re-renderizar cuando cambian day o mode ──────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const tryRender = async () => {
      const L = (await import("leaflet")).default;
      renderLayer(L);
    };
    tryRender();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, mode]);

  function renderLayer(L: any) {
    const map = mapInstanceRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    let selectedMarker: any = null;
    if (mode === "day" && day) {
      selectedMarker = renderDayMode(L, map, group, day);
    } else if (mode === "week" && day) {
      selectedMarker = renderWeekMode(L, map, group, day);
    } else if (mode === "full") {
      selectedMarker = renderFullMode(L, map, group, day);
    }

    // Abrir popup del día seleccionado después de que Leaflet renderizó todo
    if (selectedMarker) {
      setTimeout(() => selectedMarker.openPopup(), 50);
    }
  }

  function addMarker(L: any, group: any, d: DayEntry, icon: any, popup: string, zIndex = 0) {
    const [lat, lng] = d.accommodationCoords;
    const marker = L.marker([lat, lng], { icon, zIndexOffset: zIndex })
      .addTo(group)
      .bindPopup(popup, { maxWidth: 240 });
    if (onDaySelect) {
      marker.on("click", () => onDaySelect(d));
    }
    return marker;
  }

  // ── Modo DÍA ─────────────────────────────────────────────────────────────
  function renderDayMode(L: any, map: any, group: any, day: DayEntry) {
    const weekIndex = getWeekIndex(day.date);
    const color = WEEK_COLORS[weekIndex % WEEK_COLORS.length];
    const dayNum = ITINERARY.indexOf(day) + 1;
    const marker = addMarker(L, group, day, circleIcon(L, color, dayNum, true), popupContent(day, true), 1000);
    const [lat, lng] = day.accommodationCoords;
    map.flyTo([lat, lng], 10, { duration: 0.8 });
    return marker;
  }

  // ── Modo SEMANA ───────────────────────────────────────────────────────────
  function renderWeekMode(L: any, map: any, group: any, selectedDay: DayEntry) {
    const weekDays = getWeekGroup(selectedDay.date);
    const weekIndex = getWeekIndex(selectedDay.date);
    const color = WEEK_COLORS[weekIndex % WEEK_COLORS.length];

    // Polilínea de la semana
    const coords = weekDays.map((d) => d.accommodationCoords as [number, number]);
    if (coords.length > 1) {
      L.polyline(coords, { color, weight: 3, opacity: 0.85, dashArray: "6, 4" }).addTo(group);
    }

    let selectedMarker: any = null;
    weekDays.forEach((d) => {
      const isSelected = d.date === selectedDay.date;
      const dayNum = ITINERARY.indexOf(d) + 1;
      const marker = addMarker(L, group, d, circleIcon(L, color, dayNum, isSelected), popupContent(d, isSelected), isSelected ? 1000 : 0);
      if (isSelected) selectedMarker = marker;
    });

    if (coords.length > 0) {
      const bounds = L.latLngBounds(coords);
      map.flyToBounds(bounds.pad(0.3), { duration: 0.8, maxZoom: 11 });
    }

    return selectedMarker;
  }

  // ── Modo COMPLETO ─────────────────────────────────────────────────────────
  function renderFullMode(L: any, map: any, group: any, selectedDay: DayEntry | null) {
    const coords = ITINERARY.map((d) => d.accommodationCoords as [number, number]);

    let prev: [number, number] | null = null;
    let selectedMarker: any = null;

    ITINERARY.forEach((d, i) => {
      const curr = d.accommodationCoords as [number, number];
      if (prev) {
        const wi = getWeekIndex(d.date);
        const color = WEEK_COLORS[wi % WEEK_COLORS.length];
        L.polyline([prev, curr], { color, weight: 2.5, opacity: 0.7 }).addTo(group);
      }
      prev = curr;

      const wi = getWeekIndex(d.date);
      const color = WEEK_COLORS[wi % WEEK_COLORS.length];
      const isSelected = selectedDay?.date === d.date;
      const dayNum = i + 1;
      const marker = addMarker(L, group, d, circleIcon(L, color, dayNum, isSelected), popupContent(d, isSelected), isSelected ? 1000 : 0);
      if (isSelected) selectedMarker = marker;
    });

    if (coords.length > 0) {
      const bounds = L.latLngBounds(coords);
      map.flyToBounds(bounds.pad(-0.1), { duration: 1, maxZoom: 9 });
    }

    return selectedMarker;
  }

  return (
    <div
      ref={mapRef}
      className="w-full h-full"
      style={{ minHeight: 320 }}
    />
  );
}
