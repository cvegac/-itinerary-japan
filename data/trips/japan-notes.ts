import type { TripNotes } from "@/types/Trip";

// Ojo: el sitio es público. Nada de números de confirmación ni PINs.
export const NOTES: TripNotes = {
  tasks: [
    {
      id: "spring-maleta",
      text: "Agregar la maleta facturada al vuelo de Spring Japan",
      detail: "Máximo 7 kg en cabina y la ropa de invierno no entra. En el mostrador sale mucho más caro",
      date: "2026-11-04",
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
      text: "Activar la Suica en el celular",
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
        "Bogotá → Tokio: llegás a HND el 1 nov a las 19:35",
        "Spring Japan IJ621: NRT 7:40 → HIJ 9:10, el 4 nov",
        "Tokio → Bogotá: sale de NRT el 5 dic a las 13:20",
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
};
