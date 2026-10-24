// Pedidos a servicios públicos (OSRM de FOSSGIS, Overpass de OSM) respetando su
// uso justo: un pedido por vez con pausa, reintentos y una caché local de
// respuestas (.cache/<servicio>) para no repetir pedidos entre corridas.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { root } from "./load-ts.mjs";

export const UA = "japan-trip-itinerary/1.0 (github.com/cvegac/-itinerary-japan)";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const stats = { requests: 0, cached: 0 };

/**
 * fetchJson: hace el pedido y devuelve el JSON, o null si no sirve (se reintenta).
 * pauseMs: espera antes de cada pedido real.
 */
export async function cachedJson(service, key, fetchJson, { pauseMs = 1100, attempts = 4 } = {}) {
  const dir = join(root, ".cache", service);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, createHash("sha1").update(key).digest("hex") + ".json");
  if (existsSync(file)) {
    stats.cached++;
    return JSON.parse(readFileSync(file, "utf8"));
  }
  for (let attempt = 1; attempt <= attempts; attempt++) {
    await sleep(pauseMs);
    stats.requests++;
    try {
      const json = await fetchJson();
      if (json) {
        writeFileSync(file, JSON.stringify(json));
        return json;
      }
    } catch {}
    await sleep(2000 * attempt);
  }
  return null;
}

const OSRM = "https://routing.openstreetmap.de";

/** path: "/routed-foot/route/v1/driving/…" (perfiles routed-foot, routed-bike, routed-car) */
export function osrm(path) {
  return cachedJson("osrm", path, async () => {
    const res = await fetch(`${OSRM}${path}`, { headers: { "User-Agent": UA } });
    if (!res.ok) return null;
    const json = await res.json();
    return json.code === "Ok" ? json : null;
  });
}

const OVERPASS = "https://overpass-api.de/api/interpreter";

export function overpass(query) {
  return cachedJson(
    "overpass",
    query,
    async () => {
      const res = await fetch(OVERPASS, {
        method: "POST",
        body: "data=" + encodeURIComponent(query),
        headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded" },
      });
      if (!res.ok) return null;
      return JSON.parse(await res.text());
    },
    { pauseMs: 2000, attempts: 5 }
  );
}
