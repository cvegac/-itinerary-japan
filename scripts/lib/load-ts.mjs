// Cargador mínimo de los módulos TS del proyecto (alias "@/") para los scripts:
// transpila con el TypeScript del proyecto y resuelve los imports a mano.
import { existsSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);
const ts = require(join(root, "node_modules/typescript"));

const cache = new Map();

/** Carga un archivo .ts/.json del proyecto (ruta relativa a la raíz) */
export function loadTs(relative) {
  return load(join(root, relative));
}

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
