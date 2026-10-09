import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ArticleLibrary } from "@/components/ArticleLibrary";
import { articleCategories, editorialArticles, readingMinutes } from "@/lib/editorial-articles";
import { articleEras } from "@/lib/article-eras";
import "../articles.css";

export const metadata: Metadata = {
  title: "Artículos · Historia e ingeniería del automovilismo",
  description: "Historias de autos, pilotos y primeras carreras: un viaje por las Grandes Épreuves, la Fórmula 1 y el automovilismo argentino.",
  alternates: { canonical: "/articulos" }
};

export default async function ArticlesPage({searchParams}:{searchParams:Promise<{epoca?:string}>}) {
  const {epoca} = await searchParams;
  const initialEra = articleEras.find(era => era.id === epoca)?.id;
  return <main className="editorial-page" id="top"><SiteHeader />
    <header className="editorial-hero">
      <p className="eyebrow eyebrow-red">LA BIBLIOTECA DE TELEMETRY ONE</p>
      <h1>La historia detrás<br />de la <em>velocidad.</em></h1>
      <p className="editorial-deck">Las carreras que crearon un deporte. Los autos que cambiaron sus reglas. Las ideas y las personas que hicieron posible la Fórmula 1.</p>
      <div className="editorial-hero-meta"><span>Grand Prix · Fórmula 1 · Automovilismo argentino</span></div>
      <p><a className="editorial-text-link" href="#biblioteca">Empezar el viaje ↓</a></p>
    </header>
    <ArticleLibrary key={initialEra ?? "inicio"} initialEra={initialEra} categories={articleCategories} articles={editorialArticles.map(article => ({slug:article.slug, title:article.title, description:article.description, category:article.category, period:article.period, year:article.year, tags:article.tags, minutes:readingMinutes(article)}))} />
    <section className="editorial-note"><h2>Una historia lleva a otra</h2><p>Detrás de cada auto hay un taller, una decisión y una época. Si querés seguir investigando, las fuentes están al final de cada relato; los resultados y las estadísticas, en el archivo.</p><Link href="/historia">Explorar el archivo →</Link></section>
    <SiteFooter /></main>;
}
