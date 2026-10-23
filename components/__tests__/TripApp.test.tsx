// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
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
    expect(screen.getByRole("heading", { name: /Presupuesto/ })).toBeTruthy();

    await act(() => userEvent.click(screen.getAllByRole("tab", { name: /Hospedaje/ })[0]));
    expect(screen.getByRole("heading", { name: /Hospedaje/ })).toBeTruthy();
    expect(screen.getByText("Centro, Hiroshima")).toBeTruthy();

    await act(() => userEvent.click(screen.getAllByRole("tab", { name: /Itinerario/ })[0]));
    expect(title()).toBe("Llegada a Asakusa");
  });
});
