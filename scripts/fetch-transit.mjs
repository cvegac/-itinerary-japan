// Precalcula el trazado de los tramos de tren y bus de cada día para el mapa:
// - tren, metro y tranvía: por las vías reales de OpenStreetMap (Overpass), con el
//   camino más corto entre estaciones sobre el grafo de vías (pasando por las
//   paradas "via" del tramo, ej. el cambio de línea en Kamakura)
// - bus: por la ruta en auto de OSRM (routing.openstreetmap.de)
// Los ferris y teleféricos (en recta) y los vuelos (en arco) se dibujan en la app
// sin precalcular (lib/transit.ts).
// Resultado: data/trips/<viaje>-transit.json (queda en los datos: funciona sin internet).
//
// Uso: node scripts/fetch-transit.mjs [viaje]   (por defecto: japan)
// Volver a correrlo cuando cambien los tramos o las paradas (un test avisa).
// Las respuestas quedan en .cache/overpass y .cache/osrm.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadTs, root } from "./lib/load-ts.mjs";
import { osrm, overpass, stats } from "./lib/http-cache.mjs";

const { getAllTrips } = loadTs("data/trips/index.ts");
const { transitLegs, transitSignature } = loadTs("lib/transit.ts");
const { simplifyLine } = loadTs("lib/route-plan.ts");
const { distanceKm } = loadTs("lib/map-geo.ts");

const RAILWAYS = "rail|light_rail|subway|narrow_gauge|tram|monorail";
/** Vías a menos de esto de la estación cuentan como "de esa estación" */
const SNAP_KM = 0.5;
const SIMPLIFY_M = 30;
const round5 = (line) => line.map(([a, b]) => [Math.round(a * 1e5) / 1e5, Math.round(b * 1e5) / 1e5]);
const lngLat = ([lat, lng]) => [lng, lat];
const lengthKm = (line) => line.slice(1).reduce((sum, [lng, lat], i) => sum + distanceKm([line[i][1], line[i][0]], [lat, lng]), 0);

// ── Tren: grafo de vías de OSM + Dijkstra ─────────────────────────────────
async function railGraph(a, b) {
  // Margen proporcional al tramo: las vías se alejan de la recta (el Kuroshio
  // rodea toda la península de Kii)
  const span = Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
  const pad = 0.05 + 0.45 * span;
  const r = (x) => Math.round(x * 100) / 100;
  const bbox = [
    r(Math.min(a[0], b[0]) - pad),
    r(Math.min(a[1], b[1]) - pad),
    r(Math.max(a[0], b[0]) + pad),
    r(Math.max(a[1], b[1]) + pad),
  ];
  const json = await overpass(
    `[out:json][timeout:180];way["railway"~"^(${RAILWAYS})$"]["service"!~"."](${bbox.join(",")});out skel geom qt;`
  );
  if (!json) return null;
  const pos = new Map();
  const adj = new Map();
  const link = (u, v, d) => (adj.get(u) ?? adj.set(u, []).get(u)).push([v, d]);
  const ends = [];
  for (const w of json.elements) {
    w.nodes.forEach((id, i) => {
      pos.set(id, [w.geometry[i].lat, w.geometry[i].lon]);
      if (i === 0) return;
      const prev = w.nodes[i - 1];
      const d = distanceKm(pos.get(prev), pos.get(id));
      link(prev, id, d);
      link(id, prev, d);
    });
    ends.push(w.nodes[0], w.nodes[w.nodes.length - 1]);
  }
  stitch(pos, ends, link);
  return { pos, adj };
}

/** Une las puntas sueltas de vías que en OSM quedaron a pocos metros de otra
 *  vía sin compartir el nodo (pasaba en Tajimi y en Atami: sin esto, no había
 *  camino de Nagoya a Takayama ni de Ito a Tokio) */
const STITCH_KM = 0.015;
function stitch(pos, ends, link) {
  const cell = 0.0005;
  const key = (lat, lng) => `${Math.floor(lat / cell)},${Math.floor(lng / cell)}`;
  const grid = new Map();
  for (const [id, [lat, lng]] of pos) {
    const k = key(lat, lng);
    (grid.get(k) ?? grid.set(k, []).get(k)).push(id);
  }
  for (const id of ends) {
    const p = pos.get(id);
    const [row, col] = key(...p).split(",").map(Number);
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        for (const other of grid.get(`${row + dr},${col + dc}`) ?? []) {
          if (other === id) continue;
          const d = distanceKm(p, pos.get(other));
          if (d > STITCH_KM) continue;
          link(id, other, d);
          link(other, id, d);
        }
      }
    }
  }
}

/** Nodos de vía cerca de la estación (todas sus líneas), con la distancia al andén */
function snap(graph, point) {
  const near = [];
  let best = null;
  for (const [id, p] of graph.pos) {
    const d = distanceKm(point, p);
    if (d <= SNAP_KM) near.push([id, d]);
    if (!best || d < best[1]) best = [id, d];
  }
  return near.length ? near : best && best[1] < 2 ? [best] : [];
}

function shortestPath(graph, sources, targets) {
  const goal = new Map(targets);
  const dist = new Map();
  const prev = new Map();
  const heap = [];
  const push = (item) => {
    heap.push(item);
    for (let i = heap.length - 1; i > 0; ) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      for (let i = 0; ; ) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };
  // Arrancar lejos del andén cuesta: así elige la vía de esa estación y no otra cercana
  for (const [id, d] of sources) {
    dist.set(id, d * 3);
    push([d * 3, id]);
  }
  while (heap.length) {
    const [d, u] = pop();
    if (d > dist.get(u)) continue;
    if (goal.has(u)) {
      const path = [];
      for (let n = u; n !== undefined; n = prev.get(n)) path.unshift(graph.pos.get(n));
      return { path, km: d };
    }
    for (const [v, w] of graph.adj.get(u) ?? []) {
      const nd = d + w;
      if (nd < (dist.get(v) ?? Infinity)) {
        dist.set(v, nd);
        prev.set(v, u);
        push([nd, v]);
      }
    }
  }
  return null;
}

async function railLine(points) {
  const line = [];
  for (let i = 1; i < points.length; i++) {
    const [a, b] = [points[i - 1], points[i]];
    const graph = await railGraph(a, b);
    const found = graph && shortestPath(graph, snap(graph, a), snap(graph, b));
    const straight = distanceKm(a, b);
    // Un desvío enorme es una vía mal conectada en OSM: mejor la recta que un rodeo falso
    if (!found || found.km > Math.max(3 * straight, straight + 15)) {
      return { line: null, why: found ? `rodeo de ${found.km.toFixed(0)} km para ${straight.toFixed(0)} km` : "sin camino" };
    }
    line.push(...(i === 1 ? [a] : []), ...found.path, b);
  }
  return { line: line.map(lngLat) };
}

// ── Bus: ruta en auto ────────────────────────────────────────────────────
async function roadLine(points) {
  const json = await osrm(`/routed-car/route/v1/driving/${points.map(([lat, lng]) => `${lng},${lat}`).join(";")}?overview=full&geometries=geojson`);
  const coords = json?.routes?.[0]?.geometry?.coordinates;
  return coords ? { line: coords } : { line: null, why: "OSRM sin ruta" };
}

const slug = process.argv[2] ?? "japan";
const trip = getAllTrips().find((t) => t.meta.slug === slug);
if (!trip) throw new Error(`no existe el viaje ${slug}`);
const places = trip.places ?? {};

const out = {};
const problems = [];
for (const day of trip.itinerary) {
  const { legs, missing } = transitLegs(day, places);
  if (missing.length) problems.push(`${day.date}: sin ubicar ${missing.join(", ")}`);
  if (!legs.length) continue;
  const lines = {};
  const summary = [];
  for (const leg of legs) {
    if (leg.kind !== "rail" && leg.kind !== "road") continue;
    const { line, why } = leg.kind === "rail" ? await railLine(leg.points) : await roadLine(leg.points);
    const name = `${leg.segment.from} → ${leg.segment.to}`;
    if (!line) {
      problems.push(`${day.date} ${name}: ${why} (queda en recta)`);
      continue;
    }
    lines[leg.index] = round5(simplifyLine(line, SIMPLIFY_M));
    // Largo del trazado contra la recta: un número raro delata un rodeo
    const km = lengthKm(line);
    const straight = lengthKm(leg.points.map(lngLat));
    summary.push(`${leg.kind === "rail" ? "🚆" : "🚌"} ${name} ${km.toFixed(0)} km (×${(km / straight).toFixed(1)})`);
  }
  out[day.date] = { signature: transitSignature(day, places), lines };
  console.log(`${day.date} ${summary.join(" · ") || "(solo recta o vuelo)"}`);
}

const file = join(root, `data/trips/${slug}-transit.json`);
writeFileSync(file, JSON.stringify(out));
console.log(
  `\n${Object.keys(out).length} días, ${stats.requests} pedidos (${stats.cached} de la caché) → ${file} (${(JSON.stringify(out).length / 1024).toFixed(0)} KB)`
);
if (problems.length) console.log(`\nRevisar:\n- ${problems.join("\n- ")}`);
