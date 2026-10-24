import { describe, expect, it } from "vitest";
import { computeLodgingSummary } from "@/lib/itinerary-utils";
import { poiSignature } from "@/lib/route-plan";
import { dayCostBreakdown } from "@/lib/budget";
import { itineraryIssues } from "@/lib/schema";
import { DEFAULT_POI_ICON, poiIcon } from "@/lib/poi-icons";
import { transitLegs, transitSignature } from "@/lib/transit";
import { getAllTrips } from "./index";

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function addDays(date: string, days: number): string {
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function distanceKm([lat1, lng1]: [number, number], [lat2, lng2]: [number, number]): number {
  const toRad = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * toRad) / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(((lng2 - lng1) * toRad) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

describe.each(getAllTrips().map((t) => [t.meta.slug, t] as const))("viaje %s", (_slug, trip) => {
  const { meta, itinerary } = trip;

  it("cumple el esquema del itinerario (lib/schema.ts)", () => {
    expect(itineraryIssues(itinerary)).toEqual([]);
  });

  it("empieza en startDate y tiene fechas consecutivas", () => {
    itinerary.forEach((day, i) => {
      expect(day.date).toBe(addDays(meta.startDate, i));
    });
  });

  it("tiene el día de la semana correcto en cada fecha", () => {
    itinerary.forEach((day) => {
      const expected = WEEKDAYS[new Date(day.date + "T12:00:00").getDay()];
      expect(`${day.date} ${day.weekday}`).toBe(`${day.date} ${expected}`);
    });
  });

  it("tiene un presupuesto numérico en cada día", () => {
    itinerary.forEach((day) => {
      expect(day.budget, day.date).toMatch(/\$\d+/);
    });
  });

  it("tiene coordenadas de hospedaje válidas", () => {
    itinerary.forEach(({ date, accommodationCoords: [lat, lng] }) => {
      expect(Math.abs(lat), date).toBeLessThanOrEqual(90);
      expect(Math.abs(lng), date).toBeLessThanOrEqual(180);
    });
  });

  it("ubica los puntos de interés a menos de 250 km del hospedaje del día", () => {
    itinerary.forEach((day) => {
      (day.pois ?? []).forEach((poi) => {
        expect(distanceKm(day.accommodationCoords, poi.coords), `${day.date} ${poi.name}`).toBeLessThan(250);
      });
    });
  });

  it("tiene tareas con id único y enlazadas a días que existen", () => {
    const tasks = trip.notes?.tasks ?? [];
    expect(new Set(tasks.map((t) => t.id)).size).toBe(tasks.length);
    const dates = new Set(itinerary.map((d) => d.date));
    tasks.filter((t) => t.date).forEach((t) => expect(dates.has(t.date!), t.id).toBe(true));
  });

  it("cuenta en el resumen de hospedaje todas las noches con cama", () => {
    const nightsWithBed = itinerary.filter(
      (d) => !d.isTransit && !d.nightBus && d.accommodation !== "---"
    ).length;
    const total = computeLodgingSummary(itinerary).reduce((sum, s) => sum + s.nights, 0);
    expect(total).toBe(nightsWithBed);
  });
});

describe("viaje japan", () => {
  const japan = getAllTrips().find((t) => t.meta.slug === "japan")!;

  it("tiene las rutas precalculadas al día (si no: node scripts/fetch-routes.mjs japan)", () => {
    const stale = japan.itinerary
      .filter((d) => (d.pois?.length ?? 0) > 0)
      .filter((d) => japan.routes?.[d.date]?.signature !== poiSignature(d))
      .map((d) => d.date);
    expect(stale).toEqual([]);
  });

  it("tiene 38 días (35 en Japón y 3 de vuelos) y 34 noches en 14 bases", () => {
    const stays = computeLodgingSummary(japan.itinerary);
    expect(japan.itinerary).toHaveLength(38);
    expect(japan.itinerary.filter((d) => !d.enRoute)).toHaveLength(35);
    expect(stays).toHaveLength(14);
    expect(stays.reduce((sum, s) => sum + s.nights, 0)).toBe(34);
  });

  it("tiene el precio real del hospedaje en cada noche con cama", () => {
    const missing = japan.itinerary
      .filter((d) => !d.isTransit && d.accommodation !== "---" && !(d.lodgingCost! > 0))
      .map((d) => d.date);
    expect(missing).toEqual([]);
  });

  it("tiene la tarjeta para el taxista y los horarios en cada noche con cama", () => {
    const beds = japan.itinerary.filter((d) => !d.isTransit && d.accommodation !== "---");
    expect(beds.filter((d) => !d.lodgingJa?.address).map((d) => d.date)).toEqual([]);
    // Welco no informó horarios en la confirmación
    expect(beds.filter((d) => !d.checkIn && !d.accommodation.startsWith("Welco")).map((d) => d.date)).toEqual([]);
  });

  it("tiene el presupuesto de cada día al día con su desglose (lib/budget.ts)", () => {
    const stale = japan.itinerary
      .filter((d) => d.budget !== `$${dayCostBreakdown(d).total}`)
      .map((d) => `${d.date}: ${d.budget} → $${dayCostBreakdown(d).total}`);
    expect(stale).toEqual([]);
  });

  it("tiene un ícono específico para cada lugar (si no, agregá una regla en lib/poi-icons.ts)", () => {
    const generic = japan.itinerary
      .flatMap((d) => d.pois ?? [])
      .filter((p) => poiIcon(p) === DEFAULT_POI_ICON)
      .map((p) => p.name);
    expect(generic).toEqual([]);
  });

  it("marca como de vuelo (sin cama) los días fuera de Japón", () => {
    const enRoute = japan.itinerary.filter((d) => d.enRoute);
    expect(enRoute.map((d) => d.date)).toEqual(["2026-10-30", "2026-10-31", "2026-12-06"]);
    enRoute.forEach((d) => expect(d.isTransit, d.date).toBe(true));
  });

  it("ubica cada parada de tren, bus, ferry y avión (si no: agregala a japan-places.json)", () => {
    const missing = japan.itinerary.flatMap((d) => transitLegs(d, japan.places ?? {}).missing.map((n) => `${d.date} ${n}`));
    expect(missing).toEqual([]);
  });

  it("tiene las paradas cerca de donde anda ese día (en tierra, a menos de 300 km de una de sus camas)", () => {
    const far = japan.itinerary.flatMap((d, i) =>
      transitLegs(d, japan.places ?? {})
        .legs.filter((l) => l.kind !== "flight")
        .flatMap((l) => l.points)
        // La cama de esa noche o la de esa mañana (los días de traslado)
        .filter((p) => [d, japan.itinerary[i - 1]].every((b) => !b || distanceKm(p, b.accommodationCoords) > 300))
        .map((p) => `${d.date} ${p.join(",")}`)
    );
    expect(far).toEqual([]);
  });

  it("tiene los trazados de los tramos al día (si no: node scripts/fetch-transit.mjs japan)", () => {
    const stale = japan.itinerary
      .filter((d) => transitLegs(d, japan.places ?? {}).legs.length > 0)
      .filter((d) => japan.transit?.[d.date]?.signature !== transitSignature(d, japan.places ?? {}))
      .map((d) => d.date);
    expect(stale).toEqual([]);
  });

  it("tiene todos los puntos de interés dentro de Japón", () => {
    japan.itinerary.forEach((day) => {
      (day.pois ?? []).forEach(({ name, coords: [lat, lng] }) => {
        expect(lat, name).toBeGreaterThan(24);
        expect(lat, name).toBeLessThan(46);
        expect(lng, name).toBeGreaterThan(122);
        expect(lng, name).toBeLessThan(146);
      });
    });
  });
});
