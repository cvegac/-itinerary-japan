import { DayEntry } from "@/types/DayEntry";
import type { TripData } from "@/types/Trip";

// Costos estimados en COP (con aprox. en USD a ~4.000 COP/USD), calculados
// para la pareja completa por día (alojamiento + transporte + entradas +
// comida). Son una referencia, no precios cerrados: ajustalos con precios
// reales de Booking/Airbnb y tours antes de viajar.
// Coordenadas (accommodationCoords) verificadas el 2026-09-29 contra Wikipedia:
// Filandia (plaza), Salento, Montenegro y Aeropuerto El Edén son exactas.
// Los hospedajes no publican GPS, así que se usa el punto del pueblo/zona:
// Pereira ≈ Circunvalar (Calle 11 #12-39), Casa Madrigal a ~300 m de la plaza,
// Villa del Sol a ~10 min a pie del centro y la finca en las afueras de Montenegro.
// Total estimado del viaje: ~$2.600.000–2.850.000 COP (~$650–710), sin vuelos.
const ITINERARY: DayEntry[] = [
  // ── DÍA 1 — Llegada a Pereira ──
  {
    date: "2026-10-11",
    label: "Llegada a Pereira",
    location: "Pereira",
    category: "Logística",
    notes: "Vuelo JA5322 aterriza 15:12. Check-in en la Circunvalar y tarde por el centro",
    weekday: "Dom",
    food: "Cena en la Avenida Circunvalar (bandeja paisa o similar)",
    transport: [
      { mode: "taxi", from: "Aeropuerto Matecaña (PEI)", to: "Hotel en la Av. Circunvalar", duration: "~15min", cost: "~$20.000 COP (~$5)" },
    ],
    accommodation: "Bayit Tov Circunvalar Hotel",
    zona: "Avenida Circunvalar, Pereira",
    accommodationCoords: [4.8105, -75.689],
    budget: "$64",
    isTransit: false,
    activitiesDay: [
      "Check-in y descanso post-vuelo",
      "Plaza de Bolívar y Catedral",
      "Bolívar Desnudo (escultura de Arenas Betancourt)",
      "Megacable al atardecer, con vista de la ciudad (~$3.000 COP c/u)",
    ],
    activitiesNight: [
      "Cena en la Avenida Circunvalar",
      "Cerveza o café en la zona (domingo de puente, hay ambiente)",
      "Vista del Viaducto César Gaviria iluminado",
      "Dormir temprano: mañana se madruga a los termales",
    ],
  },
  // ── DÍA 2 — Termales + Ukumarí (festivo) ──
  {
    date: "2026-10-12",
    label: "Termales de Santa Rosa + Ukumarí",
    location: "Santa Rosa de Cabal",
    category: "Naturaleza",
    notes: "Lunes festivo: Ukumarí abre (mié–dom y lunes festivos, 9:00–15:00) y el martes cierra. Termales a precio de fin de semana. Reservar turno de mañana en termales.com.co",
    weekday: "Lun",
    food: "Almuerzo temprano: chorizo santarrosano en la plaza de Santa Rosa",
    transport: [
      { mode: "taxi", from: "Pereira (Circunvalar)", to: "Termales de Santa Rosa", duration: "~45min", cost: "~$70.000 COP (~$17.5)", note: "Opción económica: bus Pereira → Santa Rosa (~$5.000 c/u) + Willys a termales (~$35.000 el carro)" },
      { mode: "jeep-willys", from: "Termales", to: "Santa Rosa de Cabal (pueblo)", duration: "~25min", cost: "~$35.000 COP (~$9) el carro", note: "También hay bus por ~$2.500 c/u, con menos frecuencia" },
      { mode: "taxi", from: "Santa Rosa de Cabal", to: "Bioparque Ukumarí", duration: "~50min", cost: "~$80.000 COP (~$20)" },
      { mode: "taxi", from: "Bioparque Ukumarí", to: "Hotel en la Av. Circunvalar", duration: "~20min", cost: "~$30.000 COP (~$7.5)" },
    ],
    accommodation: "Bayit Tov Circunvalar Hotel",
    zona: "Mismo hotel en Pereira",
    accommodationCoords: [4.8105, -75.689],
    budget: "$160",
    isTransit: false,
    activitiesDay: [
      "6:15 salida · 7:00–10:30 Termales de Santa Rosa (piscinas + cascada)",
      "Almuerzo en Santa Rosa de Cabal",
      "12:45–15:00 Bioparque Ukumarí (sabana africana, llanos, aviario)",
      "Alternativa sin madrugar: Ukumarí 9:00–14:00 y termales en el turno de las 18:00",
    ],
    activitiesNight: [
      "Descanso (día largo)",
      "Parque El Lago o Lago Uribe Uribe",
      "Cena sencilla en la Circunvalar",
      "Empacar para Filandia",
    ],
  },
  // ── DÍA 3 — Pereira → Filandia ──
  {
    date: "2026-10-13",
    label: "Filandia — el pueblo de Encanto",
    location: "Filandia",
    category: "Ciudad",
    notes: "Pueblo colorido que inspiró Encanto. Más tranquilo que Salento. Día completo allá",
    weekday: "Mar",
    food: "Menú del día en la plaza (~$18.000–25.000 COP c/u) y café con vista",
    transport: [
      { mode: "taxi", from: "Hotel en la Av. Circunvalar", to: "Terminal de Pereira", duration: "~10min", cost: "~$12.000 COP (~$3)" },
      { mode: "buseta intermunicipal", from: "Pereira (terminal)", to: "Filandia", duration: "~1h", cost: "~$10.000 COP (~$2.5) c/u" },
    ],
    accommodation: "Hostal Casa Madrigal",
    zona: "Centro de Filandia, cerca de la plaza principal",
    accommodationCoords: [4.6802, -75.6635],
    budget: "$78",
    isTransit: false,
    activitiesDay: [
      "Calle del Tiempo Detenido y balcones de colores",
      "Plaza principal y talleres de cestería",
      "Caminata corta por las afueras o café con vista",
      "17:30 Mirador Colina Iluminada al atardecer (~$15.000–20.000 COP c/u)",
    ],
    activitiesNight: [
      "Cena en algún café-restaurante de la plaza",
      "Café o cerveza en la plaza",
      "Compra de artesanías",
      "Noche tranquila, pueblo chico",
    ],
  },
  // ── DÍA 4 — Filandia → Salento + tour de café ──
  {
    date: "2026-10-14",
    label: "Salento + Tour de Café",
    location: "Salento",
    category: "Naturaleza",
    notes: "Filandia y Salento están a ~40 min. Tour de café en la tarde y pueblo al atardecer",
    weekday: "Mié",
    food: "Trucha en patacón (típica de Salento)",
    transport: [
      { mode: "buseta intermunicipal", from: "Filandia", to: "Salento", duration: "~40min", cost: "~$8.000 COP (~$2) c/u", note: "Pocas salidas directas al día: preguntar horario en la plaza de Filandia. Si no hay, ir vía Armenia (~1h30)" },
      { mode: "caminar", from: "Centro de Salento", to: "Finca El Ocaso / Don Elías", duration: "~30-40min", note: "O en Willys desde la plaza" },
    ],
    accommodation: "Hostal Villa del Sol",
    zona: "Cerca de la plaza de Salento (de ahí salen los Willys al Cocora)",
    accommodationCoords: [4.6372, -75.5708],
    budget: "$94",
    isTransit: false,
    activitiesDay: [
      "Mañana tranquila en Filandia y traslado a Salento",
      "14:30 tour de café (~$30.000–45.000 COP c/u): siembra, cosecha, tueste y cata",
      "Calle Real y balcones coloridos",
      "Mirador de Salento (Alto de la Cruz) al atardecer",
    ],
    activitiesNight: [
      "Jugar tejo en el pueblo",
      "Cena en el centro de Salento",
      "Plaza de noche",
      "Dormir temprano: mañana Cocora",
    ],
  },
  // ── DÍA 5 — Valle del Cocora ⭐ ──
  {
    date: "2026-10-15",
    label: "Valle del Cocora — Palmas de Cera ⭐",
    location: "Salento",
    category: "Naturaleza",
    notes: "⭐ El día más lindo del viaje. Llevar efectivo, impermeable y tenis con buen agarre (hay barro)",
    weekday: "Jue",
    food: "Chocolate con queso en Acaime; almuerzo tardío en Salento",
    transport: [
      { mode: "jeep-willys", line: "Jeep Willys (desde la plaza)", from: "Salento", to: "Valle del Cocora", duration: "~30min", cost: "~$10.000 COP (~$2.5) por persona" },
      { mode: "jeep-willys", line: "Jeep Willys", from: "Valle del Cocora", to: "Salento", duration: "~30min", cost: "~$10.000 COP (~$2.5) por persona" },
    ],
    accommodation: "Hostal Villa del Sol",
    zona: "Mismo hostal en Salento",
    accommodationCoords: [4.6372, -75.5708],
    budget: "$85",
    isTransit: false,
    activitiesDay: [
      "7:00 Willys · 7:30–13:30 circuito largo (5–6 h), o solo la zona de palmas (2–3 h)",
      "Palmas de cera del Quindío (las más altas del mundo)",
      "Colibríes en Acaime (entradas en el camino ~$20.000–30.000 COP c/u)",
      "Puentes colgantes y bosque de niebla",
    ],
    activitiesNight: [
      "Ducha caliente y descanso (la caminata cansa)",
      "Cena en Salento",
      "Último paseo por la plaza",
      "Empacar para la finca",
    ],
  },
  // ── DÍA 6 — Salento → Parque del Café + noche en finca ──
  {
    date: "2026-10-16",
    label: "Parque del Café + noche en finca cafetera",
    location: "Montenegro",
    category: "Ciudad",
    notes: "En temporada baja no abre todos los días, pero el viernes suele abrir (confirmar horario). Dejar la maleta en la finca de camino o en los lockers del parque",
    weekday: "Vie",
    food: "Almuerzo dentro del parque; cena y desayuno en la finca",
    transport: [
      { mode: "buseta intermunicipal", from: "Salento", to: "Armenia (terminal)", duration: "~50min", cost: "~$7.000 COP (~$1.75) c/u" },
      { mode: "buseta intermunicipal", from: "Armenia (terminal)", to: "Parque del Café (Montenegro)", duration: "~40min", cost: "~$6.000 COP (~$1.5) c/u", note: "Taxi directo Salento → finca: ~$110.000 COP (~1h)" },
      { mode: "taxi", from: "Parque del Café", to: "Finca en Montenegro", duration: "~15min", cost: "~$15.000 COP (~$4)" },
    ],
    accommodation: "Finca Hotel La Molienda Quindiana",
    zona: "Zona rural de Montenegro, cerca del Parque del Café",
    accommodationCoords: [4.5667, -75.75],
    budget: "$137",
    isTransit: false,
    activitiesDay: [
      "8:00 salida de Salento · 10:00–17:00 Parque del Café (pasaporte ~$110.000–140.000 COP c/u)",
      "Show del Café",
      "Teleférico y sendero del café",
      "Atracciones mecánicas",
    ],
    activitiesNight: [
      "Cena en la finca",
      "Noche de campo, con cafetales alrededor",
      "Descanso",
    ],
  },
  // ── DÍA 7 — Finca cafetera + Salida ──
  {
    date: "2026-10-17",
    label: "Mañana en la finca + Salida desde Armenia",
    location: "Armenia",
    category: "Logística",
    notes: "Vuelo Wingo XKDRVG sale 18:47 del Aeropuerto El Edén (AXM), a ~35 min de Montenegro. Llegar ~16:45",
    weekday: "Sáb",
    food: "Desayuno en la finca y almuerzo en Montenegro",
    transport: [
      { mode: "taxi", from: "Finca en Montenegro", to: "Aeropuerto El Edén (AXM)", duration: "~35min", cost: "~$50.000 COP (~$12.5)", note: "Salir ~16:00" },
    ],
    accommodation: "---",
    zona: "Aeropuerto El Edén, Armenia",
    accommodationCoords: [4.4527, -75.7664],
    budget: "$45",
    isTransit: true,
    activitiesDay: [
      "Recorrido de café en la finca (si lo ofrecen) o piscina y descanso",
      "Compras de café para llevar",
      "Almuerzo",
      "Traslado al aeropuerto y vuelo 18:47",
    ],
    activitiesNight: [
      "Llegada a Bogotá 19:45",
      "¡Hasta la próxima, Eje Cafetero!",
    ],
  },
];

export const ejeCafeteroTrip: TripData = {
  meta: {
    slug: "eje-cafetero",
    emoji: "☕",
    title: "Eje Cafetero 2026",
    subtitle: "11–17 Oct · 7 días · Pereira → Armenia",
    startDate: "2026-10-11",
    months: [{ year: 2026, month: 10, label: "Octubre 2026" }],
    mapCenter: [4.63, -75.68],
    mapZoom: 10,
  },
  itinerary: ITINERARY,
  // Sin nightBusSummary: en este viaje no se usan buses nocturnos.
};
