import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HistoryArchive } from "@/components/HistoryArchive";
import { getHistoryIndex } from "@/lib/history";

export const metadata: Metadata = { title: "Estadísticas", description: "Historia conectada de la Fórmula 1: pilotos, constructores, motores, circuitos, naciones, neumáticos y temporadas, con estadísticas y análisis propio." };

export default async function HistoryPage() {
  const { entities, meta } = await getHistoryIndex();
  const number = (value: number) => value.toLocaleString("es-AR");
  const decades = Array.from({ length: Math.floor(meta.lastSeason / 10) - 194 }, (_, i) => 1950 + i * 10);
  return <main id="top" className="inner-page history-page"><SiteHeader />
    <div className="history-content">
      <header className="archive-head">
        <h1>Estadísticas</h1>
        <p className="archive-meta">El archivo de la Fórmula 1: {number(meta.events)} Grandes Premios, {number(meta.categories.drivers.count)} pilotos y {number(meta.categories.constructors.count)} constructores, de 1950 a {meta.lastSeason}.</p>
        <nav className="archive-links" aria-label="Accesos del archivo"><Link href="/historia/autos">Índice de autos</Link><Link href="/ranking">Ranking ELO</Link><a href="#metodologia">Cómo se cuenta</a></nav>
      </header>
      <section className="archive-seasons" aria-labelledby="temporadas"><h2 id="temporadas">Temporadas</h2>
        <ol>{decades.map(decade => <li key={decade}>{Array.from({ length: 10 }, (_, i) => decade + i).filter(year => year <= meta.lastSeason).map(year => <Link key={year} prefetch={false} href={`/historia/seasons/${year}`}>{year}</Link>)}</li>)}</ol>
      </section>
      <HistoryArchive entities={entities.map(({ id, category, name, fullName, country, firstSeason, lastSeason, titleSeasons, href, stats }) => ({ id, category, name, fullName, country, firstSeason, lastSeason, titleSeasons, href, stats: { races: stats.races, wins: stats.wins } }))} />
      <section id="metodologia" className="history-section history-method"><h2>Cómo se cuenta</h2>
        <p>Resultados de <a href="https://github.com/f1db/f1db" target="_blank" rel="noreferrer">F1DB (CC BY 4.0)</a> hasta el {new Date(`${meta.lastRaceDate}T12:00:00Z`).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}, contrastados con <a href="https://www.statsf1.com/en/default.aspx" target="_blank" rel="noreferrer">StatsF1</a> y Wikipedia. El ranking ELO v7.6 es investigación propia y cubre {number(meta.modelEvents)} eventos y 698 pilotos.</p>
        <details><summary>Criterios de conteo</summary>
          <p>Incluye las 500 Millas de Indianápolis de 1950–1960. Los {meta.categories.drivers.count} pilotos incluyen inscripciones sin largada: los GP cuentan pruebas distintas y las inscripciones, pares piloto–prueba.</p>
          <p>Las salidas P1 describen la grilla y pueden diferir de las poles oficiales. Los autos compartidos conservan los créditos de cada piloto; para constructores, motores y neumáticos se deduplican por auto. Los puntos respetan el reglamento de cada época.</p>
          <p>Constructores y motores se mantienen como identidades separadas: una marca nueva no hereda el historial de su predecesora. Vueltas y kilómetros liderados se muestran solo cuando se verificó la fuente.</p>
          <p className="history-note">F1DB: {meta.f1dbRevision ?? "revisión no disponible"}. Generado: {meta.generatedAt.slice(0, 10)}. Modelo: {meta.model}. <a href="/history/index.json" target="_blank" rel="noreferrer">Índice JSON ↗</a></p>
        </details>
      </section>
    </div><SiteFooter /></main>;
}
