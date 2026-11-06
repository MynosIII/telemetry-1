import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CircuitArticlePhoto } from "@/components/CircuitArticlePhoto";
import { articleBySlug, editorialArticles, readingMinutes } from "@/lib/editorial-articles";
import { eraForYear } from "@/lib/article-eras";
import "../../articles.css";

type Props = { params: Promise<{slug:string}> };
export function generateStaticParams() { return editorialArticles.map(article => ({slug: article.slug})); }
export async function generateMetadata({params}:Props):Promise<Metadata> {
  const article = articleBySlug((await params).slug);
  if (!article) return {title:"Artículo no encontrado"};
  return {title:article.title, description:article.description, alternates:{canonical:`/articulos/${article.slug}`},
    openGraph:{type:"article",title:article.title,description:article.description,url:`/articulos/${article.slug}`,images:article.image?[{url:article.image.url,alt:article.image.alt}]:undefined}};
}

export default async function ArticlePage({params}:Props) {
  const article = articleBySlug((await params).slug);
  if (!article) notFound();
  const explanatory = article.kind === "explainer";
  const nextArticles = editorialArticles.filter(item => item.slug !== article.slug && (item.kind ?? "history") === (article.kind ?? "history")).sort((a,b) => Number(b.category === article.category) - Number(a.category === article.category)).slice(0,3);
  return <main className="editorial-page" id="top"><SiteHeader />
    <article>
      <header className="editorial-article-hero"><Link className="editorial-back" href={explanatory ? "/articulos?tipo=explicaciones#biblioteca" : "/articulos"}>← Todos los artículos</Link>
        <p className="editorial-category">{article.category}</p>{explanatory ? <span className="editorial-date-tag">{article.level} · {article.period}</span> : <Link className="editorial-date-tag" href={`/articulos?epoca=${eraForYear(article.year).id}#biblioteca`} aria-label={`Más historias de ${eraForYear(article.year).label}`}>{article.period} · Ver esta época ↗</Link>}<h1>{article.title}</h1>
        <p className="editorial-deck">{article.description}</p><p className="editorial-byline">Redacción Telemetry One · {readingMinutes(article)} min de lectura · Español</p>
        {explanatory && article.reviewedOn && <p className="editorial-byline">Revisado el {article.reviewedOn.split("-").reverse().join("/")} · Fuentes al final del artículo</p>}
      </header>
      <div className="editorial-reading-layout">
        <aside className="editorial-toc"><details><summary>{explanatory ? "En este artículo" : "En esta historia"}</summary><nav aria-label={explanatory ? "En este artículo" : "En esta historia"}><ul>{article.sections.map(section => <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>)}</ul><a href="#fuentes">Fuentes para seguir leyendo</a></nav></details></aside>
        <div className="editorial-prose"><p className="editorial-lead">{article.lead}</p>
          {article.image && <CircuitArticlePhoto key={article.image.page} photo={article.image} />}
          {article.sections.map(section => <section key={section.id} id={section.id} className="editorial-chapter"><h2>{section.title}</h2>
            {section.paragraphs.map((paragraph,i) => <p key={i}>{paragraph}</p>)}
            {section.diagram && <figure className="editorial-diagram"><img src={section.diagram.url} alt={section.diagram.alt} width={760} height={340} loading="lazy" /><figcaption>{section.diagram.caption}</figcaption></figure>}
          </section>)}
          <section id="fuentes" className="editorial-sources"><details><summary>Fuentes para seguir leyendo</summary><p>{explanatory ? "Reglamentos, documentación oficial e investigaciones que respaldan esta explicación." : "Archivos, testimonios y documentación que acompañan esta historia."}</p><ul>{article.sources.map(source => <li key={source.id} id={`fuente-${source.id}`}><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a></li>)}</ul><details className="editorial-source-map"><summary>Consultar las fuentes por capítulo</summary>{article.sections.map(section => <div key={section.id}><h3>{section.title}</h3><ul>{section.sourceIds.map(id => {const source=article.sources.find(item=>item.id===id);return source && <li key={id}><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a></li>;})}</ul></div>)}</details></details></section>
          {!!article.related.length && <aside className="editorial-related"><h2>{explanatory ? "Seguí explorando" : "Seguí la historia en el archivo"}</h2>{article.related.map(link => <Link key={link.href} href={link.href}>{link.label} →</Link>)}</aside>}
        </div>
      </div>
    </article>
    <section className="editorial-more"><h2>{explanatory ? "Más explicaciones para leer" : "Más historias para leer"}</h2><div className="editorial-card-grid">{nextArticles.map(item => <Link className="editorial-card" href={`/articulos/${item.slug}`} key={item.slug}><p className="editorial-category">{item.category}</p><h3>{item.title}</h3><p>{item.description}</p><b>Leer artículo →</b></Link>)}</div></section>
    <SiteFooter /></main>;
}
