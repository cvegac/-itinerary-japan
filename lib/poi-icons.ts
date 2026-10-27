import type { PointOfInterest } from "@/types/DayEntry";

export const DEFAULT_POI_ICON = "📍";

// Del nombre del lugar a su ícono. Gana la primera regla que coincide, así que
// los casos mixtos van antes: "Puente sagrado Shinkyo" es puente y no santuario,
// "Escalinata de Daimonzaka" es sendero y no templo.
const RULES: [RegExp, string][] = [
  [/alquiler de bicis/, "🚲"],
  [/aeropuerto/, "✈️"],
  [/telef[eé]rico|funicular|estaci[oó]n de arriba/, "🚡"],
  [/ayuntamiento/, "🏙️"],
  [/\(inicio|\(llegada|inicio de la caminata|escalinata/, "🥾"],
  [/onsen|kin-no-yu|gokurakuyu|tokko-no-yu/, "♨️"],
  [/puente/, "🌉"],
  [/bamb[uú]/, "🎋"],
  [/arces|momiji/, "🍁"],
  [/ginkgo/, "🍂"],
  [/sendero/, "🥾"],
  [/santuario|taisha|jinja|torii|-oji\b/, "⛩️"],
  [/templo|mausoleo|gran buda|pagoda|daimon|danjo garan|\b[a-z]+-(ji|dera|in)\b/, "🛕"],
  [/castillo/, "🏯"],
  [/ cima|^cima|^monte|paso de|colina/, "⛰️"],
  [/cascada|abismo/, "💧"],
  [/paz|bomba at[oó]mica/, "🕊️"],
  [/museo|tokaikan/, "🏛️"],
  [/casa de t[eé]/, "🍵"],
  [/casa wada/, "🛖"],
  [/granja/, "🌱"],
  [/cementerio/, "🪦"],
  [/gatos/, "🐈"],
  [/carpas/, "🐟"],
  [/puerto|meriken|harborland/, "⚓"],
  [/^isla/, "🏝️"],
  [/faro/, "🌊"],
  [/estaci[oó]n de ruta|lago|estanque|mirador|(^|\s)r[ií]o\b/, "🏞️"],
  [/estaci[oó]n/, "🚉"],
  [/jard[ií]n|parque/, "🌳"],
  [/monjayaki|okonomimura/, "🍜"],
  [/onomichi u2/, "🍺"],
  [/gion|pontocho/, "🏮"],
  [/mercado|calle|ginza|ameyoko|omotesando|tienda/, "🛍️"],
  [/pueblo|aldea|casco viejo|barrio|iyashi no sato|^tsumago$|^magome$/, "🏘️"],
];

/** Ícono del lugar: el elegido a mano o el que corresponde por su nombre */
export function poiIcon(poi: PointOfInterest): string {
  if (poi.icon) return poi.icon;
  const name = poi.name.toLowerCase();
  return RULES.find(([re]) => re.test(name))?.[1] ?? DEFAULT_POI_ICON;
}
