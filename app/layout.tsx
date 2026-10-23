import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import FlagPolyfill from "@/components/FlagPolyfill";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Mis Viajes",
  description: "Gestión de itinerarios de viaje",
  applicationName: "Mis Viajes",
  // iPhone: al agregarla al inicio abre como app, sin la barra de Safari
  appleWebApp: { capable: true, title: "Viajes", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Ocupa toda la pantalla en celulares con notch; los paddings usan safe-area
  viewportFit: "cover",
  themeColor: "#f3f4f6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="bg-bg text-fg font-sans antialiased">
        <FlagPolyfill />
        {children}
      </body>
    </html>
  );
}
