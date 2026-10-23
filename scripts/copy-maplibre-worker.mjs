// Copia el worker de MapLibre a public/ antes de compilar.
// MapLibre 6 arma la URL de su worker en tiempo de ejecución (template literal),
// así que ningún bundler lo detecta: lo servimos nosotros y lo apuntamos con
// setWorkerUrl(). Se copia como .js para que S3 lo sirva con tipo JavaScript
// (los workers de tipo módulo exigen un MIME de JS).
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs");
const to = join(root, "public/maplibre-gl-worker.js");

mkdirSync(dirname(to), { recursive: true });
copyFileSync(from, to);
console.log("maplibre worker -> public/maplibre-gl-worker.js");
