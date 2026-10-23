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

  it("muestra a qué hora sale y se pone el sol donde está el plan del día", () => {
    render(<DayDetail day={day} dayNumber={2} />);
    expect(screen.getByLabelText("Amanecer").textContent).toMatch(/^\d:\d{2}$/);
    expect(screen.getByLabelText("Atardecer").textContent).toMatch(/^1\d:\d{2}$/);
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
      expect(onAdd).toHaveBeenCalledWith({ date: "2026-11-02", amount: 2500, currency: "JPY", method: "cash", note: "Bici" });
      expect(screen.queryByRole("dialog")).toBeNull();
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
