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
  };

  class FakeMap {
    handlers: Record<string, Handler[]> = {};
    fitBounds = vi.fn();
    flyTo = vi.fn();
    source = { setData: (data: { features: unknown[] }) => state.routes.push(data) };
    constructor() {
      state.maps.push(this);
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
    addControl() {}
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
    constructor(options?: { element?: HTMLElement }) {
      state.alive++;
      if (options?.element) state.elements.push(options.element);
    }
    setLngLat() {
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

  return {
    state,
    module: {
      Map: FakeMap,
      Marker: FakeMarker,
      Popup: FakePopup,
      NavigationControl: Control,
      TerrainControl: Control,
      AttributionControl: Control,
      setWorkerUrl: () => {},
    },
  };
});

vi.mock("maplibre-gl", () => fake.module);

import TripMap, { type MapMode } from "@/components/TripMap";

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

function props(day: DayEntry, mode: MapMode) {
  return { day, mode, itinerary, startDate: "2026-11-01", center: [35.7, 139.8] as [number, number], zoom: 6 };
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

describe("TripMap", () => {
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
