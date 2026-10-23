import { describe, expect, it } from "vitest";
import type { DayEntry } from "@/types/DayEntry";
import {
  boundsOf,
  dayView,
  distanceKm,
  escapeHtml,
  hasBed,
  lineFeature,
  morningLodging,
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

  it("incluye la cama donde amanecés si está cerca de los lugares del día", () => {
    // Amanecés en Ueno, paseás por Yanaka y dormís en Narita (lejos)
    const view = dayView(
      makeDay({
        accommodationCoords: [35.7775, 140.3117],
        pois: [{ name: "Yanaka Ginza", coords: [35.7277, 139.7653] }],
      }),
      [35.7101, 139.7792]
    );
    expect(view.includeMorning).toBe(true);
    expect(view.includeAccommodation).toBe(false);
    expect(view.bounds).toEqual([[139.7653, 35.7101], [139.7792, 35.7277]]);
  });

  it("deja afuera la cama donde amanecés si quedó lejos", () => {
    // Amanecés en Narita y el día es en Hiroshima
    const view = dayView(
      makeDay({ accommodationCoords: [34.3915, 132.4415], pois: [{ name: "Parque de la Paz", coords: [34.3932, 132.4523] }] }),
      [35.7775, 140.3117]
    );
    expect(view.includeMorning).toBe(false);
  });
});

describe("morningLodging", () => {
  const days = [
    makeDay({ date: "2026-11-01", accommodation: "Ueno", accommodationCoords: [35.7101, 139.7792] }),
    makeDay({ date: "2026-11-02", accommodation: "Ueno", accommodationCoords: [35.7101, 139.7792] }),
    makeDay({ date: "2026-11-03", accommodation: "Narita", accommodationCoords: [35.7775, 140.3117] }),
    makeDay({ date: "2026-11-04", accommodation: "---", isTransit: true, accommodationCoords: [35.772, 140.3929] }),
    makeDay({ date: "2026-11-05", accommodation: "Hiroshima", accommodationCoords: [34.3915, 132.4415] }),
  ];

  it("devuelve la cama de anoche cuando hoy dormís en otra", () => {
    expect(morningLodging(days, days[2])).toBe(days[1]);
    expect(morningLodging(days, days[3])).toBe(days[2]);
  });

  it("no devuelve nada si seguís en la misma cama o es el primer día", () => {
    expect(morningLodging(days, days[1])).toBeNull();
    expect(morningLodging(days, days[0])).toBeNull();
  });

  it("no devuelve nada si anoche no hubo cama (tránsito, bus nocturno o '---')", () => {
    expect(morningLodging(days, days[4])).toBeNull();
  });
});

describe("hasBed", () => {
  it("es falso en tránsito, bus nocturno o sin hospedaje", () => {
    expect(hasBed(makeDay())).toBe(true);
    expect(hasBed(makeDay({ isTransit: true }))).toBe(false);
    expect(hasBed(makeDay({ nightBus: "#1" }))).toBe(false);
    expect(hasBed(makeDay({ accommodation: "---" }))).toBe(false);
  });
});
