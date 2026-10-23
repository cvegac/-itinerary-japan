"use client";

import { useEffect, useRef } from "react";
import type { GeoJSONSource, Map as MapLibreMap, Marker, PaddingOptions } from "maplibre-gl";
import type { DayEntry } from "@/types/DayEntry";
import { WEEK_COLORS_HEX, getWeekGroup } from "@/lib/itinerary-utils";
import { boundsOf, dayView, escapeHtml, lineFeature, toLngLat, weekColor } from "@/lib/map-geo";
import { MAP_STYLE, TERRAIN_MAX_ZOOM, TERRAIN_TILES } from "@/lib/map-sources";

export type MapMode = "day" | "week" | "full";

type Props = {
  day: DayEntry | null;
  mode: MapMode;
  onDaySelect?: (day: DayEntry) => void;
  itinerary: DayEntry[];
  startDate: string;
  /** [lat, lng] */
  center: [number, number];
  zoom: number;
  /** Margen libre al encuadrar (en el celular, el espacio de la hoja y las barras) */
  padding?: PaddingOptions;
  /** Lugar del día a enfocar; el nonce permite volver a enfocar el mismo */
  focusedPoi?: { index: number; nonce: number } | null;
};

type MapLibre = typeof import("maplibre-gl");


const ROUTE_SOURCE = "trip-route";
const DEFAULT_PADDING: PaddingOptions = { top: 60, bottom: 60, left: 60, right: 60 };

/** Lo último que se encuadró, para re-encuadrar si cambia el margen */
type Camera =
  | { bounds: [[number, number], [number, number]]; maxZoom: number }
  | { center: [number, number]; zoom: number };

// ── Marcadores (elementos HTML) ─────────────────────────────────────────────
function dayMarkerEl(color: string, number: number, selected: boolean): HTMLElement {
  const size = selected ? 30 : 22;
  const el = document.createElement("button");
  el.type = "button";
  el.setAttribute("aria-label", `Día ${number}`);
  el.style.cssText = `
    width:${size}px;height:${size}px;border-radius:50%;cursor:pointer;
    background:${color};color:#fff;border:${selected ? 3 : 2}px solid #fff;
    display:flex;align-items:center;justify-content:center;
    font:bold ${selected ? 12 : 10}px system-ui,sans-serif;
    box-shadow:0 2px 6px rgba(0,0,0,.35)${selected ? `,0 0 0 3px ${color}` : ""};`;
  el.textContent = String(number);
  // Varios días pueden dormir en el mismo lugar: el elegido queda encima
  if (selected) el.style.zIndex = "10";
  return el;
}

function poiMarkerEl(color: string, letter: string, night: boolean): HTMLElement {
  const el = document.createElement("button");
  el.type = "button";
  el.style.cssText = `
    width:24px;height:24px;border-radius:50%;cursor:pointer;
    background:${night ? "#1e293b" : "#fff"};color:${night ? "#fde68a" : color};
    border:2px solid ${color};display:flex;align-items:center;justify-content:center;
    font:bold 11px system-ui,sans-serif;box-shadow:0 1px 4px rgba(0,0,0,.35);`;
  el.textContent = letter;
  return el;
}

function dayPopupHtml(day: DayEntry): string {
  const accom = day.isTransit
    ? `<span style="color:#e67e22;font-weight:600">🚄 En tránsito</span>`
    : `<span style="color:#16a34a;font-weight:600">🏠 ${escapeHtml(day.accommodation)}</span>`;
  return `
    <div style="font-family:system-ui,sans-serif;line-height:1.45;min-width:170px;color:#111">
      <div style="font-weight:700;font-size:14px;margin-bottom:2px">${escapeHtml(day.label)}</div>
      <div style="font-size:11px;color:#555;margin-bottom:3px">📍 ${escapeHtml(day.location)}</div>
      <div style="font-size:12px">${accom}</div>
      <div style="font-size:11px;color:#888;margin-top:3px">${escapeHtml(day.budget)}</div>
    </div>`;
}

function poiPopupHtml(letter: string, name: string, night: boolean): string {
  return `
    <div style="font-family:system-ui,sans-serif;line-height:1.4;min-width:140px;color:#111">
      <div style="font-weight:700;font-size:13px">${letter}. ${escapeHtml(name)}</div>
      <div style="font-size:11px;color:#666;margin-top:2px">${night ? "🌙 De noche" : "☀️ De día"}</div>
    </div>`;
}

// ── Capas propias (se re-agregan cada vez que cambia el estilo) ─────────────
function ensureOverlay(map: MapLibreMap) {
  if (!map.getSource("terrain")) {
    map.addSource("terrain", {
      type: "raster-dem",
      tiles: [TERRAIN_TILES],
      encoding: "terrarium",
      tileSize: 256,
      maxzoom: TERRAIN_MAX_ZOOM,
      attribution: "Elevación: Mapzen / AWS Terrain Tiles",
    });
  }
  if (!map.getLayer("hillshade")) {
    // Debajo de la primera capa de etiquetas, para no taparlas
    const firstSymbol = map.getStyle().layers.find((l) => l.type === "symbol")?.id;
    map.addLayer(
      { id: "hillshade", type: "hillshade", source: "terrain", paint: { "hillshade-exaggeration": 0.35 } },
      firstSymbol
    );
  }
  if (!map.getSource(ROUTE_SOURCE)) {
    map.addSource(ROUTE_SOURCE, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({
      id: "route-solid",
      type: "line",
      source: ROUTE_SOURCE,
      filter: ["==", ["get", "dashed"], false],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": ["get", "color"], "line-width": 3, "line-opacity": 0.75 },
    });
    map.addLayer({
      id: "route-dashed",
      type: "line",
      source: ROUTE_SOURCE,
      filter: ["==", ["get", "dashed"], true],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": ["get", "color"], "line-width": 2.5, "line-opacity": 0.8, "line-dasharray": [2, 2] },
    });
  }
}

export default function TripMap({
  day,
  mode,
  onDaySelect,
  itinerary,
  startDate,
  center,
  zoom,
  padding = DEFAULT_PADDING,
  focusedPoi = null,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const libRef = useRef<MapLibre | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const routeRef = useRef<ReturnType<typeof lineFeature>[]>([]);
  const poiMarkersRef = useRef<Marker[]>([]);
  const cameraRef = useRef<Camera | null>(null);
  // Listo para dibujar: se activa una vez, al cargar el estilo. No usamos
  // map.isStyleLoaded(), que da false mientras haya tiles cargando (casi
  // siempre en el celular) y hacía que se ignoraran los cambios de día o modo.
  const readyRef = useRef(false);
  const paddingRef = useRef(padding);
  paddingRef.current = padding;
  // Para que los handlers de los marcadores usen siempre el último callback
  const onDaySelectRef = useRef(onDaySelect);
  onDaySelectRef.current = onDaySelect;

  // ── Inicializar mapa ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    let cleanup = () => {};

    (async () => {
      const lib = await import("maplibre-gl");
      if (cancelled || !containerRef.current) return;
      libRef.current = lib;
      lib.setWorkerUrl("/maplibre-gl-worker.js");

      const map = new lib.Map({
        container: containerRef.current,
        style: MAP_STYLE,
        center: toLngLat(center),
        zoom: zoom - 1,
        attributionControl: false,
        maxPitch: 75,
      });
      mapRef.current = map;

      map.addControl(new lib.AttributionControl({ compact: true }), "top-left");
      map.addControl(new lib.NavigationControl({ visualizePitch: true }), "top-right");
      map.addControl(new lib.TerrainControl({ source: "terrain", exaggeration: 1.3 }), "top-right");

      // Cada cambio de estilo borra las capas propias: se vuelven a agregar
      map.on("style.load", () => {
        ensureOverlay(map);
        (map.getSource(ROUTE_SOURCE) as GeoJSONSource).setData({
          type: "FeatureCollection",
          features: routeRef.current,
        });
      });
      map.once("load", () => {
        readyRef.current = true;
        renderLayer();
      });

      // El aviso de créditos compacto arranca abierto: lo dejamos como botón "i"
      const collapseAttribution = () =>
        containerRef.current?.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
      map.on("load", collapseAttribution);
      map.on("resize", collapseAttribution);


      const ro = new ResizeObserver(() => map.resize());
      ro.observe(containerRef.current);

      cleanup = () => {
        ro.disconnect();
        map.remove();
        mapRef.current = null;
        readyRef.current = false;
      };
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Re-renderizar cuando cambian day o mode ──────────────────────────────
  useEffect(() => {
    if (mapRef.current && readyRef.current) renderLayer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, mode]);

  // ── Si cambia el margen (la hoja sube o baja), re-encuadrar sin redibujar ──
  const paddingKey = `${padding.top},${padding.bottom},${padding.left},${padding.right}`;
  useEffect(() => {
    const map = mapRef.current;
    if (map && cameraRef.current) moveCamera(map, cameraRef.current, 300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paddingKey]);

  // ── Enfocar un lugar tocado en la lista ──────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    const poi = focusedPoi && day?.pois?.[focusedPoi.index];
    if (!map || !poi || mode !== "day") return;
    map.flyTo({ center: toLngLat(poi.coords), zoom: 16, padding: paddingRef.current, duration: 800 });
    poiMarkersRef.current.forEach((m, i) => {
      const open = !!m.getPopup()?.isOpen();
      if ((i === focusedPoi!.index) !== open) m.togglePopup();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedPoi]);

  function moveCamera(map: MapLibreMap, camera: Camera, duration: number) {
    cameraRef.current = camera;
    if ("bounds" in camera) {
      map.fitBounds(camera.bounds, { padding: paddingRef.current, maxZoom: camera.maxZoom, duration });
    } else {
      map.flyTo({ center: camera.center, zoom: camera.zoom, padding: paddingRef.current, duration });
    }
  }

  function setRoute(features: ReturnType<typeof lineFeature>[]) {
    routeRef.current = features;
    const source = mapRef.current?.getSource(ROUTE_SOURCE) as GeoJSONSource | undefined;
    source?.setData({ type: "FeatureCollection", features });
  }

  function addMarker(el: HTMLElement, lngLat: [number, number], popupHtml: string) {
    const lib = libRef.current!;
    const marker = new lib.Marker({ element: el })
      .setLngLat(lngLat)
      .setPopup(new lib.Popup({ offset: 16, maxWidth: "260px", focusAfterOpen: false }).setHTML(popupHtml))
      .addTo(mapRef.current!);
    markersRef.current.push(marker);
    return marker;
  }

  function addDayMarker(d: DayEntry, selected: boolean) {
    const color = weekColor(d.date, startDate, WEEK_COLORS_HEX);
    const el = dayMarkerEl(color, itinerary.indexOf(d) + 1, selected);
    const marker = addMarker(el, toLngLat(d.accommodationCoords), dayPopupHtml(d));
    el.addEventListener("click", () => onDaySelectRef.current?.(d));
    return marker;
  }

  function renderLayer() {
    const map = mapRef.current;
    if (!map || !libRef.current) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    poiMarkersRef.current = [];

    let selected: Marker | null = null;
    if (mode === "day" && day) selected = renderDayMode(map, day);
    else if (mode === "week" && day) selected = renderWeekMode(map, day);
    else if (mode === "full") selected = renderFullMode(map, day);

    // Solo en modo día se abre la ficha sola: en semana y completo taparía el mapa
    if (selected && mode === "day") {
      const marker = selected;
      map.once("moveend", () => {
        if (!marker.getPopup()?.isOpen()) marker.togglePopup();
      });
    }
  }

  // ── Modo DÍA: hospedaje + puntos de interés con letras ───────────────────
  function renderDayMode(map: MapLibreMap, d: DayEntry): Marker | null {
    const color = weekColor(d.date, startDate, WEEK_COLORS_HEX);
    const view = dayView(d);
    const accomMarker = addDayMarker(d, true);

    view.points.forEach((p) => {
      poiMarkersRef.current.push(
        addMarker(poiMarkerEl(color, p.letter, p.night), p.lngLat, poiPopupHtml(p.letter, p.name, p.night))
      );
    });
    setRoute(
      (d.pois?.length ?? 0) > 1 ? [lineFeature(d.pois!.map((p) => p.coords), { color, dashed: true })] : []
    );

    if (!view.bounds) {
      moveCamera(map, { center: view.focus, zoom: 11 }, 800);
      return accomMarker;
    }
    moveCamera(map, { bounds: view.bounds, maxZoom: 16 }, 800);
    return null;
  }

  // ── Modo SEMANA ───────────────────────────────────────────────────────────
  function renderWeekMode(map: MapLibreMap, selectedDay: DayEntry): Marker | null {
    const weekDays = getWeekGroup(itinerary, selectedDay.date, startDate);
    const color = weekColor(selectedDay.date, startDate, WEEK_COLORS_HEX);
    const coords = weekDays.map((d) => d.accommodationCoords);

    setRoute(coords.length > 1 ? [lineFeature(coords, { color, dashed: true })] : []);

    let selected: Marker | null = null;
    weekDays.forEach((d) => {
      const isSelected = d.date === selectedDay.date;
      const marker = addDayMarker(d, isSelected);
      if (isSelected) selected = marker;
    });

    if (coords.length > 0) {
      moveCamera(map, { bounds: boundsOf(coords), maxZoom: 11 }, 800);
    }
    return selected;
  }

  // ── Modo COMPLETO ─────────────────────────────────────────────────────────
  function renderFullMode(map: MapLibreMap, selectedDay: DayEntry | null): Marker | null {
    // Un tramo por par de días, con el color de la semana del día de llegada
    setRoute(
      itinerary.slice(1).map((d, i) =>
        lineFeature([itinerary[i].accommodationCoords, d.accommodationCoords], {
          color: weekColor(d.date, startDate, WEEK_COLORS_HEX),
          dashed: false,
        })
      )
    );

    let selected: Marker | null = null;
    itinerary.forEach((d) => {
      const isSelected = selectedDay?.date === d.date;
      const marker = addDayMarker(d, isSelected);
      if (isSelected) selected = marker;
    });

    if (itinerary.length > 0) {
      moveCamera(map, { bounds: boundsOf(itinerary.map((d) => d.accommodationCoords)), maxZoom: 9 }, 1000);
    }
    return selected;
  }

  return <div ref={containerRef} className="trip-map w-full h-full" />;
}
