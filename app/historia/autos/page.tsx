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
  return <main id="top" className="ency-page"><SiteHeader /><div className="ency-page-wrap catalogue-wrap"><header className="ency-title"><nav className="ency-breadcrumb" aria-label="Ruta del artículo"><Link href="/historia">Estadísticas</Link><span>/</span><span>Autos</span></nav><h1>Autos del campeonato</h1><p className="ency-subtitle">{catalogue.cars.length.toLocaleString("es-AR")} chasis inscritos entre 1950 y {catalogue.cutoff}, según <a href={catalogue.source} target="_blank" rel="noreferrer">F1DB</a>.</p></header><CarCatalogue cars={catalogue.cars} initialSeason={initialSeason} /><p className="ency-note">Incluye modelos inscritos que no llegaron a largar. Los chasis sin nombre conocido no se listan.</p></div><SiteFooter /></main>;
}
