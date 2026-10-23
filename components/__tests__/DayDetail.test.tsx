// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import DayDetail from "@/components/DayDetail";
import { makeDay } from "./fixtures";

afterEach(cleanup);

const day = makeDay("2026-11-02", "Lun", {
  label: "Excursión a Nikko",
  budget: "$110",
  transport: [
    { mode: "tren", line: "Tobu Nikko Line", from: "Asakusa", to: "Tobu-Nikko", duration: "~2h", cost: "¥3,000" },
  ],
  pois: [
    { name: "Santuario Toshogu", coords: [36.758, 139.599] },
    { name: "Cena en Asakusa", coords: [35.71, 139.79], night: true },
  ],
  activitiesDay: ["Puente Shinkyo"],
  activitiesNight: ["Paseo por el río"],
});

describe("DayDetail", () => {
  it("muestra el título, la fecha y el presupuesto", () => {
    render(<DayDetail day={day} dayNumber={2} />);
    expect(screen.getByRole("heading", { name: "Excursión a Nikko" })).toBeTruthy();
    expect(screen.getByText(/lunes,? 2 de noviembre/i)).toBeTruthy();
    expect(screen.getByText("$110")).toBeTruthy();
  });

  it("lista los lugares con su letra y su ícono, y avisa cuál se tocó", async () => {
    const onFocusPoi = vi.fn();
    render(<DayDetail day={day} dayNumber={2} onFocusPoi={onFocusPoi} />);
    const places = screen.getByRole("list", { name: "Lugares del día" });
    expect(within(places).getAllByRole("button").map((b) => b.textContent)).toEqual([
      expect.stringContaining("A⛩️Santuario Toshogu"),
      expect.stringContaining("B📍Cena en Asakusa"),
    ]);
    await userEvent.click(within(places).getByRole("button", { name: /Cena en Asakusa/ }));
    expect(onFocusPoi).toHaveBeenCalledWith(1);
  });

  it("en un día de traslado muestra dónde amanecés y dónde dormís", () => {
    const yesterday = makeDay("2026-11-01", "Dom", { accommodation: "Tokyo Ueno New Izu Hotel", zona: "Ueno" });
    render(<DayDetail day={day} dayNumber={2} morningLodging={yesterday} />);
    expect(screen.getByText("Amanecés en")).toBeTruthy();
    expect(screen.getByText("Tokyo Ueno New Izu Hotel")).toBeTruthy();
    expect(screen.getByText("Dormís en")).toBeTruthy();
  });

  it("si seguís en la misma cama no repite dónde amanecés", () => {
    render(<DayDetail day={day} dayNumber={2} />);
    expect(screen.queryByText("Amanecés en")).toBeNull();
  });

  it("muestra los tramos de transporte y las actividades", () => {
    render(<DayDetail day={day} dayNumber={2} />);
    const transport = screen.getByRole("list", { name: "Tramos de transporte" });
    expect(within(transport).getByText("Asakusa")).toBeTruthy();
    expect(within(transport).getByText("Tobu-Nikko")).toBeTruthy();
    expect(within(transport).getByText("Tobu Nikko Line")).toBeTruthy();
    expect(screen.getByText("Puente Shinkyo")).toBeTruthy();
    expect(screen.getByText("Paseo por el río")).toBeTruthy();
  });
});
