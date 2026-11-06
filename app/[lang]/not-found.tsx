import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { siteSections } from "@/lib/site-sections";
import "./not-found.css";

export const metadata: Metadata = {
  title: "Página no encontrada",
  robots: { index: false }
};

const sections = siteSections.filter((section) => !section.hidden && section.href !== "/");

export default function NotFound() {
  return (
    <main id="top" className="inner-page not-found-page">
      <SiteHeader />
      <section className="not-found" aria-labelledby="not-found-title">
        <svg className="not-found-track" viewBox="0 0 320 200" aria-hidden="true">
          <path className="not-found-line" d="M20 180 C 120 180, 210 170, 250 120 S 280 30, 300 20" />
          <path className="not-found-exit" d="M196 171 L 292 150" />
          <circle className="not-found-car" cx="296" cy="149" r="5" />
        </svg>
        <p className="not-found-code">404</p>
        <h1 id="not-found-title">Esta página se fue a la grava</h1>
        <p className="not-found-copy">La dirección no existe o cambió de lugar.</p>
        <Link className="button button-primary" href="/">Volver al inicio</Link>
        <nav className="not-found-links" aria-label="Secciones">
          {sections.map((section) => (
            <Link key={section.href} href={section.href}>{section.label}</Link>
          ))}
        </nav>
      </section>
      <SiteFooter />
    </main>
  );
}
