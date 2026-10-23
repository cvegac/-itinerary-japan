// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fixtureTrip } from "./fixtures";

const NONE = { detail: false, wide: false, relief: false };

const mocks = vi.hoisted(() => ({
  offlineEnabled: true,
  status: { downloaded: false, layers: { detail: false, wide: false, relief: false }, tiles: 0 },
}));

vi.mock("@/lib/offline", () => ({
  isOfflineSupported: () => true,
  isOfflineEnabled: vi.fn(async () => mocks.offlineEnabled),
  enableOffline: vi.fn(async () => {
    mocks.offlineEnabled = true;
  }),
  disableOffline: vi.fn(async () => {}),
  storageUsage: vi.fn(async () => 1_000_000),
}));

vi.mock("@/lib/map-download", () => ({
  estimateTripMap: vi.fn((_it: unknown, layers: typeof NONE) => ({
    baseBytes: 72e6,
    detailBytes: 81e6,
    wideBytes: 174e6,
    reliefBytes: 19e6,
    totalBytes: 72e6 + (layers.detail ? 81e6 : 0) + (layers.wide ? 174e6 : 0) + (layers.relief ? 19e6 : 0),
  })),
  tripMapStatus: vi.fn(async () => mocks.status),
  downloadTripMap: vi.fn(async (_it: unknown, { onProgress }: { onProgress?: (p: object) => void }) => {
    onProgress?.({ done: 10, total: 10, failed: 0, bytes: 5e6 });
    return { done: 10, total: 10, failed: 0, bytes: 5e6, cancelled: false };
  }),
  deleteTripMap: vi.fn(async () => {}),
}));

import OfflineControl from "@/components/OfflineControl";
import { enableOffline } from "@/lib/offline";
import { deleteTripMap, downloadTripMap } from "@/lib/map-download";

beforeEach(() => {
  mocks.offlineEnabled = true;
  mocks.status = { downloaded: false, layers: { ...NONE }, tiles: 0 };
  vi.clearAllMocks();
});
afterEach(cleanup);

async function openPanel() {
  render(<OfflineControl itinerary={fixtureTrip.itinerary} />);
  await act(() => userEvent.click(screen.getByRole("button", { name: /sin conexión/i })));
  await waitFor(() => expect(screen.getByRole("checkbox", { name: /Mapa base/ })).toBeTruthy());
}

const box = (name: RegExp) => screen.getByRole("checkbox", { name }) as HTMLInputElement;

describe("descarga del mapa", () => {
  it("la base va siempre y las capas extra son opcionales, con su peso", async () => {
    await openPanel();
    expect(box(/Mapa base/).checked).toBe(true);
    expect(box(/Mapa base/).disabled).toBe(true);
    for (const name of [/Más zoom/, /Alrededores/, /Relieve/]) expect(box(name).checked).toBe(false);
    expect(screen.getByText(/\+81 MB/)).toBeTruthy();
    expect(screen.getByText(/\+174 MB/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Descargar.*72 MB/ })).toBeTruthy();
  });

  it("descarga solo las capas elegidas y suma su peso al total", async () => {
    await openPanel();
    await act(() => userEvent.click(box(/Relieve/)));
    await act(() => userEvent.click(screen.getByRole("button", { name: /Descargar.*91 MB/ })));
    expect(downloadTripMap).toHaveBeenCalledWith(
      fixtureTrip.itinerary,
      expect.objectContaining({ layers: { detail: false, wide: false, relief: true } })
    );
  });

  it("si el uso sin conexión está apagado, lo activa antes de descargar", async () => {
    mocks.offlineEnabled = false;
    await openPanel();
    await act(() => userEvent.click(screen.getByRole("button", { name: /Descargar/ })));
    expect(enableOffline).toHaveBeenCalled();
    expect(downloadTripMap).toHaveBeenCalled();
  });

  it("marca las capas que ya están descargadas y deja borrarlas", async () => {
    mocks.status = { downloaded: true, layers: { detail: false, wide: true, relief: true }, tiles: 900 };
    await openPanel();
    await waitFor(() => expect(box(/Alrededores/).checked).toBe(true));
    expect(box(/Relieve/).checked).toBe(true);
    expect(box(/Más zoom/).checked).toBe(false);
    await act(() => userEvent.click(screen.getByRole("button", { name: /Borrar mapa/ })));
    expect(deleteTripMap).toHaveBeenCalled();
  });
});
