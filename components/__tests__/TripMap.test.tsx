// @vitest-environment jsdom
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { DayEntry } from "@/types/DayEntry";
import { fixtureTrip, makeDay } from "./fixtures";

// ── Doble de MapLibre: registra lo que el componente dibuja ────────────────
const fake = vi.hoisted(() => {
  type Handler = () => void;
  const state = {
    maps: [] as FakeMap[],
    alive: 0,
    routes: [] as { features: unknown[] }[],
    elements: [] as HTMLElement[],
    toggles: 0,
    controls: [] as unknown[],
    markers: [] as { lngLat: unknown; element?: HTMLElement }[],
    mapOptions: [] as Record<string, unknown>[],
  };

  class FakeMap {
    handlers: Record<string, Handler[]> = {};
    fitBounds = vi.fn();
    flyTo = vi.fn();
    easeTo = vi.fn();
    source = { setData: (data: { features: unknown[] }) => state.routes.push(data) };
    constructor(options: Record<string, unknown> = {}) {
      state.maps.push(this);
      state.mapOptions.push(options);
    }
    on(event: string, fn: Handler) {
      (this.handlers[event] ??= []).push(fn);
      return this;
    }
    once(event: string, fn: Handler) {
      return this.on(event, fn);
    }
    emit(event: string) {
      (this.handlers[event] ?? []).forEach((fn) => fn());
    }
    // Como en un celular real: siempre hay tiles cargando
    isStyleLoaded() {
      return false;
    }
    addControl(control: unknown) {
      state.controls.push(control);
    }
    addSource() {}
    addLayer() {}
    getLayer() {
      return undefined;
    }
    getSource() {
      return this.source;
    }
    getStyle() {
      return { layers: [] };
    }
    resize() {}
    remove() {}
  }

  class FakePopup {
    setHTML() {
      return this;
    }
    isOpen() {
      return false;
    }
  }

  class FakeMarker {
    popup: FakePopup | null = null;
    lngLat: unknown = null;
    element?: HTMLElement;
    constructor(options?: { element?: HTMLElement }) {
      state.alive++;
      this.element = options?.element;
      if (options?.element) state.elements.push(options.element);
      state.markers.push(this);
    }
    setLngLat(lngLat: unknown) {
      this.lngLat = lngLat;
      return this;
    }
    setPopup(popup: FakePopup) {
      this.popup = popup;
      return this;
    }
    getPopup() {
      return this.popup;
    }
    togglePopup() {
      state.toggles++;
    }
    addTo() {
      return this;
    }
    remove() {
      state.alive--;
    }
  }

  class Control {}
  class GeolocateControl {
    handlers: Record<string, () => void> = {};
    constructor(public options: Record<string, unknown>) {}
    on(event: string, fn: () => void) {
      this.handlers[event] = fn;
      return this;
    }
  }

  return {
    state,
    module: {
      Map: FakeMap,
      Marker: FakeMarker,
      Popup: FakePopup,
      NavigationControl: Control,
      TerrainControl: Control,
      AttributionControl: Control,
      GeolocateControl,
      setWorkerUrl: () => {},
    },
  };
});

vi.mock("maplibre-gl", () => fake.module);

import TripMap, { type MapMode } from "@/components/TripMap";
import { poiSignature, type DayRoutes } from "@/lib/route-plan";
import { toLngLat } from "@/lib/map-geo";

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

afterEach(() => {
  cleanup();
  fake.state.maps.length = 0;
  fake.state.routes.length = 0;
  fake.state.alive = 0;
  fake.state.elements.length = 0;
  fake.state.toggles = 0;
  fake.state.controls.length = 0;
  fake.state.markers.length = 0;
  fake.state.mapOptions.length = 0;
});

/** Elementos de los marcadores de día que siguen en el mapa (los últimos dibujados) */
const dayMarkerEls = (count: number) => fake.state.elements.slice(-count);

const withPois = (day: DayEntry, n: number): DayEntry => ({
  ...day,
  pois: Array.from({ length: n }, (_, i) => ({ name: `Lugar ${i}`, coords: [35.5 + i * 0.01, 138.7] as [number, number] })),
});

const itinerary = [
  withPois(fixtureTrip.itinerary[0], 2),
  withPois(fixtureTrip.itinerary[1], 4),
  makeDay("2026-11-03", "Mar", { accommodationCoords: [34.39, 132.47] }),
];

const PADDING = { top: 140, bottom: 480, left: 32, right: 56 };

function props(day: DayEntry, mode: MapMode, padding = PADDING) {
  return { day, mode, itinerary, startDate: "2026-11-01", center: [35.7, 139.8] as [number, number], zoom: 6, padding };
}

async function renderLoadedMap(day: DayEntry, mode: MapMode) {
  const view = render(<TripMap {...props(day, mode)} />);
  await waitFor(() => expect(fake.state.maps).toHaveLength(1));
  const map = fake.state.maps[0];
  act(() => {
    map.emit("style.load");
    map.emit("load");
  });
  return { ...view, map };
}

const routedDay = withPois(fixtureTrip.itinerary[0], 3);
const pois = routedDay.pois!;
const dayRoutes: DayRoutes = {
  signature: poiSignature(routedDay),
  order: [2, 0, 1],
  legs: [
    { from: "lodging", to: 2, mode: "foot", distanceM: 500, durationS: 400, line: [[139.79, 35.71], [138.7, 35.52]] },
    { from: 2, to: 0, mode: "foot", distanceM: 2200, durationS: 1600, line: [[138.7, 35.52], [138.71, 35.51], [138.7, 35.5]] },
    { from: 0, to: 1, mode: "transit", distanceM: 9000, durationS: 1800 },
  ],
  fromLodging: { 2: { distanceM: 500, durationS: 400, line: [[139.79, 35.71], [139.0, 35.6], [138.7, 35.52]] } },
};

describe("TripMap con rutas", () => {
  async function renderRouted(focusedPoi: { index: number; nonce: number } | null = null) {
    const view = await renderLoadedMap(routedDay, "day");
    view.rerender(<TripMap {...props(routedDay, "day")} routes={dayRoutes} focusedPoi={focusedPoi} />);
    return view;
  }

  it("dibuja el trazado real de cada tramo y una recta punteada en los de tren o bus", async () => {
    await renderRouted();
    const features = fake.state.routes.at(-1)!.features as {
      properties: { dashed: boolean };
      geometry: { coordinates: unknown };
    }[];
    expect(features).toHaveLength(3);
    expect(features[0].geometry.coordinates).toEqual(dayRoutes.legs[0].line);
    expect(features[0].properties.dashed).toBe(false);
    expect(features[2].properties.dashed).toBe(true);
    expect(features[2].geometry.coordinates).toEqual([toLngLat(pois[0].coords), toLngLat(pois[1].coords)]);
  });

  it("las letras siguen el orden de visita y cada lugar lleva su ícono", async () => {
    await renderRouted();
    const poiMarkers = fake.state.markers.slice(-3);
    expect(poiMarkers.map((m) => m.element?.querySelector("[data-letter]")?.textContent)).toEqual(["A", "B", "C"]);
    expect(poiMarkers.map((m) => m.element?.querySelector("[data-icon]")?.textContent)).toEqual(["📍", "📍", "📍"]);
    expect(poiMarkers[0].lngLat).toEqual(toLngLat(pois[2].coords));
  });

  it("no pisa el posicionamiento absoluto de los marcadores de MapLibre", async () => {
    // Con position inline, los marcadores se apilan en el flujo y quedan corridos
    // de su lugar real (cada uno más abajo que el anterior)
    await renderRouted();
    fake.state.markers.forEach((m) => expect(m.element?.style.position ?? "").toBe(""));
  });

  it("en el modo día marca el hospedaje con una cama", async () => {
    await renderRouted();
    const lodging = fake.state.markers.find((m) => m.element?.getAttribute("aria-label") === "Hospedaje");
    expect(lodging).toBeTruthy();
    expect(lodging!.element!.textContent).toBe("🛏️");
    expect(lodging!.lngLat).toEqual(toLngLat(routedDay.accommodationCoords));
  });

  it("al tocar un lugar cercano dibuja la ruta a pie desde el hospedaje", async () => {
    const { rerender } = await renderRouted();
    rerender(<TripMap {...props(routedDay, "day")} routes={dayRoutes} focusedPoi={{ index: 2, nonce: 1 }} />);
    const features = fake.state.routes.at(-1)!.features as { properties: { color: string }; geometry: { coordinates: unknown } }[];
    const fromLodging = features.find((f) => f.geometry.coordinates === dayRoutes.fromLodging[2].line);
    expect(fromLodging).toBeTruthy();
    expect(fromLodging!.properties.color).toBe("#e11d48");
  });
});

describe("TripMap", () => {
  it("tiene el botón de mi ubicación, que sigue al usuario con GPS", async () => {
    await renderLoadedMap(itinerary[0], "day");
    const geo = fake.state.controls.find((c) => c instanceof fake.module.GeolocateControl) as
      | { options: Record<string, unknown> }
      | undefined;
    expect(geo).toBeTruthy();
    expect(geo!.options).toMatchObject({
      trackUserLocation: true,
      showAccuracyCircle: true,
      positionOptions: { enableHighAccuracy: true },
    });
  });

  it("deja fijo el margen libre del mapa, para que tu ubicación no quede debajo de la hoja", async () => {
    const { map } = await renderLoadedMap(itinerary[1], "day");
    expect(map.fitBounds).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ padding: PADDING, absolutePadding: true })
    );
  });

  it("si te está siguiendo, mover la hoja corre el margen sin cortar el seguimiento", async () => {
    const { rerender, map } = await renderLoadedMap(itinerary[1], "day");
    const geo = fake.state.controls.find((c) => c instanceof fake.module.GeolocateControl) as {
      handlers: Record<string, () => void>;
    };
    act(() => geo.handlers.trackuserlocationstart());
    map.fitBounds.mockClear();
    const sheetDown = { ...PADDING, bottom: 260 };
    rerender(<TripMap {...props(itinerary[1], "day", sheetDown)} />);
    expect(map.easeTo).toHaveBeenLastCalledWith(expect.objectContaining({ padding: sheetDown }));
    expect(map.fitBounds).not.toHaveBeenCalled();
  });

  it("muestra los controles del mapa en español", async () => {
    await renderLoadedMap(itinerary[0], "day");
    expect(fake.state.mapOptions[0].locale).toMatchObject({
      "GeolocateControl.FindMyLocation": "Mi ubicación",
      "NavigationControl.ZoomIn": "Acercar",
      "NavigationControl.ZoomOut": "Alejar",
    });
  });

  it("dibuja el día al terminar de cargar: hospedaje + lugares + ruta", async () => {
    await renderLoadedMap(itinerary[1], "day");
    expect(fake.state.alive).toBe(1 + 4);
    expect(fake.state.routes.at(-1)?.features).toHaveLength(1);
  });

  it("cambia a modo semana aunque haya tiles cargando", async () => {
    const { rerender, map } = await renderLoadedMap(itinerary[0], "day");
    rerender(<TripMap {...props(itinerary[0], "week")} />);
    // Semana: un marcador por día y sin puntos de interés
    expect(fake.state.alive).toBe(3);
    expect(map.fitBounds).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ maxZoom: 11 }));
  });

  it("dibuja la ruta del día nuevo aunque haya tiles cargando", async () => {
    const { rerender } = await renderLoadedMap(itinerary[2], "day");
    expect(fake.state.routes.at(-1)?.features).toHaveLength(0);
    rerender(<TripMap {...props(itinerary[1], "day")} />);
    expect(fake.state.alive).toBe(1 + 4);
    expect(fake.state.routes.at(-1)?.features).toHaveLength(1);
  });

  it("en modo semana no abre la ficha del día sola", async () => {
    const { rerender, map } = await renderLoadedMap(itinerary[0], "day");
    rerender(<TripMap {...props(itinerary[1], "week")} />);
    act(() => map.emit("moveend"));
    expect(fake.state.toggles).toBe(0);
  });

  it("en modo semana y completo deja el día elegido encima de los demás", async () => {
    const { rerender } = await renderLoadedMap(itinerary[0], "day");
    for (const mode of ["week", "full"] as const) {
      rerender(<TripMap {...props(itinerary[1], mode)} />);
      const els = dayMarkerEls(3);
      const selected = els.find((el) => el.textContent === "2")!;
      const others = els.filter((el) => el !== selected);
      others.forEach((el) => expect(Number(selected.style.zIndex)).toBeGreaterThan(Number(el.style.zIndex || 0)));
    }
  });

  it("en modo día sin lugares abre la ficha del hospedaje", async () => {
    const { map } = await renderLoadedMap(itinerary[2], "day");
    act(() => map.emit("moveend"));
    expect(fake.state.toggles).toBe(1);
  });
});
