// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import CostSummaryView from "@/components/CostSummaryView";
import type { Expense, Withdrawal } from "@/lib/expenses";
import { fixtureTrip } from "./fixtures";
import { downloadCsv } from "@/lib/csv";

// La descarga real necesita un navegador: se reemplaza y se mira qué se iba a bajar
vi.mock("@/lib/csv", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/csv")>()),
  downloadCsv: vi.fn(),
}));

afterEach(cleanup);

const expenses: Expense[] = [
  { id: "e1", date: "2026-11-02", amount: 1570, currency: "JPY", method: "cash", category: "entradas", note: "Toshogu", createdAt: 1 },
  { id: "e2", date: "2026-11-02", amount: 16000, currency: "COP", method: "card", note: "Comisión", createdAt: 2 },
];
const withdrawals: Withdrawal[] = [{ id: "w1", date: "2026-11-01", amountYen: 30000, note: "Cajero", createdAt: 1 }];

function renderView(over: Partial<Parameters<typeof CostSummaryView>[0]> = {}) {
  const props = {
    slug: "test",
    itinerary: fixtureTrip.itinerary,
    startDate: fixtureTrip.meta.startDate,
    defaultDate: "2026-11-02",
    onDaySelect: vi.fn(),
    expenses,
    withdrawals,
    onAddExpense: vi.fn(),
    onAddWithdrawal: vi.fn(),
    onRemoveExpense: vi.fn(),
    onRemoveWithdrawal: vi.fn(),
    onUpdateExpense: vi.fn(),
    onUpdateWithdrawal: vi.fn(),
    ...over,
  };
  render(<CostSummaryView {...props} />);
  return props;
}

describe("CostSummaryView", () => {
  it("muestra lo gastado y el efectivo que te queda", () => {
    renderView();
    expect(screen.getByRole("heading", { name: "Costos y gastos" })).toBeTruthy();
    // ¥1,570 = $10 y COP 16,000 = $5 (cambios de respaldo)
    expect(screen.getByLabelText("Gastado").textContent).toContain("≈US$15");
    expect(screen.getByLabelText("Efectivo").textContent).toContain("¥28,430");
    expect(screen.getByLabelText("Efectivo").textContent).toContain("retiraste ¥30,000");
  });

  it("el resumen diario lista cada día con sus gastos y retiros", () => {
    renderView();
    const day2 = screen.getByRole("region", { name: /2 nov/ });
    expect(within(day2).getByText("¥1,570")).toBeTruthy();
    expect(within(day2).getByText("COP 16,000")).toBeTruthy();
    expect(within(day2).getByText(/≈US\$15/)).toBeTruthy();
    const day1 = screen.getByRole("region", { name: /1 nov/ });
    expect(within(day1).getByText(/Retiro ¥30,000/)).toBeTruthy();
  });

  it("muestra el tipo de cada gasto (los de antes, como Otros)", () => {
    renderView();
    const day2 = screen.getByRole("region", { name: /2 nov/ });
    expect(within(day2).getByLabelText("Entradas y actividades")).toBeTruthy();
    expect(within(day2).getByLabelText("Otros")).toBeTruthy();
  });

  it("tocar un gasto lo abre para editarlo y guarda los cambios en el mismo gasto", async () => {
    const props = renderView();
    await userEvent.click(screen.getByRole("button", { name: "Editar gasto Toshogu" }));
    expect(screen.getByRole("dialog", { name: "Editar gasto" })).toBeTruthy();
    await userEvent.selectOptions(screen.getByLabelText("Tipo de gasto"), "comida");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(props.onUpdateExpense).toHaveBeenCalledWith("e1", expect.objectContaining({ amount: 1570, category: "comida" }));
    expect(props.onAddExpense).not.toHaveBeenCalled();
  });

  it("también se edita un retiro", async () => {
    const props = renderView();
    await userEvent.click(screen.getByRole("button", { name: "Editar retiro Cajero" }));
    await userEvent.clear(screen.getByLabelText("Monto"));
    await userEvent.type(screen.getByLabelText("Monto"), "20000");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(props.onUpdateWithdrawal).toHaveBeenCalledWith("w1", { date: "2026-11-01", amountYen: 20000, note: "Cajero" });
  });

  it("un hospedaje de dos noches aparece en las dos, con su mitad", () => {
    renderView({ expenses: [{ id: "h", date: "2026-11-01", amount: 17000, currency: "JPY", method: "card", category: "hospedaje", nights: ["2026-11-01", "2026-11-02"], note: "New Izu", createdAt: 1, perUsd: 157 }], withdrawals: [] });
    for (const [day, night] of [[/1 nov/, "noche 1 de 2"], [/2 nov/, "noche 2 de 2"]] as const) {
      const region = screen.getByRole("region", { name: day });
      expect(within(region).getByText("¥8,500")).toBeTruthy();
      expect(within(region).getByText(night)).toBeTruthy();
      expect(within(region).getByText(/≈US\$54/)).toBeTruthy();
    }
    // El total gastado es el pago completo
    expect(screen.getByLabelText("Gastado").textContent).toContain("≈US$108");
  });

  it("quita un gasto o un retiro", async () => {
    const props = renderView();
    await userEvent.click(screen.getByRole("button", { name: "Quitar gasto Toshogu" }));
    expect(props.onRemoveExpense).toHaveBeenCalledWith("e1");
    await userEvent.click(screen.getByRole("button", { name: "Quitar retiro Cajero" }));
    expect(props.onRemoveWithdrawal).toHaveBeenCalledWith("w1");
  });

  it("un solo botón Registrar abre el modal, y adentro se elige gasto o retiro", async () => {
    const props = renderView();
    expect(screen.queryByRole("button", { name: "+ Gasto" })).toBeNull();
    expect(screen.queryByRole("button", { name: "+ Retiro" })).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Registrar" }));
    await userEvent.type(screen.getByLabelText("Monto"), "900");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(props.onAddExpense).toHaveBeenCalledWith(expect.objectContaining({ amount: 900, date: "2026-11-02" }));
    expect(screen.queryByRole("dialog")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Registrar" }));
    await userEvent.click(screen.getByRole("radio", { name: "Retiro" }));
    await userEvent.type(screen.getByLabelText("Monto"), "30000");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(props.onAddWithdrawal).toHaveBeenCalledWith(expect.objectContaining({ amountYen: 30000 }));
  });

  it("exporta gastos y retiros a un CSV", async () => {
    const download = vi.mocked(downloadCsv);
    renderView();
    await userEvent.click(screen.getByRole("button", { name: "Exportar CSV" }));
    expect(download).toHaveBeenCalledTimes(1);
    const [filename, csv] = download.mock.calls[0];
    expect(filename).toMatch(/^gastos-test-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(csv).toContain("Toshogu");
    expect(csv).toContain("Retiro,,30000,JPY");
    expect(csv).toContain("Gasto,Entradas y actividades,1570");
  });

  it("sin registros no ofrece exportar", () => {
    renderView({ expenses: [], withdrawals: [] });
    expect(screen.queryByRole("button", { name: "Exportar CSV" })).toBeNull();
  });

  it("sin registros lo explica, y el presupuesto sigue en su pestaña", async () => {
    renderView({ expenses: [], withdrawals: [] });
    expect(screen.getByText(/Todavía no registraste gastos/)).toBeTruthy();
    await userEvent.click(screen.getByRole("radio", { name: "Presupuesto" }));
    expect(screen.getByText("Semana 1")).toBeTruthy();
  });
});
