// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from "@testing-library/react";
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

  const nikko = () => screen.queryByRole("checkbox", { name: /Reservar el bus a Nikko/ });

  it("al tildar una tarea la archiva: sale de pendientes y se recuerda en el dispositivo", async () => {
    renderNotes();
    await act(() => userEvent.click(nikko()!));
    expect(nikko()).toBeNull();
    expect(screen.getByText("1 de 2 hechas")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual(["bus-nikko"]);

    cleanup();
    renderNotes();
    expect(nikko()).toBeNull();
    expect(screen.getByRole("button", { name: "Ver archivadas (1)" })).toBeTruthy();
  });

  it("muestra las archivadas con un botón, sin haberlas borrado", async () => {
    localStorage.setItem(KEY, JSON.stringify(["bus-nikko"]));
    renderNotes();
    await act(() => userEvent.click(screen.getByRole("button", { name: "Ver archivadas (1)" })));
    expect(nikko()!.getAttribute("aria-checked")).toBe("true");

    await act(() => userEvent.click(screen.getByRole("button", { name: "Ocultar archivadas" })));
    expect(nikko()).toBeNull();
  });

  it("al destildar una archivada vuelve a pendientes", async () => {
    localStorage.setItem(KEY, JSON.stringify(["bus-nikko"]));
    renderNotes();
    await act(() => userEvent.click(screen.getByRole("button", { name: "Ver archivadas (1)" })));
    await act(() => userEvent.click(nikko()!));
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual([]);
    expect(nikko()!.getAttribute("aria-checked")).toBe("false");
    expect(screen.queryByRole("button", { name: /archivadas/ })).toBeNull();
  });

  it("sin archivadas no muestra el botón", () => {
    renderNotes();
    expect(screen.queryByRole("button", { name: /archivadas/ })).toBeNull();
  });

  describe("temas", () => {
    const openTopic = () => act(() => userEvent.click(screen.getByRole("button", { name: /Compras sin impuesto/ })));
    const dialog = () => screen.queryByRole("dialog", { name: "Compras sin impuesto" });

    afterEach(() => window.history.replaceState(null, ""));

    it("muestra cada tema como un botón con su resumen, sin el contenido", () => {
      renderNotes();
      const topic = screen.getByRole("button", { name: /Compras sin impuesto/ });
      expect(topic.textContent).toContain("Cómo te devuelven el 10%");
      expect(screen.queryByText("Mostrá el pasaporte")).toBeNull();
    });

    it("al tocar un tema abre su ventana con todas las secciones", async () => {
      renderNotes();
      await openTopic();
      expect(dialog()).toBeTruthy();
      expect(screen.getByRole("heading", { name: "Al comprar" })).toBeTruthy();
      expect(screen.getByText("Mostrá el pasaporte")).toBeTruthy();
      expect(screen.getByRole("heading", { name: "En el aeropuerto" })).toBeTruthy();
    });

    it("se cierra con el botón, con Escape y tocando afuera", async () => {
      renderNotes();
      await openTopic();
      await act(() => userEvent.click(screen.getByRole("button", { name: "Cerrar" })));
      expect(dialog()).toBeNull();

      await openTopic();
      await act(() => userEvent.keyboard("{Escape}"));
      expect(dialog()).toBeNull();

      await openTopic();
      await act(() => userEvent.click(screen.getByTestId("topic-backdrop")));
      expect(dialog()).toBeNull();
    });

    it("el botón atrás del celular cierra la ventana y no sale de la app", async () => {
      renderNotes();
      await openTopic();
      expect(window.history.state).toEqual({ noteTopic: "tax-free" });
      act(() => window.dispatchEvent(new PopStateEvent("popstate", { state: null })));
      expect(dialog()).toBeNull();
    });

    it("va directo al body, por encima de la barra de navegación", async () => {
      renderNotes();
      await openTopic();
      expect(dialog()!.closest("[data-testid=topic-backdrop]")!.parentElement).toBe(document.body);
    });
  });

  it("abre el día del itinerario de una tarea", async () => {
    const onDaySelect = renderNotes();
    await act(() => userEvent.click(screen.getByRole("button", { name: /Ver el día/ })));
    expect(onDaySelect).toHaveBeenCalledWith(fixtureTrip.itinerary[1]);
  });
});

describe("NotesView: compartir el viaje", () => {
  const api = (extra: object = {}) => ({
    status: "ready" as const,
    me: "cris",
    trip: { id: "t1", members: ["cris"], names: { cris: "Cris" } },
    names: { cris: "Cris" },
    notes: [],
    unseen: [],
    markSeen: vi.fn(),
    add: vi.fn(),
    edit: vi.fn(),
    remove: vi.fn(),
    invite: vi.fn(() => "https://viajes.example/japan/?unirse=t1"),
    signIn: vi.fn(),
    invited: false,
    inviteError: null,
    ...extra,
  });
  const renderWith = (sharing: ReturnType<typeof api>) =>
    render(<NotesView notes={notes} itinerary={fixtureTrip.itinerary} slug="test" onDaySelect={vi.fn()} sharing={sharing} />);
  const card = () => screen.getByRole("region", { name: "Viaje compartido" });

  it("sin sesión, pide entrar para invitar", async () => {
    const sharing = api({ status: "signed-out", me: null, trip: null });
    renderWith(sharing);
    await userEvent.click(within(card()).getByRole("button", { name: /Iniciar sesión/ }));
    expect(sharing.signIn).toHaveBeenCalled();
  });

  it("solo, arma el link de invitación para una persona", async () => {
    const sharing = api();
    renderWith(sharing);
    await userEvent.click(within(card()).getByRole("button", { name: "Invitar a alguien" }));
    expect((within(card()).getByRole("textbox", { name: "Link de invitación" }) as HTMLInputElement).value).toBe(
      "https://viajes.example/japan/?unirse=t1"
    );
    expect(within(card()).getByText(/una sola persona/)).toBeTruthy();
  });

  it("ya compartido, dice con quién", () => {
    renderWith(api({ trip: { id: "t1", members: ["cris", "karla"], names: { cris: "Cris", karla: "Karla" } }, names: { cris: "Cris", karla: "Karla" } }));
    expect(within(card()).getByText(/Compartido con Karla/)).toBeTruthy();
    expect(within(card()).queryByRole("button", { name: "Invitar a alguien" })).toBeNull();
  });
});
