import { describe, expect, it } from "vitest";
import { searchItinerary } from "@/lib/search";
import { makeDay } from "@/components/__tests__/fixtures";

const itinerary = [
  makeDay("2026-11-02", "Lun", {
    label: "Nikko: Toshogu + abismo Kanmangafuchi",
    location: "Nikko",
    activitiesDay: ["Puente sagrado Shinkyo", { text: "Santuario Toshogu", price: { amount: 1600, currency: "JPY" } }],
    pois: [{ name: "Abismo Kanmangafuchi", coords: [36.749, 139.588] }],
  }),
  makeDay("2026-11-14", "Sáb", {
    label: "Costa de Kii en tren → Kioto",
    location: "Kioto",
    food: "Matcha en Uji",
    transport: [{ mode: "tren", line: "Expreso limitado Kuroshio", from: "Shingu", to: "Shin-Osaka" }],
  }),
];

describe("searchItinerary", () => {
  it("también busca en las notas del viaje compartido", () => {
    const notes = [{ id: "n", day: "2026-11-14", text: "Probar el helado de té", author: "karla", createdAt: 1 }];
    const hits = searchItinerary(itinerary, "helado", notes);
    expect(hits.map((h) => h.day.date)).toEqual(["2026-11-14"]);
    expect(hits[0].matches).toEqual([{ field: "Nota", text: "Probar el helado de té" }]);
  });

  it("encuentra el día y dice en qué parte aparece", () => {
    const hits = searchItinerary(itinerary, "toshogu");
    expect(hits.map((h) => h.day.date)).toEqual(["2026-11-02"]);
    expect(hits[0].matches).toEqual([
      { field: "Día", text: "Nikko: Toshogu + abismo Kanmangafuchi" },
      { field: "Actividad", text: "Santuario Toshogu" },
    ]);
  });

  it("no distingue mayúsculas ni tildes", () => {
    expect(searchItinerary(itinerary, "KIOTO").map((h) => h.day.date)).toEqual(["2026-11-14"]);
    expect(searchItinerary(itinerary, "nikkō").map((h) => h.day.date)).toEqual(["2026-11-02"]);
    expect(searchItinerary(itinerary, "sabado")).toEqual([]);
  });

  it("busca en el transporte, la comida y los lugares del mapa", () => {
    expect(searchItinerary(itinerary, "kuroshio")[0].matches).toEqual([
      { field: "Transporte", text: "Shingu → Shin-Osaka · Expreso limitado Kuroshio" },
    ]);
    expect(searchItinerary(itinerary, "matcha")[0].matches).toEqual([{ field: "Comida", text: "Matcha en Uji" }]);
    expect(searchItinerary(itinerary, "abismo")[0].matches).toContainEqual({ field: "Lugar", text: "Abismo Kanmangafuchi" });
  });

  it("con varias palabras, el día tiene que tenerlas todas", () => {
    expect(searchItinerary(itinerary, "nikko shinkyo").map((h) => h.day.date)).toEqual(["2026-11-02"]);
    expect(searchItinerary(itinerary, "nikko kuroshio")).toEqual([]);
  });

  it("no devuelve nada si no está o si la búsqueda está vacía", () => {
    expect(searchItinerary(itinerary, "universal studios")).toEqual([]);
    expect(searchItinerary(itinerary, "   ")).toEqual([]);
  });
});
