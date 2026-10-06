import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { getHistoryIndex } from '@/lib/history';
import { tyreCompanies } from '@/lib/tyre-history';
import { TyreLogoMark } from '@/components/TyreBrand';
import { tyreMaterialSources } from '@/lib/tyre-materials';
import { number } from '@/lib/weekend-format';

export const metadata: Metadata = { title: 'Fabricantes de neumáticos · Historia', description: 'Los nueve fabricantes del archivo de F1: historia, localización, estadísticas y materiales documentados.' };
export default async function TyreCatalogue() {
  const brands = (await getHistoryIndex()).entities.filter(e => e.category === 'tyres').sort((a,b) => a.name.localeCompare(b.name));
  return <main className="ency-page tyre-page" id="top"><SiteHeader /><div className="ency-page-wrap tyre-catalogue" id="contenido" tabIndex={-1}><header className="ency-title"><nav className="ency-breadcrumb" aria-label="Ruta del artículo"><Link href="/historia">Historia</Link><span>/</span><span>Neumáticos</span></nav><p className="ency-eyebrow">1950–2025 · NUEVE FABRICANTES</p><h1>Los neumáticos del campeonato</h1><p className="ency-subtitle">Historia industrial y resultados de F1, con un mismo criterio de lectura para cada marca.</p></header><p>Las fichas conectan la empresa, su localización, pilotos y equipos. Las estadísticas separan carreras con varios proveedores de aquellas con uno solo registrado.</p><p>La sección técnica reúne documentación de materiales para seis fabricantes. Su alcance es industrial o de carretera: las fórmulas históricas de F1 y los ensayos físicos equivalentes quedan sin estimar.</p><div className="tyre-catalogue-grid">{brands.map(b => { const c = tyreCompanies[b.id]; return <article key={b.id}><Link href={b.href} aria-hidden="true" tabIndex={-1}><TyreLogoMark id={b.id} company={c} /></Link><p>{c.flag} {c.country} · fundada en {c.founded}</p><h2><Link href={b.href}>{b.name}</Link></h2><p>{c.locationLabel}: {c.location}</p><p><strong>{number(b.stats.races)}</strong> GP · <strong>{number(b.stats.wins)}</strong> victorias · {b.firstSeason}–{b.lastSeason}</p><p className="tyre-material-status">{tyreMaterialSources[b.id] ? 'Materiales con documentación pública · alcance indicado en la ficha' : 'Materiales históricos sin documentación contrastada'}</p><Link href={b.href}>Abrir ficha y estadísticas →</Link></article>; })}</div><p className="ency-note">Grandes Premios con registros de la marca; incluye inscripciones sin largada e Indianápolis 1950–1960. Los palmarés no miden por sí solos la calidad de los materiales.</p></div><SiteFooter /></main>;
}
