// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import DayWeather from "@/components/DayWeather";

afterEach(cleanup);

const parts = [
  { label: "Mañana", hour: 8, temp: 9, rain: 0, code: 0 },
  { label: "Mediodía", hour: 12, temp: 13, rain: 10, code: 2 },
  { label: "Tarde", hour: 16, temp: 12, rain: 20, code: 3 },
  { label: "Noche", hour: 20, temp: 8, rain: 40, code: 61 },
];

describe("DayWeather", () => {
  it("muestra la temperatura y la lluvia de la mañana, el mediodía, la tarde y la noche", () => {
    render(<DayWeather forecast={{ code: 3, max: 14, min: 6, rain: 40, parts }} savedAt={null} />);
    const list = screen.getByRole("list", { name: "Clima por momento del día" });
    const items = within(list).getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual([
      expect.stringContaining("Mañana"),
      expect.stringContaining("Mediodía"),
      expect.stringContaining("Tarde"),
      expect.stringContaining("Noche"),
    ]);
    expect(items[3].textContent).toContain("8°");
    expect(items[3].textContent).toContain("40 %");
    expect(within(items[3]).getByLabelText("Probabilidad de lluvia")).toBeTruthy();
    expect(within(items[3]).getByLabelText("Lluvia")).toBeTruthy();
  });

  it("con el pronóstico guardado avisa de cuándo es", () => {
    render(
      <DayWeather forecast={{ code: 3, max: 14, min: 6, rain: 40, parts }} savedAt={new Date("2026-11-08T14:05:00").toISOString()} />
    );
    expect(screen.getByText(/Sin conexión: pronóstico guardado el 8 nov, 14:05/)).toBeTruthy();
  });

  it("sin datos por hora no muestra nada", () => {
    const { container } = render(<DayWeather forecast={{ code: 3, max: 14, min: 6, rain: 40, parts: [] }} savedAt={null} />);
    expect(container.textContent).toBe("");
  });
});
