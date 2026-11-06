import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ArticleLibrary } from "@/components/ArticleLibrary";
import { articleCategories, explainerCategories, editorialArticles, readingMinutes } from "@/lib/editorial-articles";
import { articleEras } from "@/lib/article-eras";
import "../articles.css";

export const metadata: Metadata = {
  title: "Artículos · Historia e ingeniería del automovilismo",
  description: "Historias del automovilismo y guías para entender la Fórmula 1: reglamento, aerodinámica, neumáticos y tecnología.",
  alternates: { canonical: "/articulos" }
};

export default async function ArticlesPage({searchParams}:{searchParams:Promise<{epoca?:string;tipo?:string}>}) {
  const {epoca,tipo} = await searchParams;
  const initialEra = articleEras.find(era => era.id === epoca)?.id;
  return <main className="editorial-page" id="top"><SiteHeader />
    <header className="editorial-hero">
      <p className="eyebrow eyebrow-red">LA BIBLIOTECA DE TELEMETRY ONE</p>
      <h1>La historia detrás<br />de la <em>velocidad.</em></h1>
      <p className="editorial-deck">Las carreras que crearon un deporte. Los autos que cambiaron sus reglas. Y las explicaciones para entender cómo funciona la Fórmula 1, desde tu primera carrera hasta los detalles de ingeniería.</p>
      <div className="editorial-hero-meta"><span>Grand Prix · Fórmula 1 · Automovilismo argentino</span></div>
      <p><a className="editorial-text-link" href="#biblioteca">Empezar el viaje ↓</a></p>
    </header>
    <ArticleLibrary key={`${initialEra ?? "inicio"}-${tipo}`} initialEra={initialEra} initialKind={tipo === "explicaciones" ? "explainer" : "history"} categories={articleCategories} explainerCategories={explainerCategories} articles={editorialArticles.map(article => ({slug:article.slug, title:article.title, description:article.description, category:article.category, period:article.period, year:article.year, tags:article.tags, kind:article.kind, level:article.level, minutes:readingMinutes(article)}))} />
    <section className="editorial-note"><h2>Una historia lleva a otra</h2><p>Detrás de cada auto hay un taller, una decisión y una época. Si querés seguir investigando, las fuentes están al final de cada relato; los resultados y las estadísticas, en el archivo.</p><Link href="/historia">Explorar el archivo →</Link></section>
    <SiteFooter /></main>;
}
