// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import ExpenseModal from "@/components/ExpenseModal";
import { forgetRatesSession } from "@/lib/rates";

afterEach(cleanup);

const dates = [
  { date: "2026-11-01", label: "Dom 1 nov" },
  { date: "2026-11-02", label: "Lun 2 nov" },
];

function renderModal(over: Partial<Parameters<typeof ExpenseModal>[0]> = {}) {
  const props = {
    dates,
    defaultDate: "2026-11-02",
    onClose: vi.fn(),
    onSaveExpense: vi.fn(),
    onSaveWithdrawal: vi.fn(),
    ...over,
  };
  render(<ExpenseModal {...props} />);
  return props;
}

describe("ExpenseModal", () => {
  it("registra un gasto con su moneda, cómo se pagó y el día", async () => {
    const props = renderModal();
    expect(screen.getByRole("dialog", { name: "Registrar gasto" })).toBeTruthy();
    expect((screen.getByLabelText("Día") as HTMLSelectElement).value).toBe("2026-11-02");

    await userEvent.type(screen.getByLabelText("Monto"), "12.50");
    await userEvent.selectOptions(screen.getByLabelText("Moneda"), "USD");
    await userEvent.click(screen.getByRole("radio", { name: "Tarjeta" }));
    await userEvent.type(screen.getByLabelText("En qué"), "Taxi");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(props.onSaveExpense).toHaveBeenCalledWith({
      date: "2026-11-02",
      amount: 12.5,
      currency: "USD",
      method: "card",
      note: "Taxi",
    });
    expect(props.onClose).toHaveBeenCalled();
  });

  it("por defecto el gasto es en yenes y en efectivo", async () => {
    const props = renderModal();
    await userEvent.type(screen.getByLabelText("Monto"), "1600");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(props.onSaveExpense).toHaveBeenCalledWith(expect.objectContaining({ amount: 1600, currency: "JPY", method: "cash" }));
  });

  it("registra un retiro de efectivo en yenes", async () => {
    const props = renderModal();
    await userEvent.click(screen.getByRole("radio", { name: "Retiro" }));
    expect(screen.getByRole("dialog", { name: "Registrar retiro" })).toBeTruthy();
    expect(screen.queryByLabelText("Moneda")).toBeNull();
    await userEvent.selectOptions(screen.getByLabelText("Día"), "2026-11-01");
    await userEvent.type(screen.getByLabelText("Monto"), "30000");
    await userEvent.type(screen.getByLabelText("En qué"), "Cajero 7-Eleven");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(props.onSaveWithdrawal).toHaveBeenCalledWith({ date: "2026-11-01", amountYen: 30000, note: "Cajero 7-Eleven" });
  });

  it("se dibuja directo en el body, para que ninguna barra de la app lo tape", () => {
    // Dentro de un contenedor con z-index propio (la vista o la hoja del día), la
    // barra de navegación quedaba encima del botón Guardar
    const props = { dates, defaultDate: "2026-11-02", onClose: vi.fn(), onSaveExpense: vi.fn(), onSaveWithdrawal: vi.fn() };
    const { container } = render(
      <div style={{ position: "relative", zIndex: 20 }}>
        <ExpenseModal {...props} />
      </div>
    );
    const dialog = screen.getByRole("dialog");
    expect(container.contains(dialog)).toBe(false);
    expect(dialog.closest("body")).toBe(document.body);
  });

  describe("cotización", () => {
    const SAMPLE = { date: "2026-11-02", usd: { jpy: 156.94, cop: 3181.47 } };

    afterEach(() => {
      vi.unstubAllGlobals();
      forgetRatesSession();
      localStorage.clear();
    });

    it("muestra la cotización del momento y la guarda con el gasto", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => SAMPLE }));
      const props = renderModal();
      expect(await screen.findByText(/1 US\$ = ¥156\.94/)).toBeTruthy();
      await userEvent.type(screen.getByLabelText("Monto"), "1569");
      expect(screen.getByText(/≈ US\$10/)).toBeTruthy();
      await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
      expect(props.onSaveExpense).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 1569, currency: "JPY", perUsd: 156.94, rateDate: "2026-11-02" })
      );
      // queda como "última conocida" para usar sin conexión
      expect(JSON.parse(localStorage.getItem("viajes-cambio")!).date).toBe("2026-11-02");
    });

    it("sin conexión usa la última cotización conocida y lo avisa", async () => {
      localStorage.setItem("viajes-cambio", JSON.stringify({ date: "2026-11-01", perUsd: { USD: 1, JPY: 155, COP: 3200 } }));
      const props = renderModal();
      expect(await screen.findByText(/última conocida/)).toBeTruthy();
      await userEvent.type(screen.getByLabelText("Monto"), "1550");
      await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
      expect(props.onSaveExpense).toHaveBeenCalledWith(expect.objectContaining({ perUsd: 155, rateDate: "2026-11-01" }));
    });

    it("sin conexión ni cotización conocida avisa que el cambio es aproximado y no inventa una", async () => {
      const props = renderModal();
      expect(screen.getByText(/aproximado/)).toBeTruthy();
      await userEvent.type(screen.getByLabelText("Monto"), "1500");
      await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
      expect(vi.mocked(props.onSaveExpense).mock.calls[0][0]).not.toHaveProperty("perUsd");
    });
  });

  it("puede abrir directo en retiro", () => {
    renderModal({ initialKind: "withdrawal" });
    expect(screen.getByRole("dialog", { name: "Registrar retiro" })).toBeTruthy();
  });

  it("sin monto no deja guardar, y cancelar cierra sin guardar", async () => {
    const props = renderModal();
    expect(screen.getByRole("button", { name: "Guardar" }).hasAttribute("disabled")).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(props.onClose).toHaveBeenCalled();
    expect(props.onSaveExpense).not.toHaveBeenCalled();
  });
});
