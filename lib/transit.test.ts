import { describe, expect, it } from "vitest";
import type { DayEntry } from "@/types/DayEntry";
import { WEEK_COLORS_HEX } from "@/lib/itinerary-utils";
import { TRANSIT_STYLE, dayTransitLines, greatCircle, transitKind, transitLegs, transitSignature, type Places } from "./transit";

const places: Places = {
  Fukuyama: [34.4891, 133.3621],
  "Shin-Osaka": [34.7334, 135.5002],
  Kamakura: [35.319, 139.5507],
  Enoshima: [35.3089, 139.487],
  Shinjuku: [35.6896, 139.7006],
  "Bogotá (BOG)": [4.7016, -74.1469],
  "Ámsterdam (AMS)": [52.3105, 4.7683],
};

function makeDay(transport: DayEntry["transport"]): DayEntry {
  return {
    date: "2026-11-08",
    label: "x",
    location: "x",
    category: "x",
    notes: "",
    weekday: "Dom",
    food: "",
    transport,
    accommodation: "x",
    zona: "x",
    accommodationCoords: [34.3, 135.58],
    budget: "$1",
    activitiesDay: [],
    activitiesNight: [],
    isTransit: false,
  };
}

describe("transitKind", () => {
  it("traza por las vías los trenes, por la ruta los buses y en arco los vuelos", () => {
    expect(transitKind("tren")).toBe("rail");
    expect(transitKind("metro")).toBe("rail");
    expect(transitKind("tranvía")).toBe("rail");
    expect(transitKind("bus")).toBe("road");
    expect(transitKind("ferry")).toBe("straight");
    expect(transitKind("teleférico")).toBe("straight");
    expect(transitKind("avión")).toBe("flight");
  });

  it("no dibuja a pie ni en bici (ya los trazan las rutas del día)", () => {
    expect(transitKind("caminar")).toBeUndefined();
    expect(transitKind("bicicleta")).toBeUndefined();
  });
});

describe("transitLegs", () => {
  it("ubica cada tramo que se dibuja, con sus paradas intermedias, y conserva su índice", () => {
    const day = makeDay([
      { mode: "caminar", from: "Hotel", to: "Fukuyama" },
      { mode: "tren", from: "Fukuyama", to: "Shin-Osaka" },
      { mode: "tren", from: "Enoshima", to: "Shinjuku", via: ["Kamakura"] },
    ]);
    const { legs, missing } = transitLegs(day, places);
    expect(missing).toEqual([]);
    expect(legs.map((l) => [l.index, l.kind])).toEqual([
      [1, "rail"],
      [2, "rail"],
    ]);
    expect(legs[1].points).toEqual([places.Enoshima, places.Kamakura, places.Shinjuku]);
  });

  it("avisa qué lugares no están en el diccionario y no dibuja ese tramo", () => {
    const { legs, missing } = transitLegs(makeDay([{ mode: "bus", from: "Fukuyama", to: "Ningún lado" }]), places);
    expect(legs).toEqual([]);
    expect(missing).toEqual(["Ningún lado"]);
  });
});

describe("transitSignature", () => {
  it("cambia si cambia un tramo o la ubicación de una parada", () => {
    const day = makeDay([{ mode: "tren", from: "Fukuyama", to: "Shin-Osaka" }]);
    const base = transitSignature(day, places);
    expect(transitSignature(makeDay([{ mode: "bus", from: "Fukuyama", to: "Shin-Osaka" }]), places)).not.toBe(base);
    expect(transitSignature(day, { ...places, Fukuyama: [34.49, 133.36] })).not.toBe(base);
  });

  it("no cambia por la duración, el costo o las notas del tramo", () => {
    const day = makeDay([{ mode: "tren", from: "Fukuyama", to: "Shin-Osaka" }]);
    const edited = makeDay([{ mode: "tren", from: "Fukuyama", to: "Shin-Osaka", duration: "1h", note: "x" }]);
    expect(transitSignature(edited, places)).toBe(transitSignature(day, places));
  });
});

describe("greatCircle", () => {
  it("va de un punto al otro en [lng, lat] y se curva hacia el polo", () => {
    const line = greatCircle(places["Bogotá (BOG)"], places["Ámsterdam (AMS)"], 32);
    expect(line).toHaveLength(33);
    expect(line[0]).toEqual([-74.1469, 4.7016]);
    expect(line[32][0]).toBeCloseTo(4.7683, 4);
    expect(line[32][1]).toBeCloseTo(52.3105, 4);
    // A mitad de camino pasa más al norte que la recta en el mapa
    expect(line[16][1]).toBeGreaterThan((4.7016 + 52.3105) / 2);
  });
});

describe("dayTransitLines", () => {
  const day = makeDay([
    { mode: "tren", from: "Fukuyama", to: "Shin-Osaka" },
    { mode: "avión", from: "Bogotá (BOG)", to: "Ámsterdam (AMS)" },
  ]);

  it("usa el trazado precalculado si está al día", () => {
    const rail: [number, number][] = [[133.3621, 34.4891], [134, 34.6], [135.5002, 34.7334]];
    const lines = dayTransitLines(day, places, { signature: transitSignature(day, places), lines: { 0: rail } });
    expect(lines[0].line).toBe(rail);
    expect(lines[0].kind).toBe("rail");
  });

  it("sin trazado (o viejo) une las paradas en recta, y los vuelos en arco", () => {
    const lines = dayTransitLines(day, places, { signature: "vieja", lines: {} });
    expect(lines[0].line).toEqual([[133.3621, 34.4891], [135.5002, 34.7334]]);
    expect(lines[1].line.length).toBeGreaterThan(2);
  });
});

describe("TRANSIT_STYLE", () => {
  it("no usa los colores de las semanas (son los de las rutas a pie)", () => {
    const weeks = new Set<string>(WEEK_COLORS_HEX);
    Object.values(TRANSIT_STYLE).forEach((s) => expect(weeks.has(s.color), s.label).toBe(false));
  });
});
