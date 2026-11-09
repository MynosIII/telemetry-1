import Link from "next/link";
import { latestArticle, localizeArticle, readingMinutes } from "@/lib/editorial-articles";

/** The newest published article opens the home page, so a new piece is the first thing people see. */
export function HomeLatestArticle({ lang }: { lang: "es" | "en" }) {
  const latest = latestArticle();
  if (!latest) return null;
  const article = localizeArticle(latest, lang);
  const english = article.english;
  const figure = article.image ?? article.sections.find(section => section.diagram)?.diagram;
  const date = new Date(`${article.publishedOn}T12:00:00Z`).toLocaleDateString(english ? "en-GB" : "es-AR", { day: "numeric", month: "long", timeZone: "UTC" });
  const href = `/articulos/${article.slug}`;
  return <section className="home-article" aria-labelledby="home-article-title">
    <div className="home-article-copy">
      <p className="home-article-meta">{english ? "New article" : "Artículo nuevo"} · {date} · {readingMinutes(article)} min</p>
      <h2 id="home-article-title"><Link href={href}>{article.title}</Link></h2>
      <p>{article.description}</p>
      <Link className="home-article-link" href={href}>{english ? "Read the article →" : "Leer el artículo →"}</Link>
    </div>
    {figure ? <Link className="home-article-figure" href={href} tabIndex={-1} aria-hidden="true">
      <img src={figure.url} alt="" width={760} height={article.image ? 507 : "height" in figure && figure.height ? figure.height : 340} />
    </Link> : null}
  </section>;
}
