// Genera out/offline-manifest.json después de cada build: la lista de archivos
// que el service worker guarda al activar el uso sin conexión, y una versión
// (hash del contenido) para que el celular detecte cuándo hay algo nuevo.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "out");

// Turbopack copia variantes de MapLibre (-dev y .mjs) que la app nunca carga
// (usa su bundle y public/maplibre-gl-worker.js): no vale la pena guardarlas.
const SKIP = [/^sw\.js$/, /^offline-manifest\.json$/, /^_next\/static\/media\/.*\.mjs$/];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const hash = createHash("sha1");
let bytes = 0;
const files = walk(out)
  .map((path) => ({ path, rel: relative(out, path).split(sep).join("/") }))
  .filter(({ rel }) => !SKIP.some((re) => re.test(rel)))
  .sort((a, b) => a.rel.localeCompare(b.rel))
  .map(({ path, rel }) => {
    const content = readFileSync(path);
    hash.update(rel).update(content);
    bytes += content.length;
    // Las páginas se piden como carpeta (trailingSlash): japan/index.html -> /japan/
    return "/" + rel.replace(/(^|\/)index\.html$/, "$1");
  });

const version = hash.digest("hex").slice(0, 12);
writeFileSync(join(out, "offline-manifest.json"), JSON.stringify({ version, files }));
console.log(`offline-manifest: ${files.length} archivos, ${(bytes / 1e6).toFixed(1)} MB, versión ${version}`);
