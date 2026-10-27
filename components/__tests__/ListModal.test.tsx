// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import ListModal from "@/components/ListModal";
import type { SharedNotesApi } from "@/lib/use-shared-notes";
import { makeDay, makeSharedApi } from "./fixtures";

afterEach(cleanup);

const itinerary = [
  makeDay("2026-11-01", "Dom", { label: "Haneda → Asakusa" }),
  makeDay("2026-11-02", "Lun", { label: "Nikko" }),
];

function api(extra: Partial<SharedNotesApi> = {}): SharedNotesApi {
  return makeSharedApi({
    lists: [{ id: "l1", title: "Compras para Nikko", day: "2026-11-01", author: "cris", createdAt: 1 }],
    items: {
      l1: [
        { id: "a", text: "Polar", done: false, doneBy: null, author: "karla", createdAt: 1 },
        { id: "b", text: "Guantes", done: true, doneBy: "karla", author: "cris", createdAt: 2 },
      ],
    },
    createList: vi.fn(() => "nueva"),
    ...extra,
  });
}

const dialog = () => screen.getByRole("dialog");

describe("ListModal: nueva lista", () => {
  it("se crea con título y, si se quiere, un día", async () => {
    const shared = api({ lists: [], items: {} });
    render(<ListModal api={shared} target={{ day: "2026-11-02" }} itinerary={itinerary} onClose={vi.fn()} />);
    expect((screen.getByRole("combobox", { name: "Día" }) as HTMLSelectElement).value).toBe("2026-11-02");
    await userEvent.click(screen.getByRole("button", { name: "Empacar" }));
    expect((screen.getByRole("textbox", { name: "Nombre de la lista" }) as HTMLInputElement).value).toBe("Empacar");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Día" }), "");
    await userEvent.click(screen.getByRole("button", { name: "Crear lista" }));
    expect(shared.createList).toHaveBeenCalledWith("Empacar", null);
  });

  it("sin título no se crea", () => {
    render(<ListModal api={api()} target={{}} itinerary={itinerary} onClose={vi.fn()} />);
    expect((screen.getByRole("button", { name: "Crear lista" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("ListModal: una lista", () => {
  const open = (shared = api()) => {
    render(<ListModal api={shared} target={{ listId: "l1" }} itinerary={itinerary} onClose={vi.fn()} />);
    return shared;
  };

  it("muestra lo pendiente, lo tildado y quién lo tildó", () => {
    open();
    expect(dialog().getAttribute("aria-label")).toBe("Compras para Nikko");
    const items = within(dialog()).getAllByRole("checkbox");
    expect(items.map((c) => [c.getAttribute("aria-label"), c.getAttribute("aria-checked")])).toEqual([
      ["Polar", "false"],
      ["Guantes", "true"],
    ]);
    expect(within(dialog()).getByText(/Karla/)).toBeTruthy();
    expect(within(dialog()).getByText("1 de 2")).toBeTruthy();
  });

  it("agrega, tilda, corrige y borra cosas", async () => {
    const shared = open();
    await userEvent.type(screen.getByRole("textbox", { name: "Agregar a la lista" }), "Kairo{Enter}");
    expect(shared.addItem).toHaveBeenCalledWith("l1", "Kairo");
    expect((screen.getByRole("textbox", { name: "Agregar a la lista" }) as HTMLInputElement).value).toBe("");

    await userEvent.click(screen.getByRole("checkbox", { name: "Polar" }));
    expect(shared.toggleItem).toHaveBeenCalledWith("l1", "a");

    await userEvent.click(screen.getAllByRole("button", { name: "Corregir" })[0]);
    const box = screen.getByRole("textbox", { name: "Corregir Polar" });
    await userEvent.clear(box);
    await userEvent.type(box, "Polar abrigado{Enter}");
    expect(shared.editItem).toHaveBeenCalledWith("l1", "a", "Polar abrigado");

    await userEvent.click(screen.getAllByRole("button", { name: "Quitar" })[1]);
    expect(shared.removeItem).toHaveBeenCalledWith("l1", "b");
  });

  it("cambia el día de la lista", async () => {
    const shared = open();
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Día" }), "2026-11-02");
    expect(shared.updateList).toHaveBeenCalledWith("l1", { day: "2026-11-02" });
  });

  it("borrar la lista pide confirmar", async () => {
    const shared = open();
    await userEvent.click(screen.getByRole("button", { name: "Borrar lista" }));
    expect(shared.removeList).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Sí, borrar la lista" }));
    expect(shared.removeList).toHaveBeenCalledWith("l1");
  });

  it("si la otra persona la borró, lo avisa", () => {
    render(<ListModal api={api({ lists: [] })} target={{ listId: "l1" }} itinerary={itinerary} onClose={vi.fn()} />);
    expect(screen.getByText(/ya no existe/)).toBeTruthy();
  });
});
