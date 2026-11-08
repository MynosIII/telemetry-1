import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CircuitArticlePhoto } from "@/components/CircuitArticlePhoto";
import { articleBySlug, editorialArticles, localizeArticle, readingMinutes, categoryLabel } from "@/lib/editorial-articles";
import { eraForYear } from "@/lib/article-eras";
import "../../articles.css";

type Props = { params: Promise<{lang:string;slug:string}> };
export function generateStaticParams() { return editorialArticles.map(article => ({slug: article.slug})); }
export async function generateMetadata({params}:Props):Promise<Metadata> {
  const {lang,slug} = await params;
  const original = articleBySlug(slug);
  if (!original) return {title:"Artículo no encontrado"};
  const article = localizeArticle(original, lang === "en" ? "en" : "es");
  return {title:article.title, description:article.description, alternates:{canonical:`/articulos/${article.slug}`},
    openGraph:{type:"article",title:article.title,description:article.description,url:`/articulos/${article.slug}`,images:article.image?[{url:article.image.url,alt:article.image.alt}]:undefined}};
}

const ui = {
  es: {back:"← Todos los artículos", minutes:"min de lectura", language:"Español", reviewed:"Revisado el", sourcesAtEnd:"Fuentes al final del artículo", inArticle:"En este artículo", inStory:"En esta historia", sources:"Fuentes para seguir leyendo", sourcesExplainer:"Reglamentos, documentación oficial e investigaciones que respaldan esta explicación.", sourcesHistory:"Archivos, testimonios y documentación que acompañan esta historia.", byChapter:"Consultar las fuentes por capítulo", keepExploring:"Seguí explorando", keepHistory:"Seguí la historia en el archivo", moreExplainers:"Más explicaciones para leer", moreStories:"Más historias para leer", read:"Leer artículo →"},
  en: {back:"← All articles", minutes:"min read", language:"English", reviewed:"Reviewed on", sourcesAtEnd:"Sources at the end of the article", inArticle:"In this article", inStory:"In this story", sources:"Sources for further reading", sourcesExplainer:"Regulations, official documents and research behind this explanation.", sourcesHistory:"Archives, accounts and documents behind this story.", byChapter:"Sources by chapter", keepExploring:"Keep exploring", keepHistory:"Follow the story in the archive", moreExplainers:"More explainers", moreStories:"More stories", read:"Read article →"}
};

export default async function ArticlePage({params}:Props) {
  const {lang,slug} = await params;
  const original = articleBySlug(slug);
  if (!original) notFound();
  const article = localizeArticle(original, lang === "en" ? "en" : "es");
  // Only articles with an English version switch the page chrome to English.
  const t = ui[article.english ? "en" : "es"];
  const explanatory = article.kind === "explainer";
  const nextArticles = editorialArticles.filter(item => item.slug !== article.slug && (item.kind ?? "history") === (article.kind ?? "history")).sort((a,b) => Number(b.category === article.category) - Number(a.category === article.category)).slice(0,3);
  return <main className="editorial-page" id="top"><SiteHeader />
    <article>
      <header className="editorial-article-hero"><Link className="editorial-back" href={explanatory ? "/articulos?tipo=explicaciones#biblioteca" : "/articulos"}>{t.back}</Link>
        <p className="editorial-category">{categoryLabel(article.category, article.english)}</p>{explanatory ? <span className="editorial-date-tag">{article.english ? ({Inicial:"Beginner",Intermedio:"Intermediate",Avanzado:"Advanced"} as Record<string,string>)[article.level ?? ""] ?? article.level : article.level} · {article.period}</span> : <Link className="editorial-date-tag" href={`/articulos?epoca=${eraForYear(article.year).id}#biblioteca`} aria-label={`Más historias de ${eraForYear(article.year).label}`}>{article.period} · Ver esta época ↗</Link>}<h1>{article.title}</h1>
        <p className="editorial-deck">{article.description}</p><p className="editorial-byline">{article.english ? "Telemetry One" : "Redacción Telemetry One"} · {readingMinutes(article)} {t.minutes} · {t.language}</p>
        {explanatory && article.reviewedOn && <p className="editorial-byline">{t.reviewed} {article.reviewedOn.split("-").reverse().join("/")} · {t.sourcesAtEnd}</p>}
      </header>
      <div className="editorial-reading-layout">
        <aside className="editorial-toc"><details><summary>{explanatory ? t.inArticle : t.inStory}</summary><nav aria-label={explanatory ? t.inArticle : t.inStory}><ul>{article.sections.map(section => <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>)}</ul><a href="#fuentes">{t.sources}</a></nav></details></aside>
        <div className="editorial-prose"><p className="editorial-lead">{article.lead}</p>
          {article.image && <CircuitArticlePhoto key={article.image.page} photo={article.image} />}
          {article.sections.map(section => <section key={section.id} id={section.id} className="editorial-chapter"><h2>{section.title}</h2>
            {section.paragraphs.map((paragraph,i) => <p key={i}>{paragraph}</p>)}
            {section.diagram && <figure className="editorial-diagram"><img src={section.diagram.url} alt={section.diagram.alt} width={760} height={section.diagram.height ?? 340} loading="lazy" /><figcaption>{section.diagram.caption}</figcaption></figure>}
          </section>)}
          <section id="fuentes" className="editorial-sources"><details><summary>{t.sources}</summary><p>{explanatory ? t.sourcesExplainer : t.sourcesHistory}</p><ul>{article.sources.map(source => <li key={source.id} id={`fuente-${source.id}`}><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a></li>)}</ul><details className="editorial-source-map"><summary>{t.byChapter}</summary>{article.sections.map(section => <div key={section.id}><h3>{section.title}</h3><ul>{section.sourceIds.map(id => {const source=article.sources.find(item=>item.id===id);return source && <li key={id}><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a></li>;})}</ul></div>)}</details></details></section>
          {!!article.related.length && <aside className="editorial-related"><h2>{explanatory ? t.keepExploring : t.keepHistory}</h2>{article.related.map(link => <Link key={link.href} href={link.href}>{link.label} →</Link>)}</aside>}
        </div>
      </div>
    </article>
    <section className="editorial-more"><h2>{explanatory ? t.moreExplainers : t.moreStories}</h2><div className="editorial-card-grid">{nextArticles.map(other => localizeArticle(other, article.english ? "en" : "es")).map(item => <Link className="editorial-card" href={`/articulos/${item.slug}`} key={item.slug}><p className="editorial-category">{categoryLabel(item.category, item.english)}</p><h3>{item.title}</h3><p>{item.description}</p><b>{t.read}</b></Link>)}</div></section>
    <SiteFooter /></main>;
}
