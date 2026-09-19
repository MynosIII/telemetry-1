import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./refinements.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://telemetry-1.vercel.app"),
  title: {
    default: "Telemetry 1 — Formula 1, all in one place",
    template: "%s — Telemetry 1"
  },
  description:
    "Resultados, juegos, estadísticas e historias de Formula 1 en un solo paddock digital.",
  openGraph: {
    title: "Telemetry 1",
    description: "El paddock digital para vivir, jugar y entender la Formula 1.",
    type: "website"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0b0d"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
