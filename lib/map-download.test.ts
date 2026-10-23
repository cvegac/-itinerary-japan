import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeDay } from "@/components/__tests__/fixtures";
import { MAP_STYLE } from "./map-sources";
import { TRIP_MAP_CACHE, deleteTripMap, downloadTripMap, estimateTripMap, hasHiResRelief, tripMapStatus } from "./map-download";

const TILEJSON = "https://tiles.openfreemap.org/planet";
const VECTOR = "https://tiles.openfreemap.org/planet/v1/{z}/{x}/{y}.pbf";

const itinerary = [
  makeDay("2026-11-01", "Dom", { pois: [{ name: "Senso-ji", coords: [35.7148, 139.7967] }] }),
];

// ── Dobles de caches y fetch ───────────────────────────────────────────────
let store: Map<string, Map<string, Response>>;
let fetched: string[];
let failUrls: Set<string>;

beforeEach(() => {
  store = new Map();
  fetched = [];
  failUrls = new Set();
  vi.stubGlobal("caches", {
    has: async (name: string) => store.has(name),
    delete: async (name: string) => store.delete(name),
    open: async (name: string) => {
      if (!store.has(name)) store.set(name, new Map());
      const entries = store.get(name)!;
      return {
        put: async (url: string, res: Response) => void entries.set(url, res),
        keys: async () => Array.from(entries.keys()).map((u) => new Request(u)),
      };
    },
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.signal?.aborted) throw new DOMException("cancelado", "AbortError");
      fetched.push(url);
      if (failUrls.has(url)) return new Response("", { status: 500 });
      if (url === MAP_STYLE) {
        return Response.json({
          sources: {
            openmaptiles: { type: "vector", url: TILEJSON },
            ne2_shaded: { type: "raster", tiles: ["https://tiles.openfreemap.org/natural_earth/ne2sr/{z}/{x}/{y}.png"] },
          },
          sprite: "https://tiles.openfreemap.org/sprites/ofm",
          glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
        });
      }
      if (url === TILEJSON) return Response.json({ tiles: [VECTOR] });
      return new Response("12345");
    })
  );
});

const saved = () => Array.from(store.get(TRIP_MAP_CACHE)?.keys() ?? []);
const BASE = { detail: false, maxDetail: false, wide: false, relief: false, reliefHigh: false };
const ALL = { detail: true, maxDetail: true, wide: true, relief: true, reliefHigh: true };

describe("estimateTripMap", () => {
  it("estima el peso de la base y de cada capa opcional", () => {
    const e = estimateTripMap(itinerary, BASE);
    expect(e.baseBytes).toBeGreaterThan(0);
    expect(e.detailBytes).toBeGreaterThan(0);
    expect(e.wideBytes).toBeGreaterThan(0);
    expect(e.reliefBytes).toBeGreaterThan(0);
    expect(e.maxDetailBytes).toBeGreaterThan(0);
    expect(e.reliefHighBytes).toBeGreaterThan(0);
    expect(e.totalBytes).toBe(e.baseBytes);
  });

  it("el total suma las capas elegidas y el relieve crece con ellas", () => {
    const base = estimateTripMap(itinerary, { ...BASE, relief: true });
    const all = estimateTripMap(itinerary, ALL);
    expect(base.totalBytes).toBe(base.baseBytes + base.reliefBytes);
    expect(all.totalBytes).toBe(
      all.baseBytes + all.detailBytes + all.maxDetailBytes + all.wideBytes + all.reliefBytes + all.reliefHighBytes
    );
    expect(all.reliefBytes).toBeGreaterThan(base.reliefBytes);
  });
});

describe("downloadTripMap", () => {
  it("sin relieve guarda estilo, fuentes, íconos y tiles del mapa, pero no la elevación", async () => {
    const result = await downloadTripMap(itinerary, { layers: BASE });
    const urls = saved();
    expect(urls).toContain(MAP_STYLE);
    expect(urls).toContain(TILEJSON);
    expect(urls).toContain("https://tiles.openfreemap.org/sprites/ofm@2x.png");
    expect(urls).toContain("https://tiles.openfreemap.org/fonts/Noto Sans Regular/0-255.pbf");
    expect(urls.some((u) => u.startsWith("https://tiles.openfreemap.org/planet/v1/14/"))).toBe(true);
    expect(urls.some((u) => u.includes("elevation-tiles-prod"))).toBe(false);
    expect(result.failed).toBe(0);
    expect(result.done).toBe(result.total);
  });

  it("las capas opcionales suman tiles a la base", async () => {
    const base = (await downloadTripMap(itinerary, { layers: BASE })).total;
    store.clear();
    const more = (await downloadTripMap(itinerary, { layers: { ...BASE, detail: true, wide: true } })).total;
    expect(more).toBeGreaterThan(base);
  });

  it("con relieve suma los tiles de elevación", async () => {
    await downloadTripMap(itinerary, { layers: { ...BASE, relief: true } });
    expect(saved().some((u) => u.includes("elevation-tiles-prod.s3.amazonaws.com/terrarium/12/"))).toBe(true);
  });

  it("pide los tiles salteando la caché del navegador", async () => {
    await downloadTripMap(itinerary, { layers: BASE });
    const tileCall = vi.mocked(fetch).mock.calls.find(([u]) => String(u).endsWith(".pbf"))!;
    expect(tileCall[1]).toMatchObject({ cache: "reload" });
  });

  it("no vuelve a bajar lo que ya está guardado", async () => {
    await downloadTripMap(itinerary, { layers: BASE });
    fetched = [];
    const second = await downloadTripMap(itinerary, { layers: BASE });
    // Solo vuelve a pedir el estilo y el TileJSON para saber qué tiles hacen falta
    expect(fetched).toEqual([MAP_STYLE, TILEJSON]);
    expect(second.done).toBe(second.total);
  });

  it("informa el avance hasta completar", async () => {
    const progress: number[] = [];
    const result = await downloadTripMap(itinerary, { layers: BASE, onProgress: (p) => progress.push(p.done) });
    expect(progress.length).toBeGreaterThan(1);
    expect(progress).toEqual([...progress].sort((a, b) => a - b));
    expect(progress.at(-1)).toBe(result.total);
  });

  it("cuenta los tiles que fallan sin cortar la descarga", async () => {
    failUrls.add("https://tiles.openfreemap.org/sprites/ofm@2x.png");
    const result = await downloadTripMap(itinerary, { layers: BASE });
    expect(result.failed).toBe(1);
    expect(saved()).not.toContain("https://tiles.openfreemap.org/sprites/ofm@2x.png");
  });

  it("se puede cancelar", async () => {
    const controller = new AbortController();
    const result = await downloadTripMap(itinerary, {
      layers: { ...BASE, detail: true, relief: true },
      signal: controller.signal,
      onProgress: (p) => p.done >= 5 && controller.abort(),
    });
    expect(result.cancelled).toBe(true);
    expect(result.done).toBeLessThan(result.total);
  });
});

describe("tripMapStatus / deleteTripMap", () => {
  it("por defecto no hay mapa descargado (y no crea nada al preguntar)", async () => {
    expect(await tripMapStatus(itinerary)).toEqual({ downloaded: false, layers: BASE, tiles: 0 });
    expect(store.has(TRIP_MAP_CACHE)).toBe(false);
  });

  it("detecta qué capas están descargadas mirando la caché", async () => {
    await downloadTripMap(itinerary, { layers: { ...BASE, wide: true, relief: true, reliefHigh: true } });
    const status = await tripMapStatus(itinerary);
    expect(status.downloaded).toBe(true);
    expect(status.layers).toEqual({ ...BASE, wide: true, relief: true, reliefHigh: true });
    expect(status.tiles).toBeGreaterThan(0);
  });

  it("sabe si hay relieve en alta resolución descargado (para que el mapa lo pida)", async () => {
    expect(await hasHiResRelief()).toBe(false);
    await downloadTripMap(itinerary, { layers: { ...BASE, relief: true } });
    expect(await hasHiResRelief()).toBe(false);
    await downloadTripMap(itinerary, { layers: { ...BASE, relief: true, reliefHigh: true } });
    expect(await hasHiResRelief()).toBe(true);
  });

  it("se puede borrar", async () => {
    await downloadTripMap(itinerary, { layers: BASE });
    await deleteTripMap();
    expect((await tripMapStatus(itinerary)).downloaded).toBe(false);
  });
});
