import type { TripNotes } from "@/types/Trip";

// Ojo: el sitio es público. Nada de números de confirmación ni PINs.
export const NOTES: TripNotes = {
  tasks: [
    {
      id: "spring-confirmacion",
      text: "Revisar que Spring Japan confirme el vuelo IJ621",
      detail:
        "Comprado el 23 oct, quedó pendiente de confirmación. En cabina va una sola pieza de 7 kg (la small bag de KLM) y facturada la maleta de cabina de KLM (10 kg)",
      date: "2026-11-04",
    },
    {
      id: "seguro",
      text: "Contratar el seguro de viaje",
      detail:
        "Que cubra gastos médicos en Japón durante las 5 semanas. El pasaje no se pagó con la Mastercard Black, así que no cuentes con la asistencia de esa tarjeta: fijate si la tarjeta con la que pagaste incluye alguna, y si no, comprá uno aparte. Opciones en el tema \"Seguro de viaje\"",
    },
    {
      id: "salas-vip",
      text: "Activar las salas VIP de la Mastercard Black (Bancolombia)",
      detail:
        "Programa Mastercard Airport Experiences: bajá la app y registrá la tarjeta antes de viajar. Confirmá con el banco cuántos ingresos gratis te quedan este año. En Colombia también entrás a las salas de Avianca mostrando la tarjeta. Sirven en El Dorado (30 oct), las escalas y Narita a la vuelta (5 dic)",
    },
    {
      id: "bici-shimanami",
      text: "Reservar la bici eléctrica de Shimanami",
      detail: "Es sábado y las eléctricas son pocas",
      date: "2026-11-07",
    },
    {
      id: "kuroshio",
      text: "Reservar asiento en el Kuroshio (Shingu → Kioto)",
      detail: "~4h40 de viaje: del lado del mar",
      date: "2026-11-14",
    },
    {
      id: "bus-arima",
      text: "Reservar el bus Arima → Kioto",
      detail: "Tiene pocas salidas al día",
      date: "2026-11-17",
    },
    {
      id: "hida",
      text: "Reservar asiento en el Hida (Nagoya → Takayama)",
      detail: "Ventanilla derecha: cañón del río Hida",
      date: "2026-11-18",
    },
    {
      id: "bus-nohi",
      text: "Reservar el bus Nohi a Shirakawa-go",
      detail: "Se llena en temporada de hojas rojas: +81-577-32-1688",
      date: "2026-11-19",
    },
    {
      id: "satoyama",
      text: "Reservar el tour en bici de Satoyama Experience",
      detail: "Con guía y cupo limitado",
      date: "2026-11-20",
    },
    {
      id: "bus-hirayu",
      text: "Confirmar el horario de invierno del bus Hirayu → Matsumoto",
      date: "2026-11-21",
    },
    {
      id: "avisar-llegada",
      text: "Avisar la hora de llegada a los hospedajes con horario ajustado",
      detail:
        "Hiroshima y Kamuro (pedir que guarden la mochila), Shingu (cierra a las 19:00), Otsu (salida antes de las 7:00 el 18) y Kawana (instrucciones del self check-in)",
    },
    {
      id: "yenes",
      text: "Llevar ~¥73,000 en efectivo para los hospedajes",
      detail: "Más las tasas turísticas por noche. Algunos lugares chicos no aceptan tarjeta extranjera",
    },
    {
      id: "mapa-offline",
      text: "Activar el modo sin conexión y descargar el mapa con wifi",
      detail: "Kumano Kodo, Koyasan y Mitsutoge tienen poca señal",
    },
    {
      id: "pdfs",
      text: "Guardar las confirmaciones de las reservas en el celular",
      detail: "Traen la dirección en japonés para mostrarle a un taxista",
    },
    {
      id: "suica",
      text: "Comprar la PASMO o la Welcome Suica de plástico al llegar a Haneda",
      detail:
        "Tu Android no puede llevar la Suica: en el celular solo funciona en iPhone o en Android comprados en Japón (chip FeliCa). Se recarga con efectivo en las máquinas de las estaciones o en un konbini",
      date: "2026-11-01",
    },
    {
      id: "apps-bici",
      text: "Crear las cuentas de bici compartida con la tarjeta de crédito",
      detail:
        "docomo bike share o HELLO CYCLING para Tokio (3 nov) y Peacecle para Hiroshima (4 nov)",
    },
    {
      id: "visit-japan-web",
      text: "Registrarte en Visit Japan Web",
      detail:
        "Sirve para la migración en Haneda y, a la vuelta, para hacer desde el celular el trámite de devolución del impuesto en Narita. Ver el tema \"Compras sin impuesto\"",
    },
  ],
  sections: [
    {
      title: "Pagar en el hospedaje",
      items: [
        "Tokyo Ueno New Izu (1 nov): ¥17,000, todo al llegar",
        "Narita U-City (3 nov): ¥6,480",
        "Lemonsea Onomichi (6 nov): ¥10,000",
        "Komorebi Takayama (18 nov): ¥25,497",
        "Minka House Matsumoto (21 nov): ¥13,800",
        "En el resto, revisá en la app de Booking si ya está cobrado",
      ],
    },
    {
      title: "Check-in con horario ajustado",
      items: [
        "Hiroshima (4 nov): de 15:00 a 21:00",
        "Kamuro (8 nov): de 16:00 a 21:00",
        "Shingu (12 nov): de 15:00 a 19:00; check-out de 8:30 a 9:30",
        "Otsu (14 nov): de 15:00 a 22:00",
        "Fuji (24–26 nov): todos los días hay que salir de 10:00 a 15:00",
        "Kawana (27 nov): de 16:00 a 22:00, sin recepción",
      ],
    },
    {
      title: "Vuelos",
      items: [
        "Ida: KLM KL741 BOG 30 oct 16:05 (parada técnica en Cartagena) → AMS 31 oct 10:45 · escala 5 h 10",
        "KLM KL897 AMS 31 oct 15:55 → Pekín (PEK) 1 nov 9:55 · escala 5 h 20",
        "ANA NH962 PEK 1 nov 15:15 → Haneda (HND) 19:35 · asiento 38A",
        "Spring Japan IJ621: NRT 7:40 → HIJ 9:10, el 4 nov. Cabina: 1 pieza de 7 kg; facturada: 10 kg",
        "Vuelta: Asiana OZ101 NRT 5 dic 13:20 → Seúl (ICN) 15:55 · escala 7 h 10",
        "KLM KL856 ICN 5 dic 23:05 → AMS 6 dic 5:20 · escala 4 h",
        "KLM KL741 AMS 6 dic 9:20 → BOG 14:30",
      ],
    },
    {
      title: "Emergencias en Japón",
      items: [
        "Policía: 110",
        "Ambulancia y bomberos: 119",
        "Japan Visitor Hotline (24 h, en inglés): 050-3816-2787",
      ],
    },
  ],
  topics: [
    {
      id: "tarjetas",
      emoji: "💳",
      title: "Tarjetas y pases",
      summary: "Qué usar en cada tramo y dónde conseguirlo",
      sections: [
        {
          title: "Suica o PASMO",
          items: [
            "Es la de casi todos los días: trenes, metros y la mayoría de los buses. Suica y PASMO son la misma red",
            "Tu Android no la puede llevar: comprá una de plástico al llegar a Haneda. PASMO común en las máquinas de Keikyu o, si no hay, la Welcome Suica",
            "La Welcome Suica dura 28 días: hacia el 28 nov vas a necesitar otra. La PASMO común no vence y te devuelven el depósito de ¥500",
            "Se recarga solo con efectivo, en las máquinas de las estaciones o en un konbini",
          ],
        },
        {
          title: "Dónde no sirve",
          items: [
            "Shinkansen y expresos limitados (Kuroshio, Hida, Shinano, Azusa, Odoriko): comprás un boleto en la máquina o la ventanilla y pagás con la tarjeta de crédito",
            "La JR de Takayama (20 nov): boleto en la máquina",
            "Los buses Ryujin y Kumano Gobo del Kumano Kodo: efectivo o tarjeta",
          ],
        },
        {
          title: "Pases",
          items: [
            "NIKKO PASS World Heritage Area (2 nov): en la estación Tobu de Asakusa. Cubre el tren y los buses de Nikko",
            "Pase de bus Kumano Gobo (12 y 13 nov): ~¥3,500 en el Kumano Hongu Heritage Center",
          ],
        },
        {
          title: "Efectivo y tarjeta de crédito",
          items: [
            "Efectivo, con monedas y billetes de ¥1,000: los buses del Kumano Kodo, Kiso (Tsumago y Magome), Hirayu, los alquileres de bici y los ferries chicos. Desde el 19 sep 2026, Ryujin acepta tarjeta sin contacto en la línea a Hongu",
            "Tarjeta de crédito: los boletos de expreso, el bus Arima → Kioto, el Nohi a Shirakawa-go, los teleféricos y el tour en bici de Hida",
            "Apps de bici compartida (3 y 4 nov): docomo bike share o HELLO CYCLING en Tokio y Peacecle en Hiroshima, con la tarjeta cargada",
            "Donde dice \"Suica o efectivo\", las fuentes no coinciden en si acepta IC (Hiroden, buses de Koyasan, Eizan, buses de Meiko): tené monedas por las dudas",
          ],
        },
      ],
    },
    {
      id: "tax-free",
      emoji: "🧾",
      title: "Compras sin impuesto",
      summary: "Desde el 1 nov pagás el 10% y te lo devuelven al salir",
      sections: [
        {
          title: "Qué cambió el 1 de noviembre de 2026",
          items: [
            "Antes se compraba directamente sin el impuesto. Ahora pagás el precio completo, con el 10% de impuesto al consumo, y la tienda te devuelve ese 10% cuando la aduana confirma, al salir de Japón, que te llevás las cosas",
            "Llegás el 1 nov, así que todas tus compras van por el sistema nuevo",
            "Mínimo: ¥5,000 antes de impuestos en la misma tienda y el mismo día. Ropa, comida, cosméticos y electrónica suman juntos: ya no hay categorías ni bolsas selladas",
            "Solo cuenta lo que llevás vos al salir. Lo que mandás por correo no entra, salvo que lo envíe la propia tienda",
            "Plazo: 90 días desde la compra. Te sobra, porque salís el 5 dic",
            "Las tiendas duty free del aeropuerto, después del control, siguen igual que antes",
          ],
        },
        {
          title: "Qué conviene pedir sin impuesto y qué no",
          items: [
            "SÍ: recuerdos, regalos, electrónica, cosméticos y dulces que vas a llevar cerrados a Colombia",
            "NO: la ropa del viaje, la comida que vas a comer y todo lo que vas a abrir o usar acá. Lo usado en Japón no tiene devolución: pagalo como una compra normal",
            "La aduana revisa cada ticket completo: si de un ticket falta un producto, se pierde la devolución de TODO ese ticket. Por eso, en la misma tienda hacé dos compras separadas: una normal con lo que vas a usar y otra sin impuesto con lo que vas a llevar cerrado",
            "Concentrá los regalos en pocas tiendas grandes (Don Quijote, Uniqlo, Bic Camera, Loft) para pasar los ¥5,000 de una vez",
            "Lo más cómodo es comprar los regalos al final, en Tokio y Narita (30 nov – 4 dic): no los cargás 5 semanas y no se te arruinan en la mochila",
          ],
        },
        {
          title: "Al comprar",
          items: [
            "Decí \"tax free\" en la caja ANTES de pagar y mostrá el pasaporte físico: una foto no sirve",
            "Pagá con una tarjeta a tu nombre y preguntá cómo te devuelven: en efectivo en el aeropuerto, a la tarjeta (1 a 2 semanas) o por transferencia (2 a 4 semanas). Cada tienda tiene sus opciones y puede cobrar una comisión",
            "Si te dan un QR para registrar los datos, guardalo junto al ticket",
            "Guardá cada ticket con su compra, en una bolsa aparte. Sin ticket no hay devolución",
          ],
        },
        {
          title: "Cómo llevarlo sin usar",
          items: [
            "No hay truco que valga: tiene que estar sin usar de verdad. Lo más seguro es no abrirlo y dejar la caja, el envoltorio y las etiquetas tal como vinieron",
            "Llevalo en una bolsa propia dentro de la mochila, separado de tu ropa, para que no se ensucie ni se aplaste en 5 semanas de viaje",
            "Comida y cosméticos, siempre cerrados: si los abriste, ya no entran",
            "Si algo lo terminaste usando, no lo pases por la terminal: avisale al agente en el mostrador de aduana y perdés la devolución de ese ticket, nada más. Hacer pasar algo usado como nuevo te obliga a devolver el impuesto y te pueden multar",
          ],
        },
        {
          title: "El 5 dic en Narita",
          items: [
            "El vuelo de Asiana (OZ101) sale a las 13:20: con compras sin impuesto, llegá al aeropuerto a las 10:00 como tarde",
            "ANTES de despachar la valija: escaneá el pasaporte en una terminal de devolución (Tax Refund Kiosk) del hall de salidas. También podés hacerlo en Visit Japan Web, conectado al Wi-Fi especial del aeropuerto, antes del control de seguridad",
            "Resultado verde: listo, no te revisan. Rojo: llevá las compras y los tickets al área de inspección de aduana",
            "Tené todo a mano, porque lo que ya despachaste no se puede sacar. Después de la terminal, sí lo podés meter en la valija",
            "Narita es tu última salida de Japón: la escala en Seúl no cambia nada",
            "Si perdés el vuelo por la fila, ni la aduana ni la aerolínea se hacen cargo",
          ],
        },
      ],
    },
    {
      id: "ropa",
      emoji: "👕",
      title: "Compras de ropa",
      summary: "Qué comprar, dónde y cuándo",
      sections: [
        {
          title: "Dónde y cuándo",
          items: [
            "Uniqlo, GU, Workman y mont-bell tienen el mismo precio en todo Japón: no hay un lugar más barato donde esperar",
            "3 nov, Okachimachi: ropa para Nikko, Misen y el Kumano Kodo. Ojo con el peso: el 4 nov Spring Japan te deja 7 kg en cabina y 10 kg facturados",
            "El abrigo para los Alpes (Takayama, desde el 18 nov) lo podés comprar en Kioto del 14 al 17 (hay Uniqlo en la estación): así no lo cargás en el vuelo de Spring Japan",
            "La valija para la vuelta, en Tokio del 30 nov al 2 dic (Don Quijote o las tiendas de Shinjuku): Hatsudai queda a 1 parada de Shinjuku",
            "La ropa que vas a usar en el viaje no tiene devolución del impuesto: está explicado en \"Compras sin impuesto\"",
          ],
        },
      ],
    },
    {
      id: "seguro",
      emoji: "🩺",
      title: "Seguro de viaje",
      summary: "Opciones para comparar y qué pedir",
      sections: [
        {
          title: "Opciones",
          items: [
            "Cubrir del 30 oct al 6 dic (38 días): desde que salís de Bogotá hasta que volvés",
            "Primero: los beneficios de la tarjeta con la que pagaste el pasaje de KLM. Puede que ya incluya asistencia",
            "SafetyWing (Nomad Insurance Essential): ~US$56–63 cada 4 semanas entre 18 y 39 años, unos US$80–90 por el viaje. Médico hasta US$250,000 sin deducible, más equipaje facturado y retrasos. Se compra online: confirmá que acepte residentes de Colombia",
            "Heymondo: muy recomendado para Japón (médico alto, app con chat 24 h). Los precios publicados son para residentes en España: cotizá y fijate si vende a residentes de Colombia",
            "Asistencias colombianas (Assist Card, Universal Assistance, Travel Ace, SURA): se pagan en pesos y atienden en español. Universal publica desde US$5 por día (~US$190 los 38 días) y Assist Card desde COP 177,000 por 8 días; el precio final depende de la edad y el destino. Cotizá el mismo período en 2 o 3",
            "Bancolombia: no tiene un seguro médico de viaje propio publicado. Tiene \"Siempre Protegido\" (asistencias en viajes, sin detalle de coberturas) y un seguro con Cardif contra robo de documentos y fraude con tarjetas desde COP 20,000 + IVA, que no cubre gastos médicos. Preguntá en la app o con un asesor qué incluye Siempre Protegido",
            "Al comparar, pedí: médico de al menos US$100,000, deducible bajo o cero, asistencia 24 h en español, equipaje y demoras (vas con 2 escalas) y que no excluya senderismo ni bici (Kumano Kodo, Mitsutoge, Shimanami)",
          ],
        },
      ],
    },
  ],
};
