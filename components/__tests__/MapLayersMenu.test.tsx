// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import MapLayersMenu from "@/components/MapLayersMenu";

afterEach(cleanup);

function setup(overrides: Partial<React.ComponentProps<typeof MapLayersMenu>> = {}) {
  const props = {
    mode: "day" as const,
    onModeChange: vi.fn(),
    dayLayer: "all" as const,
    onDayLayerChange: vi.fn(),
    showShops: false,
    onShowShopsChange: vi.fn(),
    hasShops: true,
    terrain: false,
    onTerrainChange: vi.fn(),
    ...overrides,
  };
  render(<MapLayersMenu {...props} />);
  return props;
}

const open = () => act(() => userEvent.click(screen.getByRole("button", { name: "Capas del mapa" })));

describe("MapLayersMenu", () => {
  it("es un solo botón: las opciones aparecen al tocarlo", async () => {
    setup();
    const button = screen.getByRole("button", { name: "Capas del mapa" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("radiogroup", { name: "Qué mostrar en el mapa" })).toBeNull();
    await open();
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("radiogroup", { name: "Qué mostrar en el mapa" })).toBeTruthy();
    expect(screen.getByRole("radiogroup", { name: "Qué ver del día" })).toBeTruthy();
  });

  it("cambia la vista, las capas del día, las tiendas y el relieve", async () => {
    const props = setup();
    await open();
    const menu = screen.getByRole("dialog", { name: "Capas del mapa" });
    await act(() => userEvent.click(within(menu).getByRole("radio", { name: "Semana" })));
    expect(props.onModeChange).toHaveBeenCalledWith("week");
    await act(() => userEvent.click(within(menu).getByRole("radio", { name: "Transporte" })));
    expect(props.onDayLayerChange).toHaveBeenCalledWith("transit");
    await act(() => userEvent.click(within(menu).getByRole("switch", { name: /Segunda mano/ })));
    expect(props.onShowShopsChange).toHaveBeenCalledWith(true);
    await act(() => userEvent.click(within(menu).getByRole("switch", { name: /Relieve 3D/ })));
    expect(props.onTerrainChange).toHaveBeenCalledWith(true);
  });

  it("las capas del día solo aparecen en la vista Día, y sin tiendas no hay interruptor de tiendas", async () => {
    setup({ mode: "week", hasShops: false });
    await open();
    expect(screen.queryByRole("radiogroup", { name: "Qué ver del día" })).toBeNull();
    expect(screen.queryByRole("switch", { name: /Segunda mano/ })).toBeNull();
  });

  it("el punto en el botón avisa que hay algo distinto de lo normal (tiendas, relieve u otra vista)", () => {
    setup({ showShops: true });
    expect(screen.getByRole("button", { name: "Capas del mapa" }).querySelector("[data-active]")).toBeTruthy();
    cleanup();
    setup();
    expect(screen.getByRole("button", { name: "Capas del mapa" }).querySelector("[data-active]")).toBeNull();
  });
});
