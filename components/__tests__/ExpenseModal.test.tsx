// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import ExpenseModal from "@/components/ExpenseModal";
import { forgetRatesSession } from "@/lib/rates";
import type { Expense } from "@/lib/expenses";

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
  it("registra un gasto con su tipo, su moneda, cómo se pagó y el día", async () => {
    const props = renderModal();
    expect(screen.getByRole("dialog", { name: "Registrar gasto" })).toBeTruthy();
    expect((screen.getByLabelText("Día") as HTMLSelectElement).value).toBe("2026-11-02");

    await userEvent.type(screen.getByLabelText("Monto"), "12.50");
    await userEvent.selectOptions(screen.getByLabelText("Moneda"), "USD");
    await userEvent.click(screen.getByRole("radio", { name: "Tarjeta" }));
    await userEvent.selectOptions(screen.getByLabelText("Tipo de gasto"), "transporte");
    await userEvent.type(screen.getByLabelText("En qué"), "Taxi");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(props.onSaveExpense).toHaveBeenCalledWith({
      date: "2026-11-02",
      amount: 12.5,
      currency: "USD",
      method: "card",
      category: "transporte",
      note: "Taxi",
    });
    expect(props.onClose).toHaveBeenCalled();
  });

  it("por defecto el gasto es de comida, en yenes y en efectivo", async () => {
    const props = renderModal();
    await userEvent.type(screen.getByLabelText("Monto"), "1600");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(props.onSaveExpense).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 1600, currency: "JPY", method: "cash", category: "comida" })
    );
  });

  describe("hospedaje de varias noches", () => {
    const stayOf = (date: string) => (date <= "2026-11-02" ? ["2026-11-01", "2026-11-02"] : ["2026-11-03"]);

    it("por defecto se reparte entre las noches de la estadía", async () => {
      const props = renderModal({ stayOf });
      await userEvent.type(screen.getByLabelText("Monto"), "17000");
      await userEvent.selectOptions(screen.getByLabelText("Tipo de gasto"), "hospedaje");
      expect(screen.getByRole("radio", { name: /Toda la estadía/ }).getAttribute("aria-checked")).toBe("true");
      expect(screen.getByText(/¥8,500 por noche/)).toBeTruthy();
      await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
      expect(props.onSaveExpense).toHaveBeenCalledWith(
        expect.objectContaining({ category: "hospedaje", nights: ["2026-11-01", "2026-11-02"] })
      );
    });

    it("con Solo este día cuenta para el día del pago", async () => {
      const props = renderModal({ stayOf });
      await userEvent.type(screen.getByLabelText("Monto"), "8500");
      await userEvent.selectOptions(screen.getByLabelText("Tipo de gasto"), "hospedaje");
      await userEvent.click(screen.getByRole("radio", { name: "Solo este día" }));
      await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
      expect(vi.mocked(props.onSaveExpense).mock.calls[0][0]).not.toHaveProperty("nights");
    });

    it("si la estadía es de una noche (o no es hospedaje) no pregunta", async () => {
      const props = renderModal({ stayOf, defaultDate: "2026-11-03", dates: [...dates, { date: "2026-11-03", label: "Mar 3 nov" }] });
      await userEvent.type(screen.getByLabelText("Monto"), "6480");
      expect(screen.queryByRole("radio", { name: /Toda la estadía/ })).toBeNull();
      await userEvent.selectOptions(screen.getByLabelText("Tipo de gasto"), "hospedaje");
      expect(screen.queryByRole("radio", { name: /Toda la estadía/ })).toBeNull();
      await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
      expect(vi.mocked(props.onSaveExpense).mock.calls[0][0]).not.toHaveProperty("nights");
    });

    it("al editar respeta lo que se eligió", () => {
      const base = { id: "h", date: "2026-11-01", amount: 8500, currency: "JPY" as const, method: "card" as const, category: "hospedaje" as const, note: "", createdAt: 1 };
      renderModal({ stayOf, editing: { kind: "expense", record: base } });
      expect(screen.getByRole("radio", { name: "Solo este día" }).getAttribute("aria-checked")).toBe("true");
      cleanup();
      renderModal({ stayOf, editing: { kind: "expense", record: { ...base, nights: ["2026-11-01", "2026-11-02"] } } });
      expect(screen.getByRole("radio", { name: /Toda la estadía/ }).getAttribute("aria-checked")).toBe("true");
    });
  });

  describe("al editar", () => {
    const saved: Expense = {
      id: "e1",
      date: "2026-11-01",
      amount: 1570,
      currency: "JPY",
      method: "card",
      category: "comida",
      note: "Toshogu",
      createdAt: 1,
      perUsd: 150,
      rateDate: "2026-11-01",
    };

    it("abre con los datos del gasto y sin la opción de pasarlo a retiro", () => {
      renderModal({ editing: { kind: "expense", record: saved } });
      expect(screen.getByRole("dialog", { name: "Editar gasto" })).toBeTruthy();
      expect(screen.queryByRole("radio", { name: "Retiro" })).toBeNull();
      expect((screen.getByLabelText("Monto") as HTMLInputElement).value).toBe("1570");
      expect((screen.getByLabelText("Día") as HTMLSelectElement).value).toBe("2026-11-01");
      expect((screen.getByLabelText("Tipo de gasto") as HTMLSelectElement).value).toBe("comida");
      expect((screen.getByLabelText("En qué") as HTMLInputElement).value).toBe("Toshogu");
      expect(screen.getByRole("radio", { name: "Tarjeta" }).getAttribute("aria-checked")).toBe("true");
    });

    it("guarda los cambios con la cotización de ese día si no cambia la moneda", async () => {
      const props = renderModal({ editing: { kind: "expense", record: saved } });
      await userEvent.clear(screen.getByLabelText("Monto"));
      await userEvent.type(screen.getByLabelText("Monto"), "2000");
      await userEvent.selectOptions(screen.getByLabelText("Tipo de gasto"), "entradas");
      await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
      expect(props.onSaveExpense).toHaveBeenCalledWith({
        date: "2026-11-01",
        amount: 2000,
        currency: "JPY",
        method: "card",
        category: "entradas",
        note: "Toshogu",
        perUsd: 150,
        rateDate: "2026-11-01",
      });
    });

    it("un gasto sin tipo (de antes) abre como Otros", () => {
      const { category: _c, ...old } = saved;
      renderModal({ editing: { kind: "expense", record: old } });
      expect((screen.getByLabelText("Tipo de gasto") as HTMLSelectElement).value).toBe("otros");
    });

    it("edita un retiro", async () => {
      const props = renderModal({
        editing: { kind: "withdrawal", record: { id: "w1", date: "2026-11-01", amountYen: 30000, note: "Cajero", createdAt: 1 } },
      });
      expect(screen.getByRole("dialog", { name: "Editar retiro" })).toBeTruthy();
      await userEvent.clear(screen.getByLabelText("Monto"));
      await userEvent.type(screen.getByLabelText("Monto"), "20000");
      await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
      expect(props.onSaveWithdrawal).toHaveBeenCalledWith({ date: "2026-11-01", amountYen: 20000, note: "Cajero" });
    });
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
