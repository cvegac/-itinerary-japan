import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Japón 2024 — 35 días",
  description: "Gestión del viaje a Japón Nov–Dic 2024",
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
