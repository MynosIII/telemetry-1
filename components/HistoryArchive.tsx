"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FallbackImage } from "./FallbackImage";
import { driverPhoto } from "@/lib/driver-photos";
import { teamLogo } from "@/lib/team-media";
import { historyCategories, type HistoryCategory, type HistorySummary } from "@/lib/history-labels";

const initials = (name: string) => name.split(/[\s-]+/).filter(Boolean).map(part => part[0]).slice(0, 2).join("").toUpperCase();
// Driver portraits and team logos, with initials when there is none or it fails to load.
const avatarFor = (category: HistoryCategory, id: string) => {
  const url = category === "drivers" ? driverPhoto(id) : teamLogo(id);
  return url ? [url] : [];
};
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export type ArchiveEntry = Pick<HistorySummary, "id" | "category" | "name" | "fullName" | "country" | "firstSeason" | "lastSeason" | "titleSeasons" | "href"> & { stats: Pick<HistorySummary["stats"], "races" | "wins"> };

export function HistoryArchive({ entities }: { entities: ArchiveEntry[] }) {
  const [category, setCategory] = useState<HistoryCategory>("drivers");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("wins");
  const [champions, setChampions] = useState(false);
  const [limit, setLimit] = useState(30);
  const results = useMemo(() => entities.filter(e =>
    e.category === category && (!champions || e.titleSeasons.length > 0) &&
    normalize(`${e.name} ${e.fullName} ${e.country ?? ""}`).includes(normalize(query.trim()))
  ).sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "debut" ? a.firstSeason - b.firstSeason : sort === "races" ? b.stats.races - a.stats.races : b.stats.wins - a.stats.wins), [entities, category, query, champions, sort]);

  return <div className="history-archive">
    <div className="history-categories" aria-label="Categorías del archivo">
      {(Object.entries(historyCategories) as [HistoryCategory, string][]).map(([key, label]) =>
        <button key={key} aria-pressed={category === key} onClick={() => { setCategory(key); setLimit(30); setChampions(false); }}>{label}<span>{entities.filter(e => e.category === key).length}</span></button>
      )}
    </div>
    <div className="history-filters">
      <label className="history-search"><span>Buscar en {historyCategories[category].toLowerCase()}</span><input type="search" placeholder="Nombre o país…" value={query} onChange={e => { setQuery(e.target.value); setLimit(30); }} /></label>
      <label><span>Ordenar por</span><select value={sort} onChange={e => setSort(e.target.value)}><option value="wins">Victorias</option><option value="races">Grandes Premios</option><option value="debut">Primera temporada</option><option value="name">Nombre</option></select></label>
      {category === "drivers" || category === "constructors" ? <label className="history-check"><input type="checkbox" checked={champions} onChange={e => { setChampions(e.target.checked); setLimit(30); }} /> Solo campeones</label> : null}
    </div>
    <p className="history-count" role="status">{results.length} resultados · mostrando {Math.min(limit, results.length)}</p>
    <div className="history-directory">
      {results.slice(0, limit).map(entity => <Link prefetch={false} className="history-directory-row" key={`${category}/${entity.id}`} href={entity.href}>
        <div className="history-directory-who">{category === "drivers" || category === "constructors" ? <span className={`history-avatar history-avatar-${category}`} aria-hidden="true"><FallbackImage sources={avatarFor(category, entity.id)} alt="" fallback={initials(entity.name)} /></span> : null}<div><strong>{entity.name}</strong><span>{entity.country ? `${entity.country} · ` : ""}{entity.firstSeason === entity.lastSeason ? entity.firstSeason : `${entity.firstSeason}–${entity.lastSeason}`}{entity.titleSeasons.length ? ` · ${entity.titleSeasons.length} título${entity.titleSeasons.length === 1 ? "" : "s"}` : ""}</span></div></div>
        <b>{entity.stats.races}<small>GP</small></b><b>{entity.stats.wins}<small>VICTORIAS</small></b><span className="history-open">EXPLORAR →</span>
      </Link>)}
    </div>
    {!results.length ? <p className="history-empty">No hay coincidencias en esta categoría. Probá otro nombre, país o categoría.</p> : null}
    {limit < results.length ? <button className="button button-dark" onClick={() => setLimit(n => n + 30)}>MOSTRAR 30 MÁS</button> : null}
  </div>;
}
