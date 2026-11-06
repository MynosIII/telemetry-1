import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getCountryFlagUrl } from "@/lib/circuit-visuals";
import { getRecordBook, type RecordTable } from "@/lib/records";
import "./records.css";

export const metadata: Metadata = { title: "Récords de la Fórmula 1", description: "Récords del Campeonato Mundial de Fórmula 1 desde 1950: victorias, poles, rachas, edades, constructores, motores, naciones y el modelo v7.6." };

function Table({ record }: { record: RecordTable }) {
  return <section className="records-table" id={record.id}>
    <h3>{record.title}</h3>
    <ol>{record.rows.map((row, i) => {
      const flag = row.country ? getCountryFlagUrl(row.country) : undefined;
      const tied = i > 0 && record.rows[i - 1].place === row.place;
      return <li key={`${row.name}-${row.detail}-${i}`}>
        <span className="records-place">{tied ? "" : row.place}</span>
        <span className={flag ? "records-who has-flag" : "records-who"}>
          <span className="records-name">{flag ? <img src={flag} alt="" width={16} height={11} loading="lazy" /> : null}{row.href ? <Link href={row.href} prefetch={false}>{row.name}</Link> : row.name}</span>
          {row.detail ? <small>{row.detailHref ? <Link href={row.detailHref} prefetch={false}>{row.detail}</Link> : row.detail}</small> : null}
        </span>
        <strong>{row.value}</strong>
      </li>;
    })}</ol>
    {record.more ? <p className="records-more">y {record.more} más con el mismo registro</p> : null}
    {record.note ? <p className="records-note">{record.note}</p> : null}
  </section>;
}

export default async function RecordsPage({ searchParams }: { searchParams: Promise<{ decada?: string }> }) {
  const [book, query] = await Promise.all([getRecordBook(), searchParams]);
  const { firstSeason, lastSeason, lastRaceDate, decades } = book.meta;
  const decade = query.decada && book.scopes[query.decada] ? query.decada : "todas";
  const sections = book.scopes[decade];
  const range = decade === "todas" ? `${firstSeason}–${lastSeason}` : `${decade}–${Math.min(Number(decade) + 9, lastSeason)}`;
  const updated = new Date(`${lastRaceDate}T12:00:00Z`).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return <main id="top" className="ency-page"><SiteHeader /><div className="ency-page-wrap records-wrap">
    <header className="ency-title">
      <nav className="ency-breadcrumb" aria-label="Ruta del artículo"><Link href="/historia">Estadísticas</Link><span>/</span><span>Récords</span></nav>
      <h1>Récords</h1>
      <p className="ency-subtitle">Campeonato Mundial {range}, con resultados hasta el {updated}.</p>
    </header>
    <nav className="ency-controls records-decades" aria-label="Época">
      <Link href="/historia/records" aria-current={decade === "todas" ? "page" : undefined}>Todas</Link>
      {decades.map(d => <Link key={d} href={`/historia/records?decada=${d}`} aria-current={decade === `${d}` ? "page" : undefined}>{d}s</Link>)}
    </nav>
    <nav className="records-index" aria-label="Secciones">{sections.map(s => <a key={s.id} href={`#${s.id}`}>{s.title}</a>)}</nav>
    {sections.map(section => <section key={section.id} id={section.id} className="records-section">
      <h2>{section.title}</h2>
      <div className="records-grid">{section.records.map(record => <Table key={record.id} record={record} />)}</div>
    </section>)}
    <details className="ency-method records-method"><summary>Cómo se cuenta</summary>
      <p>Todo se calcula con los resultados de <a href="https://github.com/f1db/f1db" target="_blank" rel="noreferrer">F1DB</a> del archivo, incluidas las 500 Millas de Indianápolis de 1950 a 1960. Las rachas recorren las carreras en las que el piloto o el equipo estuvo inscrito y no cuentan Indianápolis.</p>
      <p>Las poles son las oficiales de cada carrera. Los autos compartidos dan crédito a cada piloto; constructores y motores cuentan una vez por carrera. Las naciones siguen la nacionalidad del piloto.</p>
      <p>Los récords del modelo v7.6 son una estimación retrospectiva propia, no estadística oficial. <Link href="/ranking">Cómo funciona el modelo</Link>.</p>
    </details>
  </div><SiteFooter /></main>;
}
