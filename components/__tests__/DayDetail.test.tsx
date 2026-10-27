// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import DayDetail from "@/components/DayDetail";
import { makeDay } from "./fixtures";
import type { Expense } from "@/lib/expenses";

afterEach(cleanup);

const day = makeDay("2026-11-02", "Lun", {
  label: "Excursión a Nikko",
  budget: "$110",
  transport: [
    { mode: "tren", line: "Tobu Nikko Line", from: "Asakusa", to: "Tobu-Nikko", duration: "~2h", cost: { amount: 3000, currency: "JPY", included: "el NIKKO PASS", detail: "2 días" } },
  ],
  pois: [
    { name: "Santuario Toshogu", coords: [36.758, 139.599] },
    { name: "Cena en Asakusa", coords: [35.71, 139.79], night: true },
  ],
  activitiesDay: ["Puente Shinkyo", { text: "Santuario Toshogu", price: { amount: 1600, currency: "JPY", approx: true } }],
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

  it("muestra a qué hora sale y se pone el sol donde está el plan del día", () => {
    render(<DayDetail day={day} dayNumber={2} />);
    expect(screen.getByLabelText("Amanecer").textContent).toMatch(/^\d:\d{2}$/);
    expect(screen.getByLabelText("Atardecer").textContent).toMatch(/^1\d:\d{2}$/);
  });

  it("en un día de vuelo fuera de Japón no muestra el sol (las horas son de Japón)", () => {
    const flight = makeDay("2026-10-30", "Vie", { accommodation: "---", isTransit: true, enRoute: true, accommodationCoords: [4.7, -74.15] });
    render(<DayDetail day={flight} dayNumber={1} />);
    expect(screen.queryByLabelText("Amanecer")).toBeNull();
  });

  it("con conexión y si el día está cerca, muestra el pronóstico", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-25T10:00:00"));
    const fetchMock = vi.fn(async () => ({
      json: async () => ({
        daily: { time: ["2026-11-02"], weather_code: [63], temperature_2m_max: [16.6], temperature_2m_min: [9.2], precipitation_probability_max: [70] },
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    render(<DayDetail day={day} dayNumber={2} />);
    const chip = await screen.findByLabelText("Pronóstico: Lluvia");
    expect(chip.textContent).toContain("9–17 °C");
    expect(chip.textContent).toContain("70 %");
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("si el día está lejos no pide el pronóstico", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-01T10:00:00"));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<DayDetail day={day} dayNumber={2} />);
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("en los días de sendero avisa a qué hora oscurece", () => {
    render(<DayDetail day={{ ...day, hike: true }} dayNumber={2} />);
    expect(screen.getByText(/Oscurece a las 1\d:\d{2}/)).toBeTruthy();
  });

  describe("gastos del día", () => {
    const expenses: Expense[] = [
      { id: "e1", date: "2026-11-02", amount: 1650, currency: "JPY", method: "cash", note: "Toshogu", createdAt: 1 },
      { id: "e2", date: "2026-11-02", amount: 2, currency: "USD", method: "card", note: "Café", createdAt: 2 },
    ];

    it("lista lo gastado en su moneda y lo compara con el presupuesto", () => {
      render(<DayDetail day={day} dayNumber={2} expenses={expenses} onAddExpense={vi.fn()} onRemoveExpense={vi.fn()} />);
      const section = screen.getByRole("region", { name: "Gastos del día" });
      expect(within(section).getByText("¥1,650")).toBeTruthy();
      expect(within(section).getByText("US$2")).toBeTruthy();
      // ¥1,650 = $11 + $2
      expect(within(section).getByText(/Gastaste ≈US\$13 de \$110/)).toBeTruthy();
    });

    it("registra un gasto de ese día desde el modal", async () => {
      const onAdd = vi.fn();
      render(<DayDetail day={day} dayNumber={2} expenses={[]} onAddExpense={onAdd} onRemoveExpense={vi.fn()} />);
      await userEvent.click(screen.getByRole("button", { name: "Registrar" }));
      await userEvent.type(screen.getByLabelText("Monto"), "2500");
      await userEvent.type(screen.getByLabelText("En qué"), "Bici");
      await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
      expect(onAdd).toHaveBeenCalledWith({ date: "2026-11-02", amount: 2500, currency: "JPY", method: "cash", category: "comida", note: "Bici" });
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("tocar un gasto lo abre para editarlo", async () => {
      const onUpdate = vi.fn();
      render(
        <DayDetail day={day} dayNumber={2} expenses={expenses} onAddExpense={vi.fn()} onRemoveExpense={vi.fn()} onUpdateExpense={onUpdate} />
      );
      await userEvent.click(screen.getByRole("button", { name: "Editar gasto Toshogu" }));
      await userEvent.selectOptions(screen.getByLabelText("Tipo de gasto"), "entradas");
      await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
      expect(onUpdate).toHaveBeenCalledWith("e1", expect.objectContaining({ amount: 1650, category: "entradas" }));
    });

    it("un hospedaje pagado el día anterior muestra la parte de esta noche", () => {
      const paid: Expense = { id: "h", date: "2026-11-01", amount: 17000, currency: "JPY", method: "card", category: "hospedaje", nights: ["2026-11-01", "2026-11-02"], note: "New Izu", createdAt: 1, perUsd: 157 };
      render(<DayDetail day={day} dayNumber={2} expenses={[paid]} onAddExpense={vi.fn()} onRemoveExpense={vi.fn()} />);
      const section = screen.getByRole("region", { name: "Gastos del día" });
      expect(within(section).getByText("¥8,500")).toBeTruthy();
      expect(within(section).getByText("noche 2 de 2")).toBeTruthy();
      expect(within(section).getByText(/Gastaste ≈US\$54/)).toBeTruthy();
    });

    it("quita un gasto", async () => {
      const onRemove = vi.fn();
      render(<DayDetail day={day} dayNumber={2} expenses={expenses} onAddExpense={vi.fn()} onRemoveExpense={onRemove} />);
      await userEvent.click(screen.getByRole("button", { name: "Quitar gasto Toshogu" }));
      expect(onRemove).toHaveBeenCalledWith("e1");
    });
  });

  it("tiene la tarjeta para mostrar al taxista, con el teléfono para llamar", () => {
    const withJa = {
      ...day,
      lodgingJa: { name: "東京上野NEW伊豆ホテル", address: "東京都台東区東上野3-13-1", phone: "+81 3-3831-8666" },
    };
    render(<DayDetail day={withJa} dayNumber={2} />);
    const card = screen.getByRole("region", { name: "Mostrar al taxista" });
    expect(within(card).getByText("東京上野NEW伊豆ホテル")).toBeTruthy();
    expect(within(card).getByText("東京都台東区東上野3-13-1")).toBeTruthy();
    expect(within(card).getByRole("link", { name: /3831-8666/ }).getAttribute("href")).toBe("tel:+81338318666");
  });

  it("el día que llegás a un hospedaje avisa el horario de check-in, y el de check-out del anterior", () => {
    const arriving = { ...day, accommodation: "KUMANO家-OHGi-", checkIn: "15:00–19:00" };
    const yesterday = makeDay("2026-11-01", "Dom", { accommodation: "Tsukasa House", checkOut: "6:00–9:00" });
    render(<DayDetail day={arriving} dayNumber={2} morningLodging={yesterday} />);
    const alert = screen.getByRole("note", { name: "Horarios de hoy" });
    expect(alert.textContent).toContain("Check-out de Tsukasa House: 6:00–9:00");
    expect(alert.textContent).toContain("Check-in en KUMANO家-OHGi-: 15:00–19:00");
  });

  it("si seguís en la misma cama no avisa horarios", () => {
    render(<DayDetail day={{ ...day, checkIn: "15:00–19:00" }} dayNumber={2} />);
    expect(screen.queryByRole("note", { name: "Horarios de hoy" })).toBeNull();
  });

  it("si seguís en la misma cama no repite dónde amanecés", () => {
    render(<DayDetail day={day} dayNumber={2} />);
    expect(screen.queryByText("Amanecés en")).toBeNull();
  });

  it("muestra con qué tarjeta o pase se paga cada tramo del día", () => {
    const paid = makeDay("2026-11-02", "Lun", {
      transport: [
        { mode: "metro", line: "Ginza Line", from: "Inaricho", to: "Asakusa", pay: ["suica"] },
        { mode: "tren", line: "Tobu Nikko Line", from: "Asakusa", to: "Tobu-Nikko", pay: ["NIKKO PASS"] },
      ],
    });
    render(<DayDetail day={paid} dayNumber={2} />);
    const cards = screen.getByRole("list", { name: "Tarjetas del día" });
    const rows = within(cards).getAllByRole("listitem").map((li) => li.textContent);
    expect(rows).toEqual([expect.stringContaining("Suica / PASMO"), expect.stringContaining("NIKKO PASS")]);
    expect(rows[0]).toContain("Ginza Line");
    expect(rows[1]).toContain("Tobu Nikko Line");
  });

  it("no muestra las tarjetas si ningún tramo dice cómo se paga", () => {
    render(<DayDetail day={day} dayNumber={2} />);
    expect(screen.queryByRole("list", { name: "Tarjetas del día" })).toBeNull();
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

  it("muestra los costos y las entradas a partir de los datos", () => {
    render(<DayDetail day={day} dayNumber={2} />);
    const transport = screen.getByRole("list", { name: "Tramos de transporte" });
    expect(within(transport).getByText("Incluido en el NIKKO PASS (¥3,000, 2 días)")).toBeTruthy();
    const deDia = screen.getByRole("heading", { name: "De día" }).closest("section")!;
    const toshogu = within(deDia).getByText("Santuario Toshogu").closest("li")!;
    expect(within(toshogu).getByText("~¥1,600")).toBeTruthy();
  });
});

describe("DayDetail: notas compartidas", () => {
  const base: import("@/lib/use-shared-notes").SharedNotesApi = {
    status: "ready",
    me: "cris",
    trip: { id: "t1", members: ["cris", "karla"], names: { cris: "Cris", karla: "Karla" } },
    names: { cris: "Cris", karla: "Karla" },
    notes: [] as import("@/lib/shared-notes").SharedNote[],
    unseen: [] as import("@/lib/shared-notes").SharedNote[],
    markSeen: vi.fn(),
    add: vi.fn(),
    edit: vi.fn(),
    remove: vi.fn(),
    invite: vi.fn(),
    signIn: vi.fn(),
    invited: false,
    inviteError: null,
  };
  const shared = (extra: Partial<typeof base> = {}) => ({ ...base, markSeen: vi.fn(), add: vi.fn(), edit: vi.fn(), remove: vi.fn(), signIn: vi.fn(), ...extra });
  const note = (id: string, extra: object = {}) => ({ id, day: "2026-11-02", text: `Texto ${id}`, author: "karla", createdAt: 1, ...extra });
  const section = () => screen.getByRole("region", { name: "Notas del día" });

  it("sin sesión invita a entrar para ver y dejar notas", async () => {
    const api = shared({ status: "signed-out", me: null, trip: null });
    render(<DayDetail day={day} dayNumber={2} shared={api} />);
    await userEvent.click(within(section()).getByRole("button", { name: /Iniciar sesión/ }));
    expect(api.signIn).toHaveBeenCalled();
  });

  it("muestra las notas del día con quién las escribió", () => {
    render(<DayDetail day={day} dayNumber={2} shared={shared({ notes: [note("a"), note("b", { author: "cris" }), note("otro", { day: "2026-11-05" })] })} />);
    const list = within(section()).getByRole("list", { name: "Notas" });
    expect(within(list).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      expect.stringMatching(/Karla.*Texto a/),
      expect.stringMatching(/Vos.*Texto b/),
    ]);
  });

  it("agrega una nota para todo el día", async () => {
    const api = shared();
    render(<DayDetail day={day} dayNumber={2} shared={api} />);
    await userEvent.type(within(section()).getByRole("textbox", { name: "Nueva nota" }), "Llevar abrigo");
    await userEvent.click(within(section()).getByRole("button", { name: "Agregar nota" }));
    expect(api.add).toHaveBeenCalledWith("2026-11-02", "Llevar abrigo", undefined);
  });

  it("desde un lugar, la nota queda para ese lugar y se ve debajo de él", async () => {
    const api = shared({ notes: [note("l", { place: "Santuario Toshogu", text: "Ir temprano" })] });
    render(<DayDetail day={day} dayNumber={2} shared={api} />);
    const places = screen.getByRole("list", { name: "Lugares del día" });
    expect(within(places).getByText("Ir temprano")).toBeTruthy();
    expect(within(section()).queryByText("Ir temprano")).toBeNull();

    await userEvent.click(within(places).getByRole("button", { name: "Nota para Santuario Toshogu" }));
    expect((within(section()).getByRole("combobox", { name: "Sobre qué" }) as HTMLSelectElement).value).toBe("Santuario Toshogu");
    await userEvent.type(within(section()).getByRole("textbox", { name: "Nueva nota" }), "Hay fila");
    await userEvent.click(within(section()).getByRole("button", { name: "Agregar nota" }));
    expect(api.add).toHaveBeenCalledWith("2026-11-02", "Hay fila", "Santuario Toshogu");
  });

  it("cada uno edita las suyas; cualquiera borra", async () => {
    const api = shared({ notes: [note("a"), note("b", { author: "cris" })] });
    render(<DayDetail day={day} dayNumber={2} shared={api} />);
    const list = within(section()).getByRole("list", { name: "Notas" });
    const [theirs, mine] = within(list).getAllByRole("listitem");
    expect(within(theirs).queryByRole("button", { name: "Editar nota" })).toBeNull();

    await userEvent.click(within(mine).getByRole("button", { name: "Editar nota" }));
    const box = within(mine).getByRole("textbox", { name: "Editar nota" });
    await userEvent.clear(box);
    await userEvent.type(box, "Mejor al mediodía");
    await userEvent.click(within(mine).getByRole("button", { name: "Guardar" }));
    expect(api.edit).toHaveBeenCalledWith("b", "Mejor al mediodía");

    await userEvent.click(within(theirs).getByRole("button", { name: "Borrar nota" }));
    expect(api.remove).toHaveBeenCalledWith("a");
  });

  it("marca las nuevas y las da por vistas", () => {
    const fresh = note("n");
    const api = shared({ notes: [fresh], unseen: [fresh, note("otro-dia", { day: "2026-11-05" })] });
    render(<DayDetail day={day} dayNumber={2} shared={api} />);
    expect(within(section()).getByText("Nueva")).toBeTruthy();
    expect(api.markSeen).toHaveBeenCalledWith(["n"]);
  });
});

describe("DayDetail: Google Maps", () => {
  const places = { Asakusa: [35.71, 139.79] as [number, number], "Tobu-Nikko": [36.74, 139.62] as [number, number] };

  it("cada lugar se abre en Google Maps", () => {
    render(<DayDetail day={day} dayNumber={2} />);
    const link = screen.getByRole("link", { name: "Abrir Santuario Toshogu en Google Maps" });
    expect(link.getAttribute("href")).toBe("https://www.google.com/maps/search/?api=1&query=36.758%2C139.599");
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it("el recorrido del día, en el orden de visita", () => {
    render(<DayDetail day={day} dayNumber={2} />);
    const link = screen.getByRole("link", { name: /Recorrido A → B/ });
    expect(link.getAttribute("href")).toContain("/maps/dir/?api=1&origin=36.758%2C139.599&destination=35.71%2C139.79");
  });

  it("cada tramo de transporte, entre sus estaciones", () => {
    render(<DayDetail day={day} dayNumber={2} places={places} />);
    const link = screen.getByRole("link", { name: "Ver Asakusa → Tobu-Nikko en Google Maps" });
    expect(link.getAttribute("href")).toContain("travelmode=transit");
  });
});
