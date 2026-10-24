import { describe, expect, it } from "vitest";
import { getAllTrips } from "@/data/trips";
import { makeDay } from "@/components/__tests__/fixtures";
import { BASE_PLAN, layerTiles, lngLatToTile, planTiles, tileKey, tileUrl, tilesInRadius } from "./map-tiles";

const NONE = { detail: false, maxDetail: false, wide: false, relief: false, reliefHigh: false };

describe("lngLatToTile", () => {
  it("convierte coordenadas al tile que las contiene", () => {
    // Tokio (Asakusa) en zoom 10
    expect(lngLatToTile(139.7983, 35.7119, 10)).toEqual({ x: 909, y: 403 });
    expect(lngLatToTile(0, 0, 0)).toEqual({ x: 0, y: 0 });
  });
});

describe("tilesInRadius", () => {
  it("un radio chico cae en pocos tiles", () => {
    const tiles = tilesInRadius([35.7119, 139.7983], 0.1, 14);
    expect(tiles.length).toBeGreaterThanOrEqual(1);
    expect(tiles.length).toBeLessThanOrEqual(4);
    tiles.forEach((t) => expect(t.z).toBe(14));
  });

  it("un radio más grande cubre más tiles", () => {
    expect(tilesInRadius([35.7119, 139.7983], 5, 14).length).toBeGreaterThan(9);
  });
});

describe("planTiles", () => {
  const day = makeDay("2026-11-01", "Dom", {
    pois: [{ name: "Senso-ji", coords: [35.7148, 139.7967] }],
  });

  it("no repite tiles aunque varios días compartan lugares", () => {
    const one = planTiles([day], BASE_PLAN);
    const repeated = planTiles([day, { ...day, date: "2026-11-02" }], BASE_PLAN);
    expect(repeated).toEqual(one);
    expect(new Set(one.map(tileKey)).size).toBe(one.length);
  });

  it("incluye la vista general de todo el viaje", () => {
    expect(planTiles([day], BASE_PLAN).some((t) => t.z === 5)).toBe(true);
  });

  it("no baja el mapa de los días de vuelo fuera del destino (Bogotá, Ámsterdam)", () => {
    const flight = makeDay("2026-10-31", "Sáb", { accommodation: "---", isTransit: true, enRoute: true, accommodationCoords: [52.31, 4.77] });
    expect(planTiles([flight, day], BASE_PLAN)).toEqual(planTiles([day], BASE_PLAN));
  });
});

describe("layerTiles", () => {
  const day = makeDay("2026-11-01", "Dom", {
    pois: [{ name: "Senso-ji", coords: [35.7148, 139.7967] }],
  });
  const count = (layers: typeof NONE) => layerTiles([day], layers).vector.length;

  it("solo la base: mapa hasta zoom 14 y sin relieve", () => {
    const { vector, dem } = layerTiles([day], NONE);
    expect(Math.max(...vector.map((t) => t.z))).toBe(14);
    expect(dem).toEqual([]);
  });

  it("cada capa opcional suma tiles a la base", () => {
    const base = count(NONE);
    expect(count({ ...NONE, detail: true })).toBeGreaterThan(base);
    expect(count({ ...NONE, wide: true })).toBeGreaterThan(base);
    expect(count({ ...NONE, maxDetail: true })).toBeGreaterThan(base);
  });

  it("detalle máximo en zona amplia: más área en zoom 14 (el máximo de la fuente)", () => {
    const z14 = (layers: typeof NONE) => layerTiles([day], layers).vector.filter((t) => t.z === 14).length;
    expect(z14({ ...NONE, maxDetail: true })).toBeGreaterThan(z14({ ...NONE, detail: true }));
    expect(Math.max(...layerTiles([day], { ...NONE, maxDetail: true }).vector.map((t) => t.z))).toBe(14);
  });

  it("el relieve en alta resolución suma zoom 13 a 15 alrededor de los lugares", () => {
    const dem = layerTiles([day], { ...NONE, relief: true, reliefHigh: true }).dem;
    expect(Math.max(...dem.map((t) => t.z))).toBe(15);
    expect(dem.some((t) => t.z === 13)).toBe(true);
    expect(dem.length).toBeGreaterThan(layerTiles([day], { ...NONE, relief: true }).dem.length);
  });

  it("el relieve llega hasta zoom 12 y crece con las capas elegidas", () => {
    const dem = layerTiles([day], { ...NONE, relief: true }).dem;
    expect(Math.max(...dem.map((t) => t.z))).toBe(12);
    expect(layerTiles([day], { ...NONE, detail: true, wide: true, relief: true }).dem.length).toBeGreaterThan(dem.length);
  });

  it("para Japón queda en un tamaño razonable de descargar", () => {
    const japan = getAllTrips().find((t) => t.meta.slug === "japan")!;
    const base = layerTiles(japan.itinerary, { ...NONE, relief: true });
    expect(base.vector.length).toBeGreaterThan(300);
    expect(base.vector.length).toBeLessThan(1500);
    const all = layerTiles(japan.itinerary, { detail: true, maxDetail: true, wide: true, relief: true, reliefHigh: true });
    expect(all.vector.length + all.dem.length).toBeLessThan(8000);
  });
});

describe("tileUrl", () => {
  it("completa la plantilla de la fuente", () => {
    expect(tileUrl("https://t.org/{z}/{x}/{y}.pbf", { z: 10, x: 909, y: 403 })).toBe("https://t.org/10/909/403.pbf");
  });
});
