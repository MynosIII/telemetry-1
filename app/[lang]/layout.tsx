import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";
import "./refinements.css";
import "./history.css";
import "./encyclopedia.css";
import "./tyres.css";
import "./replay.css";
import "./weather.css";
import "./social-links.css";
import "./circuit-history.css";
import "./scale.css";
import "./account.css";
import "./follow-x.css";
import { FollowOnX } from "@/components/FollowOnX";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: "Telemetry One — Fórmula 1, todo en un solo lugar",
    template: "%s — Telemetry One"
  },
  description:
    "Resultados, juegos, estadísticas e historias de Fórmula 1 en un solo paddock digital.",
  openGraph: {
    title: SITE_NAME,
    siteName: SITE_NAME,
    description: "El paddock digital para vivir, jugar y entender la Fórmula 1.",
    type: "website",
    locale: "es_AR",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Telemetry One" }]
  },
  twitter: { card: "summary_large_image" },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/favicon.ico", sizes: "32x32" }],
    apple: "/apple-icon.png"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0b0d"
};

export function generateStaticParams() {
  return [{ lang: "es" }, { lang: "en" }];
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  // The proxy only ever rewrites to /es or /en; anything else is not a page of this site.
  if (lang !== "es" && lang !== "en") notFound();
  return (
    <html lang={lang === "en" ? "en" : "es"} data-scroll-behavior="smooth">
      <body>{children}<FollowOnX /></body>
    </html>
  );
}
