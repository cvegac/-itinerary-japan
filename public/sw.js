/* Service worker para usar la app sin conexión.
 * Solo existe si el usuario lo activa desde la app (lib/offline.ts): por defecto
 * no se registra y no se guarda nada. Al desactivarlo se borra todo.
 *
 * - App (páginas, JS, CSS, datos): se guarda al instalar, según offline-manifest.json.
 * - Páginas: primero la red (para ver lo último publicado); sin red, la copia.
 * - Mapa: tiles y elevación se guardan a medida que se miran, con un tope.
 *   También se usa el mapa descargado por adelantado (lib/map-download.ts),
 *   que vive en otra caché sin tope.
 */
const VERSION = new URL(self.location.href).searchParams.get("v") || "dev";
const APP_CACHE = "viajes-app-" + VERSION;
const MAP_CACHE = "viajes-mapa";
const MAP_MAX_ENTRIES = 3000;
const PAGE_TIMEOUT_MS = 4000;
const MAP_HOSTS = ["tiles.openfreemap.org", "elevation-tiles-prod.s3.amazonaws.com"];

// Al desactivar, el navegador deja este worker controlando la página abierta
// hasta recargar: con este aviso deja de interceptar (y de guardar) en el acto.
let disabled = false;
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "disable") disabled = true;
});

function strategyFor(url, mode) {
  const u = new URL(url);
  if (MAP_HOSTS.includes(u.hostname)) {
    // Tiles, fuentes y sprites no cambian; los JSON de estilo sí (apuntan a la versión de los tiles)
    return /\.(pbf|png|webp|jpg)$/.test(u.pathname) ? "map" : "map-meta";
  }
  if (u.origin !== self.location.origin) return "network";
  if (u.pathname === "/offline-manifest.json") return "network";
  if (mode === "navigate") return "page";
  if (u.pathname.startsWith("/_next/static/")) return "cache-first";
  return "stale";
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const res = await fetch("/offline-manifest.json", { cache: "no-store" });
      const { files } = await res.json();
      const cache = await caches.open(APP_CACHE);
      await cache.addAll(files);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n.startsWith("viajes-app-") && n !== APP_CACHE).map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (disabled || request.method !== "GET") return;
  const strategy = strategyFor(request.url, request.mode);
  if (strategy === "network") return;
  // La descarga anticipada guarda en su propia caché: la dejamos pasar para no duplicar
  if (request.cache === "reload" && strategy.startsWith("map")) return;
  event.respondWith(handle(request, strategy));
});

function handle(request, strategy) {
  switch (strategy) {
    case "page":
      return networkFirst(request);
    case "cache-first":
      return cacheFirst(request, APP_CACHE);
    case "map":
      return cacheFirst(request, MAP_CACHE, MAP_MAX_ENTRIES, true);
    case "map-meta":
      return networkFirstAnyCache(request, MAP_CACHE);
    default:
      return staleWhileRevalidate(request, APP_CACHE);
  }
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

async function networkFirst(request) {
  const cache = await caches.open(APP_CACHE);
  try {
    const response = await withTimeout(fetch(request), PAGE_TIMEOUT_MS);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = (await cache.match(request, { ignoreSearch: true })) || (await caches.match("/"));
    if (cached) return cached;
    throw error;
  }
}

/** Estilo y TileJSON: primero la red (dicen qué versión de tiles pedir); sin red, cualquier copia */
async function networkFirstAnyCache(request, cacheName) {
  try {
    const response = await withTimeout(fetch(request), PAGE_TIMEOUT_MS);
    if (response.ok) await (await caches.open(cacheName)).put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw error;
  }
}

async function cacheFirst(request, cacheName, maxEntries, searchAllCaches = false) {
  const cache = await caches.open(cacheName);
  // Los tiles pueden estar en la caché automática o en la del mapa descargado
  const cached = searchAllCaches ? await caches.match(request) : await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    if (maxEntries) await trim(cache, maxEntries);
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, { ignoreSearch: cacheName === APP_CACHE });
  const fresh = fetch(request)
    .then(async (response) => {
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);
  return cached || (await fresh) || Response.error();
}

/** Borra lo más viejo si la caché supera el tope (las claves salen en orden de inserción) */
async function trim(cache, maxEntries) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - maxEntries; i++) await cache.delete(keys[i]);
}
