# Datos de los viajes

Cada viaje tiene su itinerario en un JSON (`<viaje>-itinerary.json`), uno por día,
validado con el esquema de `lib/schema.ts` (lo corre `trips.test.ts`). Se edita
cargando el JSON, cambiándolo y volviéndolo a guardar: nada de buscar y reemplazar
texto. Los montos son datos (`lib/cost.ts`): `{ amount, max?, currency, approx? }`.

Después de cambiar lugares o coordenadas de hospedaje, volver a correr
`node scripts/fetch-routes.mjs japan` (un test avisa si las rutas quedan viejas).

## Japón 2026 (`japan-itinerary.json`)

Plan del otoño, siempre hacia el este (versión del 2026-10-21). Prioridades:
1.º naturaleza, 2.º precio. 14 bases cerca de una estación, 8 días de bici fijos
+ 1 opcional, sin buses nocturnos.

`budget` = USD por persona y por día, calculado con `lib/budget.ts`: hospedaje
real (`lodgingCost`) + tramos de transporte + entradas + comida ~$35, a ~¥157/USD.
Total estimado: ~$3,698, sin los vuelos internacionales. Un test avisa si un día
queda desactualizado.

Verificado en línea el 2026-10-21:

- Spring Japan IJ621 NRT 07:40 → HIJ 09:10, lun/mié/sáb (26 oct – 30 nov),
  según el horario oficial publicado el 21 ago 2026.
- Bus del aeropuerto de Hiroshima: ¥1,450, ~50 min (Prefectura de Hiroshima).
- Tobu NIKKO PASS World Heritage Area: ¥3,000, 2 días (Tobu).
- Teleférico de Shin-Hotaka: ¥3,800 ida y vuelta; cerrado del 24 al 27 nov 2026
  según revendedores (confirmar en shinhotaka-ropeway.jp).
- Bus Kawaguchiko → Mishima: ~¥2,500, cada ~2 h (Fujikyu).
- Bus Kawaguchiko → inicio de Mitsutoge: ¥840, 9:40 en días laborables.
- Kobe (17 nov): funicular de Rokko ¥880 (mayo 2026); estuvo cerrado del 5 ene
  al 10 abr 2026 por renovación. Teleférico Rokko-Arima ~¥1,400 ida (sin fecha).
  Bus Arima → Kioto ~¥1,850–2,000, pocas salidas al día.
- Koyasan sin lugar (8–10 nov): base en Kamuro, una estación antes de Kudoyama.

Sin confirmar: tarifas de bici en Shimanami (¥2,000–8,000 según el local) y el
peaje de los puentes para bicis (la exención terminó el 31 mar 2026), el alquiler
de bicis en Sawara y los horarios de invierno del bus Takayama–Matsumoto.

Todas las noches reservadas en Booking al 2026-10-23; las coordenadas de
hospedaje son las del lugar exacto (PDF de la reserva o GSI, contrastadas con
OpenStreetMap). Nada de números de confirmación ni PINs: el repo es público.

## Eje Cafetero (`eje-cafetero-itinerary.json`)

Costos estimados en COP, para la pareja completa por día (alojamiento + transporte
+ entradas + comida). Son una referencia, no precios cerrados.

Coordenadas verificadas el 2026-09-29 contra Wikipedia: Filandia (plaza), Salento,
Montenegro y Aeropuerto El Edén son exactas. Los hospedajes no publican GPS, así
que se usa el punto del pueblo o la zona: Pereira ≈ Circunvalar (Calle 11 #12-39),
Casa Madrigal a ~300 m de la plaza, Villa del Sol a ~10 min a pie del centro y la
finca en las afueras de Montenegro.

Total estimado del viaje: ~$2.600.000–2.850.000 COP (~$650–710), sin vuelos.
