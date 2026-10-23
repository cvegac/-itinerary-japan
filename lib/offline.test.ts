// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CACHE_PREFIX, disableOffline, enableOffline, isOfflineEnabled } from "./offline";

// ── Dobles de las APIs del navegador ───────────────────────────────────────
type FakeRegistration = { scope: string; unregister: ReturnType<typeof vi.fn> };

let registrations: FakeRegistration[];
let cacheNames: string[];
const register = vi.fn(async (url: string) => {
  const reg = { scope: "/", url, unregister: vi.fn(async () => true) };
  registrations = [reg];
  return reg;
});

beforeEach(() => {
  registrations = [];
  cacheNames = [`${CACHE_PREFIX}app-v1`, `${CACHE_PREFIX}mapa`, "otra-app"];
  register.mockClear();
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: {
      register,
      getRegistration: async () => registrations[0],
      getRegistrations: async () => registrations,
      ready: Promise.resolve({}),
    },
  });
  vi.stubGlobal("caches", {
    keys: async () => cacheNames,
    delete: vi.fn(async (name: string) => {
      cacheNames = cacheNames.filter((n) => n !== name);
      return true;
    }),
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ version: "abc123", files: [] })))
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isOfflineEnabled", () => {
  it("por defecto está desactivado: no hay nada registrado", async () => {
    expect(await isOfflineEnabled()).toBe(false);
  });

  it("está activado si hay un service worker registrado", async () => {
    await enableOffline();
    expect(await isOfflineEnabled()).toBe(true);
  });
});

describe("enableOffline", () => {
  it("registra el service worker con la versión del build publicado", async () => {
    await enableOffline();
    expect(fetch).toHaveBeenCalledWith("/offline-manifest.json", { cache: "no-store" });
    expect(register).toHaveBeenCalledWith("/sw.js?v=abc123", { scope: "/" });
  });
});

describe("disableOffline", () => {
  it("desregistra el service worker y borra solo las cachés de la app", async () => {
    await enableOffline();
    const reg = registrations[0];
    await disableOffline();
    expect(reg.unregister).toHaveBeenCalled();
    expect(cacheNames).toEqual(["otra-app"]);
  });
});
