// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fixtureTrip } from "./fixtures";

// WebGL no existe en jsdom: el mapa se reemplaza por un doble
vi.mock("@/components/TripMap", () => ({
  default: () => <div data-testid="map" />,
}));

import TripApp from "@/components/TripApp";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function renderAt(isoDate: string) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(isoDate + "T10:00:00"));
  render(<TripApp tripData={fixtureTrip} />);
}

const title = () => screen.getAllByRole("heading", { level: 2 })[0].textContent;

describe("TripApp", () => {
  it("antes del viaje muestra la cuenta regresiva y el primer día", () => {
    renderAt("2026-10-22");
    expect(screen.getByText("Faltan 10 días")).toBeTruthy();
    expect(title()).toBe("Llegada a Asakusa");
  });

  it("durante el viaje abre el día de hoy y el botón Hoy vuelve a él", async () => {
    renderAt("2026-11-02");
    expect(title()).toBe("Excursión a Nikko");

    await act(() => userEvent.click(screen.getByRole("button", { name: /Día 3/ })));
    expect(title()).toBe("Vuelo a Hiroshima");

    await act(() => userEvent.click(screen.getByRole("button", { name: "Hoy" })));
    expect(title()).toBe("Excursión a Nikko");
  });

  it("después del viaje abre el último día", () => {
    renderAt("2026-12-20");
    expect(title()).toBe("Vuelo a Hiroshima");
  });

  it("pasa al día siguiente y al anterior", async () => {
    renderAt("2026-10-22");
    await act(() => userEvent.click(screen.getByRole("button", { name: "Día siguiente" })));
    expect(title()).toBe("Excursión a Nikko");
    await act(() => userEvent.click(screen.getByRole("button", { name: "Día anterior" })));
    expect(title()).toBe("Llegada a Asakusa");
  });

  it("cambia entre itinerario, costos y hospedaje", async () => {
    renderAt("2026-10-22");
    await act(() => userEvent.click(screen.getAllByRole("tab", { name: /Costos/ })[0]));
    expect(screen.getByRole("heading", { name: "Costos y gastos" })).toBeTruthy();

    await act(() => userEvent.click(screen.getAllByRole("tab", { name: /Hospedaje/ })[0]));
    expect(screen.getByRole("heading", { name: /Hospedaje/ })).toBeTruthy();
    expect(screen.getByText("Centro, Hiroshima")).toBeTruthy();
    expect(screen.getByText("US$41")).toBeTruthy();

    await act(() => userEvent.click(screen.getAllByRole("tab", { name: /Itinerario/ })[0]));
    expect(title()).toBe("Llegada a Asakusa");
  });

  it("en costos muestra lo gastado de verdad (también los gastos guardados en el formato anterior)", async () => {
    localStorage.setItem(
      "viajes-gastos-test",
      JSON.stringify({ e1: { id: "e1", date: "2026-11-02", amountYen: 3140, note: "Nikko", createdAt: 1 } })
    );
    renderAt("2026-10-22");
    await act(() => userEvent.click(screen.getAllByRole("tab", { name: /Costos/ })[0]));
    expect(screen.getByLabelText("Gastado").textContent).toContain("≈US$20");
    expect(screen.getByText("¥3,140")).toBeTruthy();
    localStorage.clear();
  });

  describe("mapa en pantalla completa", () => {
    const fullscreen = () => screen.queryByRole("button", { name: "Salir de pantalla completa" });

    it("esconde la hoja, las barras y el menú, y sale con su botón", async () => {
      renderAt("2026-10-22");
      await act(() => userEvent.click(screen.getByRole("button", { name: "Pantalla completa" })));
      expect(fullscreen()).toBeTruthy();
      expect(screen.queryByRole("region", { name: "Detalle del día" })).toBeNull();
      expect(screen.queryAllByRole("tab")).toHaveLength(0);
      expect(screen.queryByRole("heading", { level: 1 })).toBeNull();

      await act(() => userEvent.click(fullscreen()!));
      await waitFor(() => expect(fullscreen()).toBeNull());
      expect(screen.getByRole("region", { name: "Detalle del día" })).toBeTruthy();
      expect(screen.getAllByRole("tab").length).toBeGreaterThan(0);
    });

    it("sale también con el botón atrás del celular", async () => {
      renderAt("2026-10-22");
      await act(() => userEvent.click(screen.getByRole("button", { name: "Pantalla completa" })));
      expect(fullscreen()).toBeTruthy();
      await act(async () => window.history.back());
      await waitFor(() => expect(fullscreen()).toBeNull());
    });
  });

  it("muestra las notas y desde una tarea abre su día", async () => {
    renderAt("2026-10-22");
    await act(() => userEvent.click(screen.getAllByRole("tab", { name: /Notas/ })[0]));
    expect(screen.getByRole("heading", { name: "Notas" })).toBeTruthy();

    await act(() => userEvent.click(screen.getByRole("button", { name: /Ver el día/ })));
    expect(title()).toBe("Excursión a Nikko");
  });
});
