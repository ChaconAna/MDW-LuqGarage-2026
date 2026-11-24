import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LuqGarage",
  description: "Sistema desarrollado en Metodologías de Desarrollo Web — UAI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
