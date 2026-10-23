// URLs de las fuentes del mapa. Las comparten el mapa (TripMap) y la descarga
// para usar sin conexión: tienen que ser exactamente las mismas, porque la
// caché las busca por URL.

/** Estilo vectorial gratis y sin API key (etiquetas latino + japonés) */
export const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

/** Elevación pública de AWS (Terrarium), con CORS abierto */
export const TERRAIN_TILES = "https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png";

/** Hasta qué zoom se pide el relieve; más cerca se amplía (y se ve igual) */
export const TERRAIN_MAX_ZOOM = 12;

/** Fuentes latinas que usa el estilo. El japonés lo dibuja el celular con sus fuentes */
export const GLYPH_FONTS = ["Noto Sans Regular", "Noto Sans Bold", "Noto Sans Italic"];
/** Latín básico, latín extendido (ō de Kōya) y puntuación */
export const GLYPH_RANGES = ["0-255", "256-511", "8192-8447"];
