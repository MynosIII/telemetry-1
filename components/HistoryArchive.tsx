"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FallbackImage } from "./FallbackImage";
import { driverPhoto } from "@/lib/driver-photos";
import { teamLogo } from "@/lib/team-media";
import { getCountryFlagUrl } from "@/lib/circuit-visuals";
import { translate } from "@/lib/dictionary";
import { historyCategories, type HistoryCategory, type HistorySummary } from "@/lib/history-labels";

const initials = (name: string) => name.split(/[\s-]+/).filter(Boolean).map(part => part[0]).slice(0, 2).join("").toUpperCase();
// Driver portraits and team logos, with initials when there is none or it fails to load.
const avatarFor = (category: HistoryCategory, id: string) => {
  const url = category === "drivers" ? driverPhoto(id) : teamLogo(id);
  return url ? [url] : [];
};
const singular: Record<HistoryCategory, string> = { drivers: "Piloto", constructors: "Constructor", engines: "Motor", circuits: "Circuito", nations: "Nación", tyres: "Neumático", "grands-prix": "Gran Premio", seasons: "Temporada" };
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export type ArchiveEntry = Pick<HistorySummary, "id" | "category" | "name" | "fullName" | "country" | "firstSeason" | "lastSeason" | "titleSeasons" | "href"> & { stats: Pick<HistorySummary["stats"], "races" | "wins"> };

const isCategory = (value: string | null | undefined): value is HistoryCategory => !!value && value !== "seasons" && Object.hasOwn(historyCategories, value);

/** The open category lives in ?categoria= so the section sub-bar can link to it. */
export function HistoryArchive({ entities }: { entities: ArchiveEntry[] }) {
  // useSearchParams needs a Suspense boundary on the static /historia page.
  return <Suspense fallback={<Archive entities={entities} category="drivers" />}><ArchiveFromQuery entities={entities} /></Suspense>;
}

function ArchiveFromQuery({ entities }: { entities: ArchiveEntry[] }) {
  const requested = useSearchParams()?.get("categoria");
  const router = useRouter();
  const pathname = usePathname();
  const category = isCategory(requested) ? requested : "drivers";
  return <Archive key={category} entities={entities} category={category}
    onCategory={key => router.replace(`${pathname}?categoria=${key}`, { scroll: false })} />;
}

function Archive({ entities, category, onCategory }: { entities: ArchiveEntry[]; category: HistoryCategory; onCategory?: (key: HistoryCategory) => void }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("wins");
  const [champions, setChampions] = useState(false);
  const [limit, setLimit] = useState(30);
  const results = useMemo(() => entities.filter(e =>
    e.category === category && (!champions || e.titleSeasons.length > 0) &&
    normalize(`${e.name} ${e.fullName} ${e.country ?? ""}`).includes(normalize(query.trim()))
  ).sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "debut" ? a.firstSeason - b.firstSeason : sort === "races" ? b.stats.races - a.stats.races : b.stats.wins - a.stats.wins), [entities, category, query, champions, sort]);

  const titled = category === "drivers" || category === "constructors";
  return <div className="history-archive" id="archivo">
    {category === "tyres" ? <p className="history-note"><Link href="/historia/neumaticos">Fabricantes, estadísticas y materiales documentados →</Link></p> : null}
    <div className="history-categories" role="group" aria-label="Categorías del archivo">
      {(Object.entries(historyCategories) as [HistoryCategory, string][]).filter(([key]) => key !== "seasons").map(([key, label]) =>
        <button key={key} aria-pressed={category === key} onClick={() => onCategory?.(key)}>{label}<span>{entities.filter(e => e.category === key).length}</span></button>
      )}
    </div>
    <div className="history-filters">
      <label className="history-search"><span className="sr-only">Buscar en {historyCategories[category].toLowerCase()}</span><input type="search" placeholder={`Buscar en ${historyCategories[category].toLowerCase()}…`} value={query} onChange={e => { setQuery(e.target.value); setLimit(30); }} /></label>
      <label><span className="sr-only">Ordenar por</span><select value={sort} onChange={e => setSort(e.target.value)}><option value="wins">Más victorias</option><option value="races">Más Grandes Premios</option><option value="debut">Primera temporada</option><option value="name">Nombre</option></select></label>
      {titled ? <label className="history-check"><input type="checkbox" checked={champions} onChange={e => { setChampions(e.target.checked); setLimit(30); }} /> Solo campeones</label> : null}
      <p className="history-count" role="status">{results.length.toLocaleString("es-AR")} {results.length === 1 ? "resultado" : "resultados"}</p>
    </div>
    <div className={`history-directory${titled ? " is-titled" : ""}`}>
      <div className="history-directory-head" aria-hidden="true"><span>{singular[category]}</span>{titled ? <span>Títulos</span> : null}<span>GP</span><span>Victorias</span></div>
      {results.slice(0, limit).map(entity => <Link prefetch={false} className="history-directory-row" key={`${category}/${entity.id}`} href={entity.href}>
        <span className="history-directory-who">{titled ? <span className={`history-avatar history-avatar-${category}`} aria-hidden="true"><FallbackImage sources={avatarFor(category, entity.id)} alt="" fallback={initials(entity.name)} /></span> : null}{category === "circuits" && entity.country && getCountryFlagUrl(entity.country) ? <img className="history-flag" src={getCountryFlagUrl(entity.country)} alt="" width={30} height={20} loading="lazy" /> : null}<span><strong>{entity.name}</strong><small>{entity.country ? `${translate(entity.country, "countries")} · ` : ""}{entity.firstSeason === entity.lastSeason ? entity.firstSeason : `${entity.firstSeason}–${entity.lastSeason}`}</small></span></span>
        {titled ? <b className={entity.titleSeasons.length ? "is-champion" : "is-zero"}>{entity.titleSeasons.length || "—"}<small> títulos</small></b> : null}
        <b>{entity.stats.races}<small> GP</small></b><b className={entity.stats.wins ? "" : "is-zero"}>{entity.stats.wins}<small> victorias</small></b>
      </Link>)}
    </div>
    {!results.length ? <p className="history-empty">Sin coincidencias. Probá otro nombre o país.</p> : null}
    {limit < results.length ? <button className="history-more" onClick={() => setLimit(n => n + 30)}>Mostrar 30 más</button> : null}
  </div>;
}
