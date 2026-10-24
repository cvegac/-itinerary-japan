// JSON legible y compacto para los datos del viaje: cada objeto o lista que
// entra en una línea (sangría + valor hasta 140 caracteres; la clave no cuenta) va en una
// sola; el resto, un elemento por línea. Trabaja sobre la estructura, nunca
// reemplazando texto ya serializado (eso llegó a romper "¥17,000").
const MAX = 140;

export function compactJson(value) {
  return format(value, "") + "\n";
}

function format(value, indent) {
  const flat = oneLine(value);
  if (typeof value !== "object" || value === null || indent.length + flat.length <= MAX) return flat;
  const inner = indent + "  ";
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return `[\n${value.map((v) => inner + format(v, inner)).join(",\n")}\n${indent}]`;
  }
  const entries = Object.entries(value);
  if (entries.length === 0) return "{}";
  return `{\n${entries
    .map(([k, v]) => {
      const key = `${JSON.stringify(k)}: `;
      return inner + key + format(v, inner);
    })
    .join(",\n")}\n${indent}}`;
}

function oneLine(value) {
  if (typeof value !== "object" || value === null) return JSON.stringify(value);
  if (Array.isArray(value)) return value.length ? `[${value.map(oneLine).join(", ")}]` : "[]";
  const entries = Object.entries(value);
  return entries.length ? `{ ${entries.map(([k, v]) => `${JSON.stringify(k)}: ${oneLine(v)}`).join(", ")} }` : "{}";
}
