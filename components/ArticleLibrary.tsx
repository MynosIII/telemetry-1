"use client";

import Link from "next/link";
import { useState } from "react";

export type ArticleCard = {
  slug: string; title: string; description: string; category: string; period: string; minutes: number;
};

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function ArticleLibrary({ articles, categories }: { articles: ArticleCard[]; categories: string[] }) {
  const [category, setCategory] = useState("Todos");
  const [query, setQuery] = useState("");
  const visible = articles.filter(article => (category === "Todos" || article.category === category)
    && normalize(`${article.title} ${article.description} ${article.period}`).includes(normalize(query.trim())));
  return <section className="editorial-library" id="biblioteca" aria-labelledby="library-title">
    <div className="editorial-library-head"><h2 id="library-title">La biblioteca</h2><p aria-live="polite">{visible.length} de {articles.length} artículos</p></div>
    <div className="editorial-controls">
      <div className="editorial-filters" aria-label="Filtrar artículos por tema">{["Todos", ...categories].map(item => <button
        key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div>
      <label className="editorial-search">Buscar en los artículos<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Cooper, Grandes Épreuves, turbo…" /></label>
    </div>
    <div className="editorial-card-grid">{visible.map(article => <Link className="editorial-card" key={article.slug} href={`/articulos/${article.slug}`}>
      <p className="editorial-category">{article.category}</p><span className="editorial-period">{article.period}</span>
      <h3>{article.title}</h3><p>{article.description}</p><div className="editorial-card-bottom"><span>{article.minutes} min de lectura</span><b>Leer artículo ↗</b></div>
    </Link>)}</div>
    {!visible.length && <p className="editorial-empty">No encontramos artículos con esa búsqueda. Probá otro término o elegí «Todos».</p>}
  </section>;
}
