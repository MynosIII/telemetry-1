import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CircuitArticlePhoto } from "@/components/CircuitArticlePhoto";
import { articleBySlug, editorialArticles, readingMinutes } from "@/lib/editorial-articles";
import "../../articles.css";

type Props = { params: Promise<{slug:string}> };
export function generateStaticParams() { return editorialArticles.map(article => ({slug: article.slug})); }
export async function generateMetadata({params}:Props):Promise<Metadata> {
  const article = articleBySlug((await params).slug);
  if (!article) return {title:"Artículo no encontrado"};
  return {title:article.title, description:article.description, alternates:{canonical:`/articulos/${article.slug}`},
    openGraph:{type:"article",title:article.title,description:article.description,url:`/articulos/${article.slug}`}};
}

export default async function ArticlePage({params}:Props) {
  const article = articleBySlug((await params).slug);
  if (!article) notFound();
  const nextArticles = editorialArticles.filter(item => item.slug !== article.slug).sort((a,b) => Number(b.category === article.category) - Number(a.category === article.category)).slice(0,3);
  return <main className="editorial-page" id="top"><SiteHeader />
    <article>
      <header className="editorial-article-hero"><Link className="editorial-back" href="/articulos">← Todos los artículos</Link>
        <p className="editorial-category">{article.category} · {article.period}</p><h1>{article.title}</h1>
        <p className="editorial-deck">{article.description}</p><p className="editorial-byline">Redacción Telemetry One · {readingMinutes(article)} min de lectura · Español</p>
      </header>
      <div className="editorial-reading-layout">
        <aside className="editorial-toc"><nav aria-label="En este artículo"><p>EN ESTE ARTÍCULO</p><ol>{article.sections.map(section => <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>)}</ol><a href="#fuentes">Fuentes y referencias</a></nav></aside>
        <div className="editorial-prose"><p className="editorial-lead">{article.lead}</p>
          {article.image && <CircuitArticlePhoto photo={article.image} />}
          {article.sections.map((section,index) => <section key={section.id} id={section.id} className="editorial-chapter"><p className="editorial-chapter-number">{String(index+1).padStart(2,"0")}</p><h2>{section.title}</h2>
            {section.paragraphs.map((paragraph,i) => <p key={i}>{paragraph}</p>)}
            <p className="editorial-section-sources">Referencias: {section.sourceIds.map((id,i) => {const source=article.sources.find(item=>item.id===id);return source && <span key={id}>{i>0?" · ":""}<a href={`#fuente-${id}`}>{source.title}</a></span>;})}</p>
          </section>)}
          <section id="fuentes" className="editorial-sources"><h2>Fuentes y referencias</h2><p>Estas referencias permiten ampliar la lectura y consultar la documentación utilizada en cada sección.</p><ol>{article.sources.map(source => <li key={source.id} id={`fuente-${source.id}`}><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a></li>)}</ol></section>
          {!!article.related.length && <aside className="editorial-related"><h2>Seguí la historia en el archivo</h2>{article.related.map(link => <Link key={link.href} href={link.href}>{link.label} →</Link>)}</aside>}
        </div>
      </div>
    </article>
    <section className="editorial-more"><h2>Más historias para leer</h2><div className="editorial-card-grid">{nextArticles.map(item => <Link className="editorial-card" href={`/articulos/${item.slug}`} key={item.slug}><p className="editorial-category">{item.category}</p><h3>{item.title}</h3><p>{item.description}</p><b>Leer artículo →</b></Link>)}</div></section>
    <SiteFooter /></main>;
}
