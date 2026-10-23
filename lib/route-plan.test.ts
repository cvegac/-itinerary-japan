import { describe, expect, it } from "vitest";
import { makeDay } from "@/components/__tests__/fixtures";
import {
  bestOrder,
  chooseOrder,
  isBikeDay,
  isExcursion,
  legMode,
  orderedPois,
  poiSignature,
  simplifyLine,
  type DayRoutes,
} from "./route-plan";

// Puntos sobre una recta: el costo es la distancia entre posiciones
const line = (positions: number[]) => (from: number | "start", to: number | "start") => {
  const pos = (p: number | "start") => (p === "start" ? 0 : positions[p]);
  return Math.abs(pos(from) - pos(to));
};

describe("bestOrder", () => {
  it("encuentra el orden de menor recorrido desde el hospedaje", () => {
    const { order, cost } = bestOrder(3, line([3, 1, 2]), {});
    expect(order).toEqual([1, 2, 0]);
    expect(cost).toBe(3);
  });

  it("deja los lugares de noche al final aunque estén más cerca", () => {
    // El 1 está pegado al hospedaje, pero es de noche
    const { order } = bestOrder(3, line([3, 0.5, 2]), { night: [1] });
    expect(order.at(-1)).toBe(1);
    // Los dos de día empatan en costo (5,5): importa que vayan antes, no cuál primero
    expect(new Set(order.slice(0, 2))).toEqual(new Set([0, 2]));
  });

  it("en las excursiones arranca en el primer lugar (donde te deja el tren)", () => {
    const { order } = bestOrder(3, line([50, 52, 51]), { fixedFirst: 0 });
    expect(order).toEqual([0, 2, 1]);
  });

  it("con ida y vuelta suma el regreso al hospedaje (no termina en la cima de un monte)", () => {
    // Hospedaje en 0; la cima (0) en 10 y el templo (1) en 1: sin la vuelta conviene terminar arriba
    const cost = (from: number | "start", to: number | "start") => {
      const pos = (p: number | "start") => (p === "start" ? 0 : [10, 1][p]);
      return Math.abs(pos(from) - pos(to));
    };
    expect(bestOrder(2, cost, {}).cost).toBe(10);
    expect(bestOrder(2, cost, { roundTrip: true }).cost).toBe(20);
  });

  it("en una excursión con ida y vuelta, regresa al primer lugar (la estación)", () => {
    const { cost } = bestOrder(3, line([50, 52, 51]), { fixedFirst: 0, roundTrip: true });
    expect(cost).toBe(4);
  });

  it("casos chicos", () => {
    expect(bestOrder(0, line([]), {}).order).toEqual([]);
    expect(bestOrder(1, line([4]), {}).order).toEqual([0]);
  });
});

describe("chooseOrder", () => {
  const day = makeDay("2026-11-01", "Dom");
  const best = { order: [2, 0, 1], cost: 1000 };

  it("aplica el orden óptimo si ahorra 10 minutos o más", () => {
    expect(chooseOrder(day, best, 1600, 3)).toEqual([2, 0, 1]);
  });

  it("mantiene el orden del plan si ahorra poco", () => {
    expect(chooseOrder(day, best, 1500, 3)).toEqual([0, 1, 2]);
  });

  it("mantiene el orden del plan si el día lo pide (senderos, trenes, alquileres)", () => {
    expect(chooseOrder({ ...day, keepOrder: true }, best, 9999, 3)).toEqual([0, 1, 2]);
  });
});

describe("legMode", () => {
  it("a pie si es cerca, en bici los días de bici, si no tren o bus", () => {
    expect(legMode(2.5, false)).toBe("foot");
    expect(legMode(8, false)).toBe("transit");
    expect(legMode(8, true)).toBe("bike");
    expect(legMode(35, true)).toBe("transit");
  });

  it("en los días de sendero, los tramos largos también son a pie (son la caminata)", () => {
    expect(legMode(9, false, true)).toBe("foot");
    expect(legMode(40, false, true)).toBe("transit");
  });
});

describe("isBikeDay / isExcursion", () => {
  it("detecta los días de bici por el transporte", () => {
    expect(isBikeDay(makeDay("2026-11-07", "Sáb", { transport: [{ mode: "bicicleta", from: "A", to: "B" }] }))).toBe(true);
    expect(isBikeDay(makeDay("2026-11-08", "Dom"))).toBe(false);
  });

  it("es excursión si algún lugar queda lejos del hospedaje", () => {
    const near = makeDay("2026-11-01", "Dom", { pois: [{ name: "Senso-ji", coords: [35.7148, 139.7967] }] });
    const far = makeDay("2026-11-02", "Lun", { pois: [{ name: "Toshogu", coords: [36.758, 139.599] }] });
    expect(isExcursion(near)).toBe(false);
    expect(isExcursion(far)).toBe(true);
  });
});

describe("simplifyLine", () => {
  it("una recta queda en sus dos extremos", () => {
    expect(simplifyLine([[0, 0], [0, 0.0005], [0, 0.001]], 5)).toEqual([[0, 0], [0, 0.001]]);
  });

  it("conserva las esquinas", () => {
    const corner: [number, number][] = [[0, 0], [0, 0.001], [0.001, 0.001]];
    expect(simplifyLine(corner, 5)).toEqual(corner);
  });
});

describe("orderedPois", () => {
  const day = makeDay("2026-11-01", "Dom", {
    pois: [
      { name: "A", coords: [35.71, 139.79] },
      { name: "B", coords: [35.72, 139.8] },
      { name: "C", coords: [35.73, 139.81] },
    ],
  });
  const routes = (signature: string): DayRoutes => ({ signature, order: [2, 0, 1], legs: [], fromLodging: {} });

  it("usa el orden óptimo si los lugares del día no cambiaron", () => {
    const ordered = orderedPois(day, routes(poiSignature(day)));
    expect(ordered.map((p) => p.poi.name)).toEqual(["C", "A", "B"]);
    expect(ordered.map((p) => p.index)).toEqual([2, 0, 1]);
  });

  it("si el día cambió, vuelve al orden original", () => {
    expect(orderedPois(day, routes("otra-firma")).map((p) => p.poi.name)).toEqual(["A", "B", "C"]);
    expect(orderedPois(day, undefined).map((p) => p.poi.name)).toEqual(["A", "B", "C"]);
  });
});
