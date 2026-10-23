// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import DayStrip from "@/components/DayStrip";
import { fixtureTrip } from "./fixtures";

afterEach(cleanup);

describe("DayStrip", () => {
  const { itinerary, meta } = fixtureTrip;

  it("muestra un botón por día con su número y su plan", () => {
    render(<DayStrip itinerary={itinerary} startDate={meta.startDate} selectedDate={null} onSelect={() => {}} />);
    expect(screen.getAllByRole("button")).toHaveLength(3);
    expect(screen.getByRole("button", { name: /Día 2.*Excursión a Nikko/ })).toBeTruthy();
  });

  it("marca el día seleccionado como actual", () => {
    render(<DayStrip itinerary={itinerary} startDate={meta.startDate} selectedDate="2026-11-02" onSelect={() => {}} />);
    expect(screen.getByRole("button", { name: /Día 2/ }).getAttribute("aria-current")).toBe("date");
    expect(screen.getByRole("button", { name: /Día 1/ }).getAttribute("aria-current")).toBeNull();
  });

  it("avisa qué día se eligió", async () => {
    const onSelect = vi.fn();
    render(<DayStrip itinerary={itinerary} startDate={meta.startDate} selectedDate={null} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button", { name: /Día 3/ }));
    expect(onSelect).toHaveBeenCalledWith(itinerary[2]);
  });
});
