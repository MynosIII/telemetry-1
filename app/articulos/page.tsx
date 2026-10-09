import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ArticleLibrary } from "@/components/ArticleLibrary";
import { articleCategories, editorialArticles, readingMinutes } from "@/lib/editorial-articles";
import "../articles.css";

export const metadata: Metadata = {
  title: "Artículos · Historia e ingeniería del automovilismo",
  description: "De las Grandes Épreuves al efecto suelo, el turbo y las ideas que cambiaron la Fórmula 1. Artículos originales con fuentes y conexiones al archivo.",
  alternates: { canonical: "/articulos" }
};

export default function ArticlesPage() {
  const featured = editorialArticles.find(article => article.slug.includes("epreuves")) ?? editorialArticles[0];
  return <main className="editorial-page" id="top"><SiteHeader />
    <header className="editorial-hero">
      <p className="eyebrow eyebrow-red">LA BIBLIOTECA DE TELEMETRY ONE</p>
      <h1>La historia detrás<br />de la <em>velocidad.</em></h1>
      <p className="editorial-deck">Las carreras que crearon un deporte. Los autos que cambiaron sus reglas. Las ideas y las personas que hicieron posible la Fórmula 1.</p>
      <div className="editorial-hero-meta"><span>{editorialArticles.length} artículos originales</span><span>Historia · Ingeniería · Reglamento</span></div>
    </header>
    {featured && <section className="editorial-feature" aria-labelledby="featured-title">
      <div><p className="editorial-category">PARA EMPEZAR · {featured.period}</p><h2 id="featured-title">{featured.title}</h2><p>{featured.description}</p>
        <Link href={`/articulos/${featured.slug}`} className="editorial-text-link">Leer la historia completa →</Link></div>
      <aside><span>ANTES DE 1950</span><p>El Mundial fue un punto de llegada. El automovilismo ya tenía décadas de carreras, reglamentos y rivalidades.</p><Link href="/historia?categoria=grands-prix#archivo">Explorar los Grandes Premios ↗</Link></aside>
    </section>}
    <ArticleLibrary categories={articleCategories} articles={editorialArticles.map(article => ({slug:article.slug, title:article.title, description:article.description, category:article.category, period:article.period, minutes:readingMinutes(article)}))} />
    <section className="editorial-note"><h2>Historias con contexto</h2><p>Textos originales apoyados en fuentes históricas, documentación técnica y archivos. Cada artículo identifica sus referencias y conecta la lectura con las temporadas, los equipos y los circuitos del archivo.</p><Link href="/historia">Continuar en el archivo estadístico →</Link></section>
    <SiteFooter /></main>;
}
