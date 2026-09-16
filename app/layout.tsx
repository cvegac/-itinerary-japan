import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mis Viajes",
  description: "Gestión de itinerarios de viaje",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-gray-100 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
