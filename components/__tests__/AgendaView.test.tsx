// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import AgendaView from "@/components/AgendaView";
import type { SharedNote } from "@/lib/shared-notes";
import { makeDay } from "./fixtures";

afterEach(cleanup);

const itinerary = [
  makeDay("2026-11-01", "Dom", { label: "Llegada a Asakusa", location: "Tokio" }),
  makeDay("2026-11-02", "Lun", { label: "Excursión a Nikko", location: "Nikko" }),
];
const note = (id: string, extra: Partial<SharedNote> = {}): SharedNote => ({
  id,
  day: "2026-11-02",
  text: `Texto ${id}`,
  author: "karla",
  createdAt: 1,
  ...extra,
});

function renderAgenda(extra: Partial<React.ComponentProps<typeof AgendaView>> = {}) {
  const props = {
    itinerary,
    openDate: null,
    onToggle: vi.fn(),
    renderDetail: (d: { label: string }) => <p>Detalle de {d.label}</p>,
    notes: [],
    unseen: [],
    names: { karla: "Karla" },
    me: "cris",
    ...extra,
  };
  render(<AgendaView {...props} />);
  return props;
}

const dayButton = (name: RegExp) => screen.getByRole("button", { name });

describe("AgendaView", () => {
  it("lista todos los días, cerrados", () => {
    renderAgenda();
    const days = screen.getByRole("list", { name: "Días del viaje" });
    expect(within(days).getAllByRole("listitem")).toHaveLength(2);
    expect(dayButton(/Llegada a Asakusa/).getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText(/Detalle de/)).toBeNull();
  });

  it("el día abierto muestra todo su detalle", () => {
    renderAgenda({ openDate: "2026-11-02" });
    expect(dayButton(/Excursión a Nikko/).getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Detalle de Excursión a Nikko")).toBeTruthy();
    expect(screen.queryByText("Detalle de Llegada a Asakusa")).toBeNull();
  });

  it("tocar un día lo abre (o lo cierra)", async () => {
    const props = renderAgenda();
    await userEvent.click(dayButton(/Excursión a Nikko/));
    expect(props.onToggle).toHaveBeenCalledWith(itinerary[1]);
  });

  it("cerrado, muestra cuántas notas tiene, cuántas son nuevas y la última", () => {
    renderAgenda({ notes: [note("a", { createdAt: 1 }), note("b", { createdAt: 2, author: "cris" })], unseen: [note("a")] });
    const nikko = dayButton(/Excursión a Nikko/);
    expect(nikko.textContent).toContain("2 notas");
    expect(nikko.textContent).toContain("1 nueva");
    expect(nikko.textContent).toContain("Vos: Texto b");
    expect(dayButton(/Llegada a Asakusa/).textContent).not.toContain("nota");
  });
});
