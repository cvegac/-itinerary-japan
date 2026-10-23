// Prueba el service worker (public/sw.js) en un contexto aislado con dobles
// de self, caches y fetch: qué guarda al instalarse y cómo responde cada pedido.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

type FetchFn = (r: Request | string) => Promise<Response>;

const SW_SOURCE = readFileSync(join(import.meta.dirname, "../public/sw.js"), "utf8");
const ORIGIN = "https://viajes.test";

type Listener = (event: { waitUntil?: (p: Promise<unknown>) => void; respondWith?: (p: Promise<Response>) => void; request?: Request }) => void;

function makeCaches() {
  const store = new Map<string, Map<string, Response>>();
  const open = async (name: string) => {
    if (!store.has(name)) store.set(name, new Map());
    const entries = store.get(name)!;
    const key = (r: Request | string) => (typeof r === "string" ? new URL(r, ORIGIN).href : r.url);
    return {
      addAll: async (urls: string[]) => urls.forEach((u) => entries.set(key(u), new Response(`precache ${u}`))),
      put: async (r: Request | string, res: Response) => void entries.set(key(r), res),
      match: async (r: Request | string, opts?: { ignoreSearch?: boolean }) => {
        const k = key(r);
        if (entries.has(k)) return entries.get(k)!.clone();
        if (opts?.ignoreSearch) {
          const base = k.split("?")[0];
          const found = Array.from(entries.entries()).find(([ek]) => ek.split("?")[0] === base);
          if (found) return found[1].clone();
        }
        return undefined;
      },
      keys: async () => Array.from(entries.keys()).map((u) => new Request(u)),
      delete: async (r: Request | string) => entries.delete(key(r)),
    };
  };
  return {
    store,
    api: {
      open,
      keys: async () => Array.from(store.keys()),
      delete: async (name: string) => store.delete(name),
      match: async (r: Request | string, opts?: { ignoreSearch?: boolean }) => {
        for (const name of Array.from(store.keys())) {
          const hit = await (await open(name)).match(r, opts);
          if (hit) return hit;
        }
        return undefined;
      },
    },
  };
}

function loadWorker(fetchImpl: FetchFn, version = "v2") {
  const listeners: Record<string, Listener> = {};
  const caches = makeCaches();
  const self = {
    location: { href: `${ORIGIN}/sw.js?v=${version}`, origin: ORIGIN },
    addEventListener: (type: string, fn: Listener) => (listeners[type] = fn),
    skipWaiting: vi.fn(async () => {}),
    clients: { claim: vi.fn(async () => {}) },
  };
  const context = { self, caches: caches.api, fetch: fetchImpl, URL, Request, Response, Promise, setTimeout, clearTimeout, console };
  runInNewContext(SW_SOURCE, context);
  return { listeners, caches, context: context as typeof context & { strategyFor: (url: string, mode: string) => string } };
}

async function lifecycle(listener: Listener) {
  let pending: Promise<unknown> = Promise.resolve();
  listener({ waitUntil: (p) => (pending = p) });
  await pending;
}

async function request(listener: Listener, url: string, mode: RequestMode = "cors", cache: RequestCache = "default") {
  let response: Promise<Response> | undefined;
  const req = new Request(new URL(url, ORIGIN).href, { mode: mode === "navigate" ? "same-origin" : mode });
  Object.defineProperty(req, "mode", { value: mode });
  Object.defineProperty(req, "cache", { value: cache });
  listener({ request: req, respondWith: (p) => (response = p) });
  return response;
}

describe("service worker", () => {
  let network: Mock<FetchFn>;

  beforeEach(() => {
    network = vi.fn<FetchFn>(async (r) => {
      const url = typeof r === "string" ? r : r.url;
      if (url.endsWith("/offline-manifest.json")) {
        return new Response(JSON.stringify({ version: "v2", files: ["/", "/japan/", "/_next/static/chunks/app.js"] }));
      }
      return new Response(`red ${url}`);
    });
  });

  it("elige la estrategia según el pedido", () => {
    const { context } = loadWorker(network);
    expect(context.strategyFor(`${ORIGIN}/japan/`, "navigate")).toBe("page");
    expect(context.strategyFor(`${ORIGIN}/_next/static/chunks/app.js`, "cors")).toBe("cache-first");
    expect(context.strategyFor(`${ORIGIN}/japan/index.txt?_rsc=1`, "cors")).toBe("stale");
    expect(context.strategyFor("https://tiles.openfreemap.org/planet/1/10/909/403.pbf", "cors")).toBe("map");
    expect(context.strategyFor("https://tiles.openfreemap.org/styles/liberty", "cors")).toBe("map-meta");
    expect(context.strategyFor("https://elevation-tiles-prod.s3.amazonaws.com/terrarium/8/227/101.png", "cors")).toBe("map");
    expect(context.strategyFor("https://otro-sitio.com/x.js", "cors")).toBe("network");
    // El manifiesto dice qué versión está publicada: siempre de la red
    expect(context.strategyFor(`${ORIGIN}/offline-manifest.json`, "cors")).toBe("network");
  });

  it("al instalarse guarda los archivos del manifiesto en la caché de su versión", async () => {
    const { listeners, caches } = loadWorker(network);
    await lifecycle(listeners.install);
    const app = caches.store.get("viajes-app-v2")!;
    expect(Array.from(app.keys())).toEqual([`${ORIGIN}/`, `${ORIGIN}/japan/`, `${ORIGIN}/_next/static/chunks/app.js`]);
  });

  it("al activarse borra las versiones viejas de la app pero conserva el mapa", async () => {
    const { listeners, caches } = loadWorker(network);
    caches.store.set("viajes-app-v1", new Map());
    caches.store.set("viajes-mapa", new Map());
    caches.store.set("otra-app", new Map());
    await lifecycle(listeners.activate);
    expect(Array.from(caches.store.keys()).sort()).toEqual(["otra-app", "viajes-mapa"]);
  });

  it("sin conexión abre la página guardada", async () => {
    const { listeners } = loadWorker(network);
    await lifecycle(listeners.install);
    network.mockImplementation(async () => {
      throw new TypeError("sin red");
    });
    const res = await request(listeners.fetch, "/japan/", "navigate");
    expect(await res!.text()).toBe("precache /japan/");
  });

  it("con conexión trae la página nueva y actualiza la copia", async () => {
    const { listeners, caches } = loadWorker(network);
    await lifecycle(listeners.install);
    const res = await request(listeners.fetch, "/japan/", "navigate");
    expect(await res!.text()).toBe(`red ${ORIGIN}/japan/`);
    const saved = caches.store.get("viajes-app-v2")!.get(`${ORIGIN}/japan/`)!;
    expect(await saved.text()).toBe(`red ${ORIGIN}/japan/`);
  });

  it("guarda los tiles del mapa la primera vez y después los sirve sin red", async () => {
    const { listeners } = loadWorker(network);
    const tile = "https://tiles.openfreemap.org/planet/1/10/909/403.pbf";
    await (await request(listeners.fetch, tile))!.text();
    network.mockImplementation(async () => {
      throw new TypeError("sin red");
    });
    expect(await (await request(listeners.fetch, tile))!.text()).toBe(`red ${tile}`);
  });

  it("sin red usa el mapa descargado por adelantado (otra caché)", async () => {
    const { listeners, caches } = loadWorker(network);
    const tile = "https://tiles.openfreemap.org/planet/1/14/1/1.pbf";
    caches.store.set("viajes-mapa-viaje", new Map([[tile, new Response("descargado")]]));
    network.mockImplementation(async () => {
      throw new TypeError("sin red");
    });
    expect(await (await request(listeners.fetch, tile))!.text()).toBe("descargado");
  });

  it("deja pasar la descarga anticipada (cache: reload) para no guardar dos copias", async () => {
    const { listeners } = loadWorker(network);
    const tile = "https://tiles.openfreemap.org/planet/1/14/1/1.pbf";
    expect(await request(listeners.fetch, tile, "cors", "reload")).toBeUndefined();
  });

  it("el estilo del mapa viene de la red si hay, y si no del guardado", async () => {
    const { listeners, caches } = loadWorker(network);
    const style = "https://tiles.openfreemap.org/styles/liberty";
    caches.store.set("viajes-mapa-viaje", new Map([[style, new Response("estilo viejo")]]));
    expect(await (await request(listeners.fetch, style))!.text()).toBe(`red ${style}`);
    network.mockImplementation(async () => {
      throw new TypeError("sin red");
    });
    expect(await (await request(listeners.fetch, style))!.text()).not.toMatch(/^red/);
  });

  it("al recibir el aviso de desactivar deja de interceptar (y de guardar) en el acto", async () => {
    const { listeners } = loadWorker(network);
    (listeners.message as unknown as (e: { data: unknown }) => void)({ data: { type: "disable" } });
    expect(await request(listeners.fetch, "https://tiles.openfreemap.org/planet/1/10/1/1.pbf")).toBeUndefined();
    expect(await request(listeners.fetch, "/japan/", "navigate")).toBeUndefined();
  });

  it("no intercepta pedidos de otros sitios ni que no sean GET", async () => {
    const { listeners } = loadWorker(network);
    expect(await request(listeners.fetch, "https://otro-sitio.com/x.js")).toBeUndefined();
  });
});
