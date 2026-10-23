"use client";

import { useEffect, useRef } from "react";
import type { DayEntry } from "@/types/DayEntry";
import { WEEK_COLORS_HEX, getWeekIndex, getWeekGroup } from "@/lib/itinerary-utils";

export type MapMode = "day" | "week" | "full";

type Props = {
  day: DayEntry | null;
  mode: MapMode;
  onDaySelect?: (day: DayEntry) => void;
  itinerary: DayEntry[];
  startDate: string;
  center: [number, number];
  zoom: number;
};

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

function poiIcon(L: any, color: string, letter: string, night?: boolean) {
  const bg = night ? "#1e293b" : "#fff";
  const fg = night ? "#fde68a" : color;
  return L.divIcon({
    className: "",
    html: `<div style="
      width:22px;height:22px;border-radius:50%;
      background:${bg};color:${fg};border:2px solid ${color};
      display:flex;align-items:center;justify-content:center;
      font-size:11px;font-weight:bold;
      box-shadow: 0 1px 4px rgba(0,0,0,0.35);
    ">${letter}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function poiPopup(name: string, letter: string, night?: boolean): string {
  return `
    <div style="font-family:sans-serif;line-height:1.4;min-width:140px">
      <div style="font-weight:bold;font-size:13px">${letter}. ${name}</div>
      <div style="font-size:11px;color:#666;margin-top:2px">${night ? "🌙 De noche" : "☀️ De día"}</div>
    </div>
  `;
}

export default function TripMap({ day, mode, onDaySelect, itinerary, startDate, center, zoom }: Props) {
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
          center,
          zoom,
          zoomControl: true,
        });

        // Basemaps gratis y sin API key, con nombres legibles en Japón
        // (CARTO dejó de servir: exige API key hasta para Voyager, y el OSM
        // estándar rotula todo en japonés).
        // - Esri NatGeo: solo alfabeto latino, pero sin datos pasado el zoom 12
        //   ("Map data not yet available"); más allá se agranda la tile del 12.
        //   Esri lo dejó en soporte limitado, por eso queda la alternativa.
        // - OSM Alemania: nombre local + transcripción latina, con detalle de calles.
        const natGeo = L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}",
          {
            attribution: "Tiles &copy; Esri &mdash; National Geographic, Esri, DeLorme, NAVTEQ",
            maxNativeZoom: 12,
            maxZoom: 16,
          }
        );
        const osmDe = L.tileLayer("https://tile.openstreetmap.de/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 18,
        });
        natGeo.addTo(mapInstanceRef.current);
        L.control
          .layers({ "Mapa (en latino)": natGeo, "Calles (bilingüe)": osmDe })
          .addTo(mapInstanceRef.current);

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
    const weekIndex = getWeekIndex(day.date, startDate);
    const color = WEEK_COLORS_HEX[weekIndex % WEEK_COLORS_HEX.length];
    const dayNum = itinerary.indexOf(day) + 1;
    const marker = addMarker(L, group, day, circleIcon(L, color, dayNum, true), popupContent(day, true), 1000);
    const [lat, lng] = day.accommodationCoords;

    const pois = day.pois ?? [];
    if (pois.length === 0) {
      map.flyTo([lat, lng], 10, { duration: 0.8 });
      return marker;
    }

    // Recorrido en el orden de visita, con letras para no confundir con los números de día
    const poiCoords = pois.map((p) => p.coords);
    if (poiCoords.length > 1) {
      L.polyline(poiCoords, { color, weight: 2, opacity: 0.6, dashArray: "4, 6" }).addTo(group);
    }
    pois.forEach((p, i) => {
      L.marker(p.coords, { icon: poiIcon(L, color, String.fromCharCode(65 + i), p.night) })
        .addTo(group)
        .bindPopup(poiPopup(p.name, String.fromCharCode(65 + i), p.night), { maxWidth: 220 });
    });

    // Encuadrar en los puntos; el hospedaje entra solo si está cerca (en las
    // excursiones, como Nikko desde Tokio, alejaría demasiado el mapa).
    // maxZoom 13: el basemap NatGeo no tiene datos pasado el 12 y se pixela.
    const bounds = L.latLngBounds(poiCoords);
    if (map.distance(bounds.getCenter(), [lat, lng]) < 15000) bounds.extend([lat, lng]);
    map.flyToBounds(bounds.pad(0.2), { duration: 0.8, maxZoom: 13 });
    return null;
  }

  // ── Modo SEMANA ───────────────────────────────────────────────────────────
  function renderWeekMode(L: any, map: any, group: any, selectedDay: DayEntry) {
    const weekDays = getWeekGroup(itinerary, selectedDay.date, startDate);
    const weekIndex = getWeekIndex(selectedDay.date, startDate);
    const color = WEEK_COLORS_HEX[weekIndex % WEEK_COLORS_HEX.length];

    // Polilínea de la semana
    const coords = weekDays.map((d) => d.accommodationCoords as [number, number]);
    if (coords.length > 1) {
      L.polyline(coords, { color, weight: 3, opacity: 0.85, dashArray: "6, 4" }).addTo(group);
    }

    let selectedMarker: any = null;
    weekDays.forEach((d) => {
      const isSelected = d.date === selectedDay.date;
      const dayNum = itinerary.indexOf(d) + 1;
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
    const coords = itinerary.map((d) => d.accommodationCoords as [number, number]);

    let prev: [number, number] | null = null;
    let selectedMarker: any = null;

    itinerary.forEach((d, i) => {
      const curr = d.accommodationCoords as [number, number];
      if (prev) {
        const wi = getWeekIndex(d.date, startDate);
        const color = WEEK_COLORS_HEX[wi % WEEK_COLORS_HEX.length];
        L.polyline([prev, curr], { color, weight: 2.5, opacity: 0.7 }).addTo(group);
      }
      prev = curr;

      const wi = getWeekIndex(d.date, startDate);
      const color = WEEK_COLORS_HEX[wi % WEEK_COLORS_HEX.length];
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
