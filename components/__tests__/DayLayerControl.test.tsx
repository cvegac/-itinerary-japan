// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import DayLayerControl from "@/components/DayLayerControl";

afterEach(cleanup);

describe("DayLayerControl", () => {
  it("deja elegir entre todo, solo el transporte o solo el recorrido del día", async () => {
    const onChange = vi.fn();
    render(<DayLayerControl layer="all" onChange={onChange} />);
    const group = screen.getByRole("radiogroup", { name: "Qué ver del día" });
    expect(group).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Todo" }).getAttribute("aria-checked")).toBe("true");
    await act(() => userEvent.click(screen.getByRole("radio", { name: "Transporte" })));
    expect(onChange).toHaveBeenCalledWith("transit");
    await act(() => userEvent.click(screen.getByRole("radio", { name: "Recorrido" })));
    expect(onChange).toHaveBeenCalledWith("route");
  });
});
