// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import CostSummaryView from "@/components/CostSummaryView";
import type { Expense, Withdrawal } from "@/lib/expenses";
import { fixtureTrip } from "./fixtures";

afterEach(cleanup);

const expenses: Expense[] = [
  { id: "e1", date: "2026-11-02", amount: 1570, currency: "JPY", method: "cash", note: "Toshogu", createdAt: 1 },
  { id: "e2", date: "2026-11-02", amount: 16000, currency: "COP", method: "card", note: "Comisión", createdAt: 2 },
];
const withdrawals: Withdrawal[] = [{ id: "w1", date: "2026-11-01", amountYen: 30000, note: "Cajero", createdAt: 1 }];

function renderView(over: Partial<Parameters<typeof CostSummaryView>[0]> = {}) {
  const props = {
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

  it("sin registros lo explica, y el presupuesto sigue en su pestaña", async () => {
    renderView({ expenses: [], withdrawals: [] });
    expect(screen.getByText(/Todavía no registraste gastos/)).toBeTruthy();
    await userEvent.click(screen.getByRole("radio", { name: "Presupuesto" }));
    expect(screen.getByText("Semana 1")).toBeTruthy();
  });
});
