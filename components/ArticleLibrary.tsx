"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { articleEras } from "@/lib/article-eras";

export type ArticleCard = {
  slug: string; title: string; description: string; category: string; period: string; minutes: number; year: number; tags?: string[];
};

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function ArticleLibrary({ articles, categories, initialEra }: { articles: ArticleCard[]; categories: string[]; initialEra?: string }) {
  const [category, setCategory] = useState("Todos");
  const [query, setQuery] = useState("");
  const [selectedEra, setSelectedEra] = useState<string | null>(initialEra ?? null);
  const [eraCount, setEraCount] = useState(1);
  const [expanded, setExpanded] = useState<string[]>([]);
  const eraNav = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = eraNav.current;
    const active = nav?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (nav && active && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = active.offsetLeft - nav.offsetLeft - (nav.clientWidth-active.offsetWidth)/2;
  }, [selectedEra]);
  const filtered = articles.filter(article => (category === "Todos" || article.category === category)
    && normalize(`${article.title} ${article.description} ${article.period} ${(article.tags ?? []).join(" ")}`).includes(normalize(query.trim())));
  const groups = articleEras.map(era => ({...era, items: filtered.filter(article => article.year >= era.from && article.year <= era.to)
    .sort((a,b) => a.year-b.year || a.title.localeCompare(b.title,"es"))})).filter(era => era.items.length);
  const searching = query.trim() !== "" || category !== "Todos";
  const visibleGroups = selectedEra ? groups.filter(era => era.id === selectedEra) : searching ? groups : groups.slice(0,eraCount);
  const nextEra = !selectedEra && !searching ? groups[eraCount] : undefined;
  return <section className="editorial-library" id="biblioteca" aria-labelledby="library-title">
    <div className="editorial-library-head"><div><p className="editorial-category">PARA EMPEZAR</p><h2 id="library-title">Un viaje por la historia</h2></div></div>
    <p className="editorial-timeline-intro">Empezá por las primeras carreras o elegí una época. Cada historia abre otra puerta.</p>
    <nav ref={eraNav} className="editorial-era-nav" aria-label="Elegir una época">
      <button type="button" aria-pressed={!selectedEra} onClick={() => {setSelectedEra(null);setEraCount(1);}}>Desde el principio</button>
      {articleEras.map(era => <button key={era.id} type="button" aria-pressed={selectedEra === era.id} onClick={() => setSelectedEra(era.id)}>{era.label}</button>)}
    </nav>
    <details className="editorial-discovery"><summary>Buscar una historia o elegir un tema</summary><div className="editorial-controls">
      <div className="editorial-filters" aria-label="Filtrar historias por tema">{["Todos", ...categories].map(item => <button
        key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div>
      <label className="editorial-search">Buscar una historia<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Un auto, un lugar, una idea…" /></label>
    </div></details>
    <p className="sr-only" role="status">{filtered.length ? `${filtered.length} historias coinciden con los filtros. Mostrando ${visibleGroups.map(era => era.label).join(", ")}.` : "No hay historias con esos filtros."}</p>
    <ol className="editorial-timeline">{visibleGroups.map(era => {
      const showAll = expanded.includes(era.id) || searching;
      const items = showAll ? era.items : era.items.slice(0,4);
      return <li className="editorial-era" key={era.id} id={`epoca-${era.id}`}>
        <header className="editorial-era-heading"><span className="editorial-era-dot" aria-hidden="true" /><p>{era.label}</p><h3>{era.title}</h3></header>
        <div className="editorial-card-grid">{items.map(article => <article className="editorial-card" key={article.slug}>
          <div className="editorial-card-meta"><span className="editorial-date-tag">{article.period}</span><p className="editorial-category">{article.category}</p></div>
          <h4><Link href={`/articulos/${article.slug}`}>{article.title}</Link></h4><p>{article.description}</p>
          <div className="editorial-card-bottom"><span>{article.minutes} min de lectura</span><Link href={`/articulos/${article.slug}`}>Leer historia ↗<span className="sr-only">: {article.title}</span></Link></div>
        </article>)}</div>
        {!showAll && era.items.length > items.length && <button className="editorial-load-more" type="button" onClick={() => setExpanded(previous => [...previous,era.id])}>Ver más historias de {era.label} ↓</button>}
      </li>;
    })}</ol>
    {!visibleGroups.length && <p className="editorial-empty">No encontramos historias con esos filtros. Probá otro término, elegí «Todos» o cambiá de época.</p>}
    {nextEra && <div className="editorial-next-era"><p>La historia sigue…</p><button className="editorial-load-more" type="button" onClick={() => setEraCount(previous => previous+1)}>Ver la siguiente época · {nextEra.label} →</button></div>}
    {selectedEra && <button className="editorial-load-more" type="button" onClick={() => {setSelectedEra(null);setEraCount(articleEras.length);}}>Ver toda la línea del tiempo →</button>}
  </section>;
}
