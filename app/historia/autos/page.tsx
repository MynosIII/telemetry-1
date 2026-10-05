import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CarCatalogue } from "@/components/CarCatalogue";
import { getCarCatalogue } from "@/lib/championship-history";

export const metadata: Metadata = { title: "Índice de autos históricos", description: "Catálogo de chasis y modelos inscritos en el Campeonato Mundial de Fórmula 1, conectado con pilotos, motores y temporadas." };
export default async function CarsPage({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const [catalogue, query] = await Promise.all([getCarCatalogue(), searchParams]);
  const initialSeason = query.season && /^\d{4}$/.test(query.season) && Number(query.season) >= 1950 && Number(query.season) <= catalogue.cutoff ? query.season : "";
  return <main id="top" className="ency-page"><SiteHeader /><div className="ency-page-wrap catalogue-wrap"><header className="ency-title"><nav className="ency-breadcrumb" aria-label="Ruta del artículo"><Link href="/historia">Historia</Link><span>/</span><span>Modelos de auto</span></nav><p className="ency-eyebrow">1950–2025 · CATÁLOGO DE CHASIS</p><h1>Los autos del campeonato</h1><p className="ency-subtitle">{catalogue.cars.length.toLocaleString("es-AR")} modelos identificados, conectados con sus constructores, motores, pilotos y temporadas.</p></header><p>El índice parte de las inscripciones de temporada de <a href={catalogue.source} target="_blank" rel="noreferrer">F1DB (CC BY 4.0)</a>. Incluye modelos inscritos que pudieron no largar; una lista de varios chasis no permite asignar cada uno a una carrera concreta. Las fotografías se incorporan con identificación y atribución verificadas.</p><CarCatalogue cars={catalogue.cars} initialSeason={initialSeason} /><p className="ency-note">Los modelos desconocidos quedan sin inventar un nombre. Las fichas del modelo conservan por separado las identidades resueltas y ambiguas de los autos.</p></div><SiteFooter /></main>;
}
