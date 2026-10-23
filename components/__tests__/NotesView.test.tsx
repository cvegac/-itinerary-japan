// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import NotesView from "@/components/NotesView";
import { fixtureTrip } from "./fixtures";

const notes = fixtureTrip.notes!;
const KEY = "viajes-tareas-test";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function renderNotes(onDaySelect = vi.fn()) {
  render(<NotesView notes={notes} itinerary={fixtureTrip.itinerary} slug="test" onDaySelect={onDaySelect} />);
  return onDaySelect;
}

describe("NotesView", () => {
  it("muestra las tareas, cuántas faltan y las notas", () => {
    renderNotes();
    expect(screen.getByRole("checkbox", { name: /Reservar el bus a Nikko/ })).toBeTruthy();
    expect(screen.getByText("0 de 2 hechas")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Pagar en efectivo" })).toBeTruthy();
    expect(screen.getByText("Ueno: ¥17,000")).toBeTruthy();
  });

  it("no guarda nada solo por abrir la pestaña", () => {
    renderNotes();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("al tildar una tarea la recuerda en el dispositivo", async () => {
    renderNotes();
    const task = screen.getByRole("checkbox", { name: /Reservar el bus a Nikko/ });
    await act(() => userEvent.click(task));
    expect(task.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText("1 de 2 hechas")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual(["bus-nikko"]);

    cleanup();
    renderNotes();
    expect(screen.getByRole("checkbox", { name: /Reservar el bus a Nikko/ }).getAttribute("aria-checked")).toBe("true");
  });

  it("al destildar la saca de lo guardado", async () => {
    localStorage.setItem(KEY, JSON.stringify(["bus-nikko"]));
    renderNotes();
    await act(() => userEvent.click(screen.getByRole("checkbox", { name: /Reservar el bus a Nikko/ })));
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual([]);
  });

  it("abre el día del itinerario de una tarea", async () => {
    const onDaySelect = renderNotes();
    await act(() => userEvent.click(screen.getByRole("button", { name: /Ver el día/ })));
    expect(onDaySelect).toHaveBeenCalledWith(fixtureTrip.itinerary[1]);
  });
});
