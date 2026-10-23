import { describe, expect, it } from "vitest";
import type { DayEntry } from "@/types/DayEntry";
import {
  boundsOf,
  dayView,
  distanceKm,
  escapeHtml,
  lineFeature,
  poiLetter,
  toLngLat,
  weekColor,
} from "./map-geo";

function makeDay(overrides: Partial<DayEntry> = {}): DayEntry {
  return {
    date: "2026-11-01",
    label: "Día",
    location: "Tokio",
    category: "Naturaleza",
    notes: "",
    weekday: "Dom",
    food: "",
    transport: [],
    accommodation: "Hostal",
    zona: "Asakusa, Tokio",
    accommodationCoords: [35.7119, 139.7983],
    budget: "$65",
    activitiesDay: [],
    activitiesNight: [],
    isTransit: false,
    ...overrides,
  };
}

describe("toLngLat", () => {
  it("invierte [lat, lng] de los datos al [lng, lat] que usa MapLibre", () => {
    expect(toLngLat([35.7119, 139.7983])).toEqual([139.7983, 35.7119]);
  });
});

describe("distanceKm", () => {
  it("mide la distancia entre dos puntos [lat, lng]", () => {
    // Tokio → Kioto ≈ 365 km en línea recta
    expect(distanceKm([35.6812, 139.7671], [34.9858, 135.7588])).toBeGreaterThan(355);
    expect(distanceKm([35.6812, 139.7671], [34.9858, 135.7588])).toBeLessThan(375);
    expect(distanceKm([35, 139], [35, 139])).toBe(0);
  });
});

describe("boundsOf", () => {
  it("devuelve [[oeste, sur], [este, norte]] en orden lng/lat", () => {
    expect(boundsOf([[35, 139], [36, 140], [34.5, 139.5]])).toEqual([[139, 34.5], [140, 36]]);
  });

  it("falla si no hay puntos", () => {
    expect(() => boundsOf([])).toThrow();
  });
});

describe("lineFeature", () => {
  it("arma un LineString GeoJSON en lng/lat con sus propiedades", () => {
    expect(lineFeature([[35, 139], [36, 140]], { color: "#f00", dashed: true })).toEqual({
      type: "Feature",
      properties: { color: "#f00", dashed: true },
      geometry: { type: "LineString", coordinates: [[139, 35], [140, 36]] },
    });
  });
});

describe("poiLetter", () => {
  it("numera los puntos con letras", () => {
    expect(poiLetter(0)).toBe("A");
    expect(poiLetter(25)).toBe("Z");
  });
});

describe("weekColor", () => {
  it("asigna el color de la semana del día y repite la paleta", () => {
    const palette = ["#a", "#b"];
    expect(weekColor("2026-11-01", "2026-11-01", palette)).toBe("#a");
    expect(weekColor("2026-11-08", "2026-11-01", palette)).toBe("#b");
    expect(weekColor("2026-11-15", "2026-11-01", palette)).toBe("#a");
  });
});

describe("escapeHtml", () => {
  it("escapa los caracteres especiales de HTML", () => {
    expect(escapeHtml(`<b>"K's" & co</b>`)).toBe("&lt;b&gt;&quot;K&#39;s&quot; &amp; co&lt;/b&gt;");
  });
});

describe("dayView", () => {
  it("sin puntos de interés, encuadra solo el hospedaje", () => {
    const view = dayView(makeDay());
    expect(view.points).toEqual([]);
    expect(view.bounds).toBeNull();
    expect(view.focus).toEqual([139.7983, 35.7119]);
  });

  it("incluye el hospedaje en el encuadre cuando está cerca de los puntos", () => {
    const view = dayView(
      makeDay({ pois: [{ name: "Senso-ji", coords: [35.7134, 139.7955] }] })
    );
    expect(view.includeAccommodation).toBe(true);
    expect(view.bounds).toEqual([[139.7955, 35.7119], [139.7983, 35.7134]]);
  });

  it("deja afuera el hospedaje en las excursiones lejanas", () => {
    // Nikko desde Asakusa: ~120 km
    const view = dayView(
      makeDay({
        pois: [
          { name: "Toshogu", coords: [36.758, 139.599] },
          { name: "Kanmangafuchi", coords: [36.751, 139.586] },
        ],
      })
    );
    expect(view.includeAccommodation).toBe(false);
    expect(view.bounds).toEqual([[139.586, 36.751], [139.599, 36.758]]);
    expect(view.points.map((p) => p.letter)).toEqual(["A", "B"]);
    expect(view.points[0].lngLat).toEqual([139.599, 36.758]);
  });
});
