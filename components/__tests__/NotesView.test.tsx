// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import NotesView from "@/components/NotesView";
import { fixtureTrip, makeSharedApi } from "./fixtures";

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

  describe("reservas con link y fecha de apertura", () => {
    const withBookings = {
      ...notes,
      tasks: [
        { id: "sky", text: "Reservar Shibuya Sky", date: "2026-11-02", from: "2026-11-19", url: "https://sky.example/" },
        { id: "yenes", text: "Llevar yenes en efectivo" },
        { id: "bus-nikko", text: "Reservar el bus a Nikko", date: "2026-11-02", url: "https://bus.example/nikko" },
      ],
    };

    afterEach(() => vi.useRealTimers());

    function renderOn(today: string) {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(`${today}T12:00:00`));
      render(<NotesView notes={withBookings} itinerary={fixtureTrip.itinerary} slug="test" onDaySelect={vi.fn()} />);
    }

    const pendingNames = () =>
      within(screen.getByRole("list", { name: "Tareas pendientes" }))
        .getAllByRole("checkbox")
        .map((c) => c.getAttribute("aria-label"));

    it("abre el sitio para hacerla en otra pestaña", () => {
      renderOn("2026-11-01");
      const link = screen.getByRole("link", { name: "Abrir el sitio: Reservar el bus a Nikko" });
      expect(link.getAttribute("href")).toBe("https://bus.example/nikko");
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toContain("noopener");
    });

    it("lo que todavía no se puede hacer dice desde cuándo y va al final", () => {
      renderOn("2026-11-01");
      expect(screen.getByText("Desde 19 nov")).toBeTruthy();
      expect(pendingNames()).toEqual(["Reservar el bus a Nikko", "Llevar yenes en efectivo", "Reservar Shibuya Sky"]);
    });

    it("el día que abre deja de decir desde cuándo", () => {
      renderOn("2026-11-19");
      expect(screen.queryByText("Desde 19 nov")).toBeNull();
    });
  });
});

describe("NotesView: compartir el viaje", () => {
  const api = (extra: Partial<import("@/lib/use-shared-notes").SharedNotesApi> = {}) =>
    makeSharedApi({
      trip: { id: "t1", members: ["cris"], names: { cris: "Cris" } },
      names: { cris: "Cris" },
      invite: vi.fn(() => "https://viajes.example/japan/?unirse=t1"),
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

describe("NotesView: listas de los dos", () => {
  const sharing = (extra: Partial<import("@/lib/use-shared-notes").SharedNotesApi> = {}) =>
    makeSharedApi({
      lists: [
        { id: "l1", title: "Compras para Nikko", day: "2026-11-01", author: "cris", createdAt: 1 },
        { id: "l2", title: "Empacar", day: null, author: "karla", createdAt: 2 },
      ],
      items: {
        l1: [
          { id: "a", text: "Polar", done: true, doneBy: "cris", author: "cris", createdAt: 1 },
          { id: "b", text: "Kairo", done: false, doneBy: null, author: "cris", createdAt: 2 },
        ],
      },
      ...extra,
    });

  it("muestra todas las listas con su día y cuánto falta, y abre la que tocás", async () => {
    const onOpenList = vi.fn();
    render(<NotesView notes={notes} itinerary={fixtureTrip.itinerary} slug="test" onDaySelect={vi.fn()} sharing={sharing()} onOpenList={onOpenList} />);
    const section = screen.getByRole("region", { name: "Listas" });
    const cards = within(section).getAllByRole("button", { name: /Compras para Nikko|Empacar/ });
    expect(cards.map((c) => c.textContent)).toEqual([expect.stringMatching(/Compras para Nikko.*1 nov.*1 de 2/), expect.stringMatching(/Empacar.*Sin día.*0 de 0/)]);
    await userEvent.click(cards[1]);
    expect(onOpenList).toHaveBeenCalledWith({ listId: "l2" });
    await userEvent.click(within(section).getByRole("button", { name: "Nueva lista" }));
    expect(onOpenList).toHaveBeenCalledWith({});
  });

  it("sin sesión pide entrar", async () => {
    const s = sharing({ status: "signed-out", me: null, trip: null, lists: [] });
    render(<NotesView notes={notes} itinerary={fixtureTrip.itinerary} slug="test" onDaySelect={vi.fn()} sharing={s} onOpenList={vi.fn()} />);
    await userEvent.click(within(screen.getByRole("region", { name: "Listas" })).getByRole("button", { name: /Iniciar sesión/ }));
    expect(s.signIn).toHaveBeenCalled();
  });
});
