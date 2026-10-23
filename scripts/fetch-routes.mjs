// Precalcula las rutas de cada día con OSRM (routing.openstreetmap.de, de FOSSGIS):
// el mejor orden para recorrer los lugares, el trazado de cada tramo a pie o en
// bici y la ruta a pie desde el hospedaje a cada lugar cercano.
// Resultado: data/trips/<viaje>-routes.json (queda en los datos: funciona sin internet).
//
// Uso: node scripts/fetch-routes.mjs [viaje]   (por defecto: japan)
// Volver a correrlo cuando cambien los lugares de un día (un test avisa).
// Respeta el uso justo del servicio: un pedido por segundo, reintentos y una
// caché local de respuestas (.cache/osrm) para no repetir pedidos.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const ts = require(join(root, "node_modules/typescript"));

// ── Cargador mínimo de los módulos TS del proyecto (alias "@/") ────────────
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const mod = { exports: {} };
  cache.set(file, mod);
  if (file.endsWith(".json")) {
    mod.exports = JSON.parse(readFileSync(file, "utf8"));
    return mod.exports;
  }
  const js = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const req = (spec) => {
    const base = spec.startsWith("@/") ? join(root, spec.slice(2)) : spec.startsWith(".") ? join(dirname(file), spec) : null;
    if (!base) return require(spec);
    const found = [`${base}.ts`, `${base}.tsx`, join(base, "index.ts"), base].find(
      (candidate) => existsSync(candidate) && statSync(candidate).isFile()
    );
    if (!found) throw new Error(`no se encontró ${spec} desde ${file}`);
    return load(found);
  };
  new Function("module", "exports", "require", js)(mod, mod.exports, req);
  return mod.exports;
}

const { getAllTrips } = load(join(root, "data/trips/index.ts"));
const plan = load(join(root, "lib/route-plan.ts"));
const { distanceKm, routeStart } = load(join(root, "lib/map-geo.ts"));

// ── OSRM ────────────────────────────────────────────────────────────────
const OSRM = "https://routing.openstreetmap.de";
const UA = "japan-trip-itinerary/1.0 (github.com/cvegac/-itinerary-japan)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let requests = 0;
let cached = 0;
const CACHE_DIR = join(root, ".cache/osrm");
mkdirSync(CACHE_DIR, { recursive: true });

async function osrm(path) {
  const cacheFile = join(CACHE_DIR, createHash("sha1").update(path).digest("hex") + ".json");
  if (existsSync(cacheFile)) {
    cached++;
    return JSON.parse(readFileSync(cacheFile, "utf8"));
  }
  const json = await osrmFetch(path);
  if (json) writeFileSync(cacheFile, JSON.stringify(json));
  return json;
}

async function osrmFetch(path) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    await sleep(1100);
    requests++;
    try {
      const res = await fetch(`${OSRM}${path}`, { headers: { "User-Agent": UA } });
      if (res.ok) {
        const json = await res.json();
        if (json.code === "Ok") return json;
      }
    } catch {}
    await sleep(2000 * attempt);
  }
  return null;
}

const lngLat = ([lat, lng]) => `${lng},${lat}`;
const profileFor = (mode) => (mode === "bike" ? "routed-bike" : "routed-foot");
// Tramo de tren o bus: estimación gruesa para ordenar (30 km/h + 15 min de espera)
const transitSeconds = (km) => (km / 30) * 3600 + 900;
const round5 = (line) => line.map(([a, b]) => [Math.round(a * 1e5) / 1e5, Math.round(b * 1e5) / 1e5]);

async function route(mode, from, to) {
  const json = await osrm(`/${profileFor(mode)}/route/v1/driving/${lngLat(from)};${lngLat(to)}?overview=full&geometries=geojson`);
  const r = json?.routes?.[0];
  if (!r) return null;
  return {
    distanceM: Math.round(r.distance),
    durationS: Math.round(r.duration),
    line: round5(plan.simplifyLine(r.geometry.coordinates, 4)),
  };
}

// start: de dónde salen las rutas (lib/map-geo.ts routeStart)
async function dayRoutes(day, start) {
  const pois = day.pois ?? [];
  const bike = plan.isBikeDay(day);
  const hike = !!day.hike;
  const excursion = plan.isExcursion(day);
  const points = [start, ...pois.map((p) => p.coords)];
  const straight = (i, j) => distanceKm(points[i], points[j]);

  // Matriz de tiempos reales (a pie o en bici) entre hospedaje y lugares
  const table = await osrm(`/${profileFor(bike ? "bike" : "foot")}/table/v1/driving/${points.map(lngLat).join(";")}?annotations=duration`);
  const cost = (from, to) => {
    const i = from === "start" ? 0 : from + 1;
    const j = to === "start" ? 0 : to + 1;
    const km = straight(i, j);
    // La caminata es entre los lugares del sendero; al primero se llega en tren o bus
    if (plan.legMode(km, bike, hike && from !== "start" && to !== "start") === "transit") return transitSeconds(km);
    return table?.durations?.[i]?.[j] ?? (km / (bike ? 14 : 4.5)) * 3600;
  };

  const night = pois.flatMap((p, i) => (p.night ? [i] : []));
  // Ida y vuelta: al hospedaje, o a la estación (primer lugar) en las excursiones
  const rules = { night, roundTrip: true, ...(excursion ? { fixedFirst: 0 } : {}) };
  const best = plan.bestOrder(pois.length, cost, rules);

  // Costo de un orden con las mismas reglas de inicio y de vuelta
  const orderCost = (order) => {
    let total = 0;
    order.forEach((to, k) => {
      if (k === 0) total += excursion ? 0 : cost("start", to);
      else total += cost(order[k - 1], to);
    });
    return total + (order.length ? cost(order[order.length - 1], excursion ? order[0] : "start") : 0);
  };
  const identity = pois.map((_, i) => i);
  const originalCost = orderCost(identity);
  // El óptimo solo si el día no pide su orden y ahorra al menos 10 minutos
  const order = plan.chooseOrder(day, best, originalCost, pois.length);

  // Tramos en el orden elegido (las excursiones arrancan en el primer lugar)
  const legs = [];
  for (let k = 0; k < order.length; k++) {
    if (k === 0 && excursion) continue;
    const to = order[k];
    const from = k === 0 ? "lodging" : order[k - 1];
    const fromCoords = from === "lodging" ? start : pois[from].coords;
    const km = distanceKm(fromCoords, pois[to].coords);
    const mode = plan.legMode(km, bike, hike && from !== "lodging");
    if (mode === "transit") {
      legs.push({ from, to, mode, distanceM: Math.round(km * 1000), durationS: Math.round(transitSeconds(km)) });
      continue;
    }
    const r = await route(mode, fromCoords, pois[to].coords);
    legs.push(r ? { from, to, mode, ...r } : { from, to, mode: "transit", distanceM: Math.round(km * 1000), durationS: Math.round(transitSeconds(km)) });
  }

  // A pie desde el hospedaje a cada lugar cercano
  const fromLodging = {};
  for (let i = 0; i < pois.length; i++) {
    if (distanceKm(start, pois[i].coords) > plan.NEAR_LODGING_KM) continue;
    const reuse = legs.find((l) => l.from === "lodging" && l.to === i && l.mode === "foot" && l.line);
    const r = reuse ? { distanceM: reuse.distanceM, durationS: reuse.durationS, line: reuse.line } : await route("foot", start, pois[i].coords);
    if (r) fromLodging[i] = r;
  }

  return {
    signature: plan.poiSignature(day),
    order,
    legs,
    fromLodging,
    originalCostS: Math.round(originalCost),
    bestCostS: Math.round(orderCost(order)),
    ...(day.keepOrder ? { keptOrder: true } : {}),
  };
}

const slug = process.argv[2] ?? "japan";
const trip = getAllTrips().find((t) => t.meta.slug === slug);
if (!trip) throw new Error(`no existe el viaje ${slug}`);

const out = {};
for (const day of trip.itinerary) {
  if (!day.pois?.length) continue;
  out[day.date] = await dayRoutes(day, routeStart(trip.itinerary, day));
  const r = out[day.date];
  const changed = r.order.some((v, i) => v !== i);
  const saved = Math.round((r.originalCostS - r.bestCostS) / 60);
  console.log(
    `${day.date} ${day.location}: ${r.legs.map((l) => l.mode).join(" → ")}` +
      (changed
        ? ` | orden nuevo ${r.order.map((i) => String.fromCharCode(65 + i)).join("")} (ahorra ${saved} min)`
        : day.keepOrder
          ? " | orden del plan (intencional)"
          : " | orden original")
  );
}

const file = join(root, `data/trips/${slug}-routes.json`);
writeFileSync(file, JSON.stringify(out));
console.log(`\n${Object.keys(out).length} días, ${requests} pedidos a OSRM (${cached} de la caché) → ${file} (${(JSON.stringify(out).length / 1024).toFixed(0)} KB)`);
