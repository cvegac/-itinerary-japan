import { describe, expect, it } from "vitest";
import { dayRouteLinks, placeUrl, segmentUrl, type RouteStop } from "./google-maps";

const stop = (label: string, lat: number, modeFromPrev?: RouteStop["modeFromPrev"]): RouteStop => ({
  label,
  name: `Lugar ${label}`,
  coords: [lat, 139],
  modeFromPrev,
});

describe("links de Google Maps", () => {
  it("un lugar se abre por sus coordenadas", () => {
    expect(placeUrl([35.70761, 139.77438])).toBe("https://www.google.com/maps/search/?api=1&query=35.70761%2C139.77438");
  });

  it("el recorrido va en orden: origen, paradas y destino, a pie", () => {
    const [link] = dayRouteLinks([stop("A", 1), stop("B", 2, "foot"), stop("C", 3, "foot")]);
    expect(link).toMatchObject({ from: "A", to: "C", mode: "walking" });
    const url = new URL(link.url);
    expect(url.origin + url.pathname).toBe("https://www.google.com/maps/dir/");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      api: "1",
      origin: "1,139",
      destination: "3,139",
      waypoints: "2,139",
      travelmode: "walking",
    });
  });

  it("con más de 5 puntos se parte en tramos que se tocan (el celular acepta 3 paradas)", () => {
    const stops = ["A", "B", "C", "D", "E", "F", "G"].map((l, i) => stop(l, i, i ? "foot" : undefined));
    expect(dayRouteLinks(stops).map((l) => `${l.from}-${l.to}`)).toEqual(["A-E", "E-G"]);
  });

  it("corta donde hay tren o bus, y en bici si algún tramo es en bici", () => {
    const stops = [stop("A", 1), stop("B", 2, "bike"), stop("C", 3, "transit"), stop("D", 4, "foot"), stop("E", 5, "transit")];
    expect(dayRouteLinks(stops).map((l) => `${l.from}-${l.to} ${l.mode}`)).toEqual(["A-B bicycling", "C-D walking"]);
  });

  it("sin rutas calculadas usa el medio del día", () => {
    expect(dayRouteLinks([stop("A", 1), stop("B", 2)], "bicycling")[0].mode).toBe("bicycling");
    expect(dayRouteLinks([stop("A", 1)])).toEqual([]);
  });

  it("un tramo de tren va en transporte público entre sus estaciones", () => {
    const places = { Asakusa: [35.71, 139.79] as [number, number], "Tobu-Nikko": [36.74, 139.62] as [number, number] };
    const url = new URL(segmentUrl({ mode: "tren", from: "Asakusa", to: "Tobu-Nikko" }, places)!);
    expect(url.searchParams.get("origin")).toBe("35.71,139.79");
    expect(url.searchParams.get("destination")).toBe("36.74,139.62");
    expect(url.searchParams.get("travelmode")).toBe("transit");
    expect(segmentUrl({ mode: "caminar", from: "Asakusa", to: "Tobu-Nikko" }, places)).toContain("travelmode=walking");
  });

  it("sin coordenadas o en avión, no hay link", () => {
    expect(segmentUrl({ mode: "tren", from: "Asakusa", to: "Otro lado" }, { Asakusa: [1, 2] })).toBeNull();
    expect(segmentUrl({ mode: "avión", from: "A", to: "B" }, { A: [1, 2], B: [3, 4] })).toBeNull();
  });
});
