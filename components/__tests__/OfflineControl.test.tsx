// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const offline = vi.hoisted(() => ({
  enabled: false,
  isOfflineSupported: vi.fn(() => true),
  isOfflineEnabled: vi.fn(async () => offline.enabled),
  enableOffline: vi.fn(async () => {
    offline.enabled = true;
  }),
  disableOffline: vi.fn(async () => {
    offline.enabled = false;
  }),
  storageUsage: vi.fn(async () => 3_400_000),
}));

vi.mock("@/lib/offline", () => offline);

import OfflineControl from "@/components/OfflineControl";

beforeEach(() => {
  offline.enabled = false;
  vi.clearAllMocks();
});
afterEach(cleanup);

async function openPanel() {
  render(<OfflineControl />);
  await act(() => userEvent.click(screen.getByRole("button", { name: /sin conexión/i })));
  return screen.getByRole("switch", { name: /Usar sin conexión/ });
}

describe("OfflineControl", () => {
  it("por defecto está apagado y avisa que no se guarda nada", async () => {
    const toggle = await openPanel();
    await waitFor(() => expect(toggle.getAttribute("aria-checked")).toBe("false"));
    expect(screen.getByText(/no se guarda nada/i)).toBeTruthy();
    expect(offline.enableOffline).not.toHaveBeenCalled();
  });

  it("al activarlo guarda la app y muestra cuánto ocupa", async () => {
    const toggle = await openPanel();
    await act(() => userEvent.click(toggle));
    expect(offline.enableOffline).toHaveBeenCalled();
    await waitFor(() => expect(toggle.getAttribute("aria-checked")).toBe("true"));
    expect(screen.getByText(/3[.,]4 MB/)).toBeTruthy();
  });

  it("al desactivarlo borra lo guardado", async () => {
    offline.enabled = true;
    const toggle = await openPanel();
    await waitFor(() => expect(toggle.getAttribute("aria-checked")).toBe("true"));
    await act(() => userEvent.click(toggle));
    expect(offline.disableOffline).toHaveBeenCalled();
    await waitFor(() => expect(toggle.getAttribute("aria-checked")).toBe("false"));
  });
});
