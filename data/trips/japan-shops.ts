import type { NearbyShop } from "@/types/Trip";

// Tiendas de segunda mano cerca de cada hospedaje (clave: lodgingPlace).
// Ubicaciones de OpenStreetMap, verificadas una por una en Google Maps (9 nov 2026).
// Hard Off: Hard Off / Hobby Off / Off House son de la misma empresa y suelen
// compartir edificio. Book Off es otra empresa.

const HARD_OFF = "Electrónica, audio, consolas y cosas rotas (Junk) baratas";
const HOBBY_OFF = "Juguetes, figuras, juegos y cartas";
const BOOK_OFF = "Libros, manga, juegos y CDs";
const SECOND_STREET = "Ropa, calzado y cosas de casa";

const TOKYO: NearbyShop[] = [
  { name: "Book Off Sendagi", what: BOOK_OFF, coords: [35.72837, 139.76377], howFar: "~15 min a pie, al final de Yanaka Ginza · 10:00–21:00" },
  { name: "Hard Off + Hobby Off Ueno-Okachimachi", what: `${HARD_OFF} · ${HOBBY_OFF}`, coords: [35.70871, 139.7741], howFar: "JR a Okachimachi (~5 min) + 3 min a pie · desde las 11:00" },
  { name: "Hard Off + Hobby Off Akihabara (Sotokanda 3-8-1)", what: `${HARD_OFF} · ${HOBBY_OFF}`, coords: [35.70214, 139.77065], howFar: "JR a Akihabara (~7 min) + 6 min a pie · desde las 11:00 · la Hard Off 1 está en 3-11-2, a 2 cuadras" },
  { name: "Surugaya Akihabara", what: "Juegos retro, figuras y anime usados", coords: [35.70062, 139.77054], howFar: "Akihabara, a la vuelta de la Hard Off · varios locales" },
  { name: "Book Off Akihabara (frente a la estación)", what: BOOK_OFF, coords: [35.69775, 139.77348], howFar: "Saliendo de la estación de Akihabara · hasta las 22:00" },
  { name: "Hobby Off Asakusa", what: HOBBY_OFF, coords: [35.71702, 139.79452], howFar: "Asakusa 3-9-2, ~10 min a pie del Senso-ji · desde las 10:30" },
];

export const SHOPS: Record<string, NearbyShop[]> = {
  "Estación Kii-Tanabe, Tanabe": [
    { name: "2nd Street Wakayama Tanabe", what: SECOND_STREET, coords: [33.72372, 135.39744], howFar: "~25 min a pie · en Tanabe no hay Hard Off" },
  ],
  "Hayatama Taisha, Shingu": [
    { name: "2nd Street Shingu", what: SECOND_STREET, coords: [33.71879, 135.98923], howFar: "~15 min a pie · en Shingu no hay Hard Off" },
  ],
  "Estación JR Otsu, Otsu": [
    { name: "Hard Off Nishi-Otsu", what: HARD_OFF, coords: [35.02491, 135.86176], howFar: "~5 min a pie de la estación Otsukyo (JR Kosei) · ~30 min a pie del hospedaje" },
    { name: "Mandarake Kioto", what: "Manga, figuras y juguetes usados", coords: [35.00343, 135.76806], howFar: "En Kioto, Takashimaya T8, 4.º piso (Shijo-Kawaramachi) · abre recién a las 12:00" },
    { name: "Surugaya Kioto Teramachi", what: "Juegos retro, figuras y anime usados", coords: [35.00103, 135.76701], howFar: "En Kioto, a ~3 min de Mandarake" },
    { name: "Book Off Plus Kawaramachi", what: BOOK_OFF, coords: [35.00451, 135.76894], howFar: "En Kioto, Kawaramachi OPA 8.º piso (cerca de Pontocho) · hasta las 22:00" },
  ],
  "Centro, Takayama": [
    { name: "2nd Street Takayama", what: SECOND_STREET, coords: [36.14896, 137.24837], howFar: "~12 min a pie · en Takayama no hay Hard Off" },
  ],
  "Centro, Matsumoto": [
    { name: "Hard Off + Hobby Off + Off House Matsumoto Hirata", what: `${HARD_OFF} · ${HOBBY_OFF}`, coords: [36.19, 137.96257], howFar: "JR Shinonoi a Hirata (~5 min) + 5 min a pie · 10:00–20:00" },
    { name: "2nd Street Matsumoto Hirata", what: SECOND_STREET, coords: [36.1963, 137.96732], howFar: "~10 min a pie de la Hard Off de Hirata · 10:00–21:00" },
    { name: "Book Off Matsumoto", what: BOOK_OFF, coords: [36.23023, 137.96671], howFar: "Frente a la estación, edificio Alpico Plaza, 5.º piso" },
  ],
  "Estación Fujikyu-Highland, Fujikawaguchiko": [
    { name: "Hard Off + Off House Kawaguchiko", what: `${HARD_OFF} · ropa y cosas de casa`, coords: [35.48901, 138.76416], howFar: "~15 min a pie por la ruta 139 · 10:30–19:30" },
    { name: "Book Off Fujiyoshida", what: BOOK_OFF, coords: [35.48687, 138.78533], howFar: "~10 min a pie" },
  ],
  "Nippori, Tokio": TOKYO,
  "Higashi-Nippori, Tokio": TOKYO,
};
