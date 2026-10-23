import type { MetadataRoute } from "next";

// Web app instalable ("Agregar a inicio"). Instalarla no guarda nada por sí
// sola: el uso sin conexión se activa aparte, desde el botón de la nube.
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mis Viajes",
    short_name: "Viajes",
    description: "Itinerarios, mapas, costos y hospedaje de mis viajes",
    lang: "es",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    theme_color: "#f3f4f6",
    background_color: "#f3f4f6",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
