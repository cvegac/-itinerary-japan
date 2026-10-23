// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import DayDetail from "@/components/DayDetail";
import { poiSignature, type DayRoutes } from "@/lib/route-plan";
import { makeDay } from "./fixtures";

afterEach(cleanup);

const day = makeDay("2026-11-01", "Dom", {
  pois: [
    { name: "Templo", coords: [35.712, 139.796] },
    { name: "Mercado", coords: [35.72, 139.8] },
    { name: "Puente", coords: [35.711, 139.799] },
  ],
});

const routes: DayRoutes = {
  signature: poiSignature(day),
  order: [2, 0, 1],
  legs: [
    { from: "lodging", to: 2, mode: "foot", distanceM: 600, durationS: 480, line: [[139.798, 35.712], [139.799, 35.711]] },
    { from: 2, to: 0, mode: "foot", distanceM: 1200, durationS: 900, line: [[139.799, 35.711], [139.796, 35.712]] },
    { from: 0, to: 1, mode: "transit", distanceM: 9000, durationS: 1980 },
  ],
  fromLodging: { 2: { distanceM: 600, durationS: 480, line: [] }, 0: { distanceM: 700, durationS: 560, line: [] } },
  originalCostS: 4200,
  bestCostS: 3360,
};

const places = () => within(screen.getByRole("list", { name: "Lugares del día" }));

describe("DayDetail con rutas", () => {
  it("lista los lugares en el orden de visita, con las letras en ese orden", () => {
    render(<DayDetail day={day} dayNumber={1} routes={routes} />);
    const names = places().getAllByRole("button").map((b) => b.textContent);
    expect(names[0]).toMatch(/^A🌉Puente/);
    expect(names[1]).toMatch(/^B🛕Templo/);
    expect(names[2]).toMatch(/^C🛍️Mercado/);
  });

  it("dice cómo llegar a cada lugar desde el anterior", () => {
    render(<DayDetail day={day} dayNumber={1} routes={routes} />);
    expect(places().getByText(/8 min a pie · 600 m/)).toBeTruthy();
    expect(places().getByText(/15 min a pie · 1,2 km/)).toBeTruthy();
    expect(places().getByText(/tren o bus/i)).toBeTruthy();
  });

  it("muestra el tiempo a pie desde el hospedaje en los lugares cercanos", () => {
    render(<DayDetail day={day} dayNumber={1} routes={routes} />);
    expect(places().getByText(/hospedaje: 9 min a pie/i)).toBeTruthy();
  });

  it("resume el recorrido y cuánto ahorra el orden optimizado", () => {
    render(<DayDetail day={day} dayNumber={1} routes={routes} />);
    expect(screen.getByText(/Orden optimizado: ahorra 14 min/)).toBeTruthy();
  });

  it("al tocar un lugar avisa su índice original (para el mapa)", async () => {
    const onFocusPoi = vi.fn();
    render(<DayDetail day={day} dayNumber={1} routes={routes} onFocusPoi={onFocusPoi} />);
    await userEvent.click(places().getAllByRole("button")[0]);
    expect(onFocusPoi).toHaveBeenCalledWith(2);
  });

  it("en los días de sendero avisa que los tiempos no cuentan la pendiente", () => {
    render(<DayDetail day={{ ...day, hike: true }} dayNumber={1} routes={routes} />);
    expect(screen.getByText(/ritmo de llano/i)).toBeTruthy();
    cleanup();
    render(<DayDetail day={day} dayNumber={1} routes={routes} />);
    expect(screen.queryByText(/ritmo de llano/i)).toBeNull();
  });

  it("si los lugares del día cambiaron, ignora las rutas viejas", () => {
    render(<DayDetail day={day} dayNumber={1} routes={{ ...routes, signature: "vieja" }} />);
    expect(places().getAllByRole("button")[0].textContent).toMatch(/^A🛕Templo/);
    expect(screen.queryByText(/a pie ·/)).toBeNull();
  });
});
