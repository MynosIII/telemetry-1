import { Suspense } from "react";
import Link from "next/link";
import { HistoryCharts } from "./HistoryCharts";
import { LinkedNarrative, tidy, type NarrativeTarget } from "./LinkedNarrative";
import { LineageExplorer, type LineageView } from "./LineageExplorer";
import { TeamBadge } from "./TeamBadge";
import { FallbackImage } from "./FallbackImage";
import { driverPhoto } from "@/lib/driver-photos";
import { TeamCarIndex, type TeamCar } from "./TeamCarIndex";
import { historyCategories, type HistoryEntity } from "@/lib/history";
import { getWikipediaHistory } from "@/lib/wikipedia-history";
import { inkFor } from "@/lib/team-lineage";

const number = (value: number) => value.toLocaleString("es-AR");
const photoOf = (id: string) => { const url = driverPhoto(id); return url ? [url] : []; };
const monogram = (name: string) => name.split(" ").filter(Boolean).map(part => part[0]).slice(0, 2).join("");

async function TeamWikipedia({ entity }: { entity: HistoryEntity }) {
  const context = await getWikipediaHistory(entity.sources.wikipediaTitle);
  if (!context) return <p className="team-note">Wikipedia no respondió ahora. <a href={entity.sources.wikipedia} target="_blank" rel="noreferrer">Abrir el artículo ↗</a></p>;
  return <div className="team-wiki">
    {context.facts.length ? <dl>{context.facts.map((f, i) => <div key={`${f.label}/${i}`}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}</dl> : null}
    {context.sections.length ? <div className="team-wiki-chapters"><span>Para seguir leyendo en Wikipedia:</span>{context.sections.map(s => <a href={s.url} key={s.url} target="_blank" rel="noreferrer">{s.title} ↗</a>)}</div> : null}
  </div>;
}

export function TeamHistory({ entity, color, logo, cars, lineage }: {
  entity: HistoryEntity; color: string; logo: string | null; cars: TeamCar[];
  lineage: { base: string; steps: LineageView[]; current: number } | null;
}) {
  const stats = entity.stats;
  const drivers = entity.relations.find(group => group.category === "drivers")?.items ?? [];
  const engines = entity.relations.find(group => group.category === "engines")?.items ?? [];
  const winners = drivers.filter(d => d.wins > 0).sort((a, b) => b.wins - a.wins || a.firstSeason - b.firstSeason).slice(0, 9);
  const engineWinners = engines.filter(e => e.wins > 0).sort((a, b) => b.wins - a.wins);
  const bestSeason = [...entity.seasons].sort((a, b) => b.wins - a.wins || b.podiums - a.podiums)[0];
  const constructorTitles = entity.milestones.filter(m => m.label === "Campeón mundial" && /constructores/i.test(m.event)).map(m => m.season);
  const driverTitles = entity.titleSeasons.filter(year => !constructorTitles.includes(year));

  // Names worth linking in the story: drivers by full name, well-known surnames when unambiguous,
  // engine partners and the other names of this team.
  const surnameCount = new Map<string, number>();
  drivers.forEach(d => { const last = d.name.split(" ").at(-1)!; surnameCount.set(last, (surnameCount.get(last) ?? 0) + 1); });
  const targets: NarrativeTarget[] = [
    ...drivers.map(d => ({ text: d.name, href: d.href })),
    ...drivers.filter(d => d.races >= 15 && surnameCount.get(d.name.split(" ").at(-1)!) === 1).map(d => ({ text: d.name.split(" ").at(-1)!, href: d.href })),
    ...engines.map(e => ({ text: e.name, href: e.href })),
    ...(lineage?.steps ?? []).map(s => ({ text: s.name, href: s.href }))
  ].filter(t => t.text.length > 3 && t.text !== entity.name);
  const unique = [...new Map(targets.map(t => [t.text, t])).values()];
  const counts = { victorias: "#victorias", triunfos: "#victorias", podios: "#resultados", "Grandes Premios": "#resultados", "vueltas rápidas": "#resultados", pilotos: "#conexiones", temporadas: "#resultados" };

  // Collapse the run of "Campeón mundial" rows so the timeline reads as moments, not a list of years.
  const milestones = [...entity.milestones].sort((a, b) => a.season - b.season);
  const moments = milestones.filter(m => m.label !== "Campeón mundial");
  const firstTitle = milestones.find(m => m.label === "Campeón mundial");
  if (firstTitle) moments.push({ ...firstTitle, label: "Primer título mundial" });
  if (bestSeason?.wins) moments.push({ label: "Su mejor temporada", season: bestSeason.season, event: `${bestSeason.wins} victorias y ${bestSeason.podiums} podios en ${bestSeason.races} Grandes Premios` });
  moments.sort((a, b) => a.season - b.season);

  const sections = [["historia", "Historia"], ...(winners.length ? [["victorias", "Victorias"]] : []), ["resultados", "Resultados"], ["momentos", "Momentos"], ...(cars.length ? [["autos", "Autos"]] : []), ["conexiones", "Conexiones"], ["fuentes", "Fuentes"]];

  return <div className="team-history" style={{ ["--team" as string]: color, ["--team-ink" as string]: inkFor(color) }}>
    <header className="team-hero">
      <Link className="team-breadcrumb" href="/historia">← Archivo histórico</Link>
      <div className="team-hero-main">
        <TeamBadge name={entity.name} color={color} logo={logo} size="lg" />
        <div>
          <h1>{entity.name}</h1>
          <p className="team-hero-meta">{[entity.fullName !== entity.name ? entity.fullName : null, entity.country, entity.firstSeason === entity.lastSeason ? `${entity.firstSeason}` : `${entity.firstSeason}–${entity.lastSeason}`].filter(Boolean).join(" · ")}</p>
        </div>
      </div>
      <dl className="team-hero-stats">
        <a href="#resultados"><dt>Grandes Premios</dt><dd>{number(stats.races)}</dd></a>
        <a href="#victorias"><dt>Victorias</dt><dd>{number(stats.wins)}</dd></a>
        <a href="#resultados"><dt>Podios</dt><dd>{number(stats.podiums)}</dd></a>
        <a href="#resultados"><dt>Poles</dt><dd>{number(stats.poles)}</dd></a>
        <a href="#momentos"><dt>Títulos</dt><dd>{constructorTitles.length + driverTitles.length}</dd></a>
      </dl>
      {constructorTitles.length || driverTitles.length ? <div className="team-titles">
        {constructorTitles.length ? <p><span>Constructores</span>{constructorTitles.map(y => <Link key={y} prefetch={false} href={`/historia/seasons/${y}`}>{y}</Link>)}</p> : null}
        {driverTitles.length ? <p><span>Solo pilotos</span>{driverTitles.map(y => <Link key={y} prefetch={false} href={`/historia/seasons/${y}`}>{y}</Link>)}</p> : null}
      </div> : null}
    </header>

    <nav className="team-nav" aria-label="Secciones de la historia">{sections.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}<Link href="/historia">Todo el archivo →</Link></nav>

    {lineage ? <LineageExplorer base={lineage.base} steps={lineage.steps} current={lineage.current} /> : null}

    <section id="historia" className="team-section team-story-section">
      <h2>La historia de {entity.name}</h2>
      <div className="team-story-layout">
        <div className="team-story">{entity.narrative.map((paragraph, i) => <LinkedNarrative key={i} text={paragraph} targets={unique} counts={counts} />)}</div>
        <aside className="team-facts">
          {moments.filter(m => /Primera inscripción|Primera victoria|Primer título|Última participación/.test(m.label)).map(m => <div key={m.label}>
            <span>{m.label.replace(" del archivo", "")}</span>
            <strong><Link prefetch={false} href={`/historia/seasons/${m.season}`}>{m.season}</Link></strong>
            <small>{m.event}</small>
          </div>)}
          <div><span>Pilotos</span><strong><a href="#conexiones">{stats.drivers}</a></strong><small>en {stats.seasons} {stats.seasons === 1 ? "temporada" : "temporadas"}</small></div>
        </aside>
      </div>
    </section>

    {winners.length ? <section id="victorias" className="team-section">
      <h2>Sus {number(stats.wins)} {stats.wins === 1 ? "victoria" : "victorias"}</h2>
      <p className="team-lead">Quiénes ganaron con {entity.name}{bestSeason?.wins ? <>, y su mejor año: <Link prefetch={false} href={`/historia/seasons/${bestSeason.season}`}>{bestSeason.season}</Link>, con {bestSeason.wins} {bestSeason.wins === 1 ? "triunfo" : "triunfos"}</> : null}.</p>
      <ol className="team-winners">
        {winners.map((d, i) => <li key={d.id}>
          <Link prefetch={false} href={d.href}>
            <span className="team-winner-rank">{i + 1}</span>
            <span className="team-winner-face" aria-hidden="true"><FallbackImage sources={photoOf(d.id)} alt="" fallback={monogram(d.name)} /></span>
            <span className="team-winner-name"><strong>{d.name}</strong><small>{d.firstSeason === d.lastSeason ? d.firstSeason : `${d.firstSeason}–${d.lastSeason}`} · {d.races} GP</small></span>
            <span className="team-winner-wins"><b>{d.wins}</b><small>{d.wins === 1 ? "victoria" : "victorias"}</small></span>
            <span className="team-winner-bar"><span style={{ width: `${d.wins / winners[0].wins * 100}%` }} /></span>
          </Link>
        </li>)}
      </ol>
      {engineWinners.length ? <p className="team-engines"><span>Motores ganadores</span>{engineWinners.map(e => <Link key={e.id} prefetch={false} href={e.href}>{e.name} <b>{e.wins}</b></Link>)}</p> : null}
    </section> : null}

    <section id="resultados" className="team-section">
      <h2>Temporada a temporada</h2>
      <HistoryCharts seasons={entity.seasons} ratings={entity.ratingHistory} />
    </section>

    <section id="momentos" className="team-section">
      <h2>Momentos clave</h2>
      <ol className="team-moments">{moments.map((m, i) => <li key={i}>
        <Link prefetch={false} href={`/historia/seasons/${m.season}`} className="team-moment-year">{m.season}</Link>
        <strong>{m.label.replace(" del archivo", "")}</strong>
        <span>{tidy(m.event)}</span>
      </li>)}</ol>
    </section>

    {cars.length ? <section id="autos" className="team-section">
      <h2>Todos sus autos</h2>
      <p className="team-lead">Los {cars.length} chasis que {entity.name} inscribió en el campeonato, en orden. Cada tarjeta abre la ficha del modelo.</p>
      <TeamCarIndex cars={cars} color={color} />
    </section> : null}

    <section id="conexiones" className="team-section">
      <h2>Pilotos, motores y circuitos</h2>
      <div className="history-connections team-connections">{entity.relations.map(group => <details key={group.category} ><summary>{historyCategories[group.category]} <span>{group.items.length}</span></summary><div className="history-table-scroll"><table><thead><tr><th>Nombre</th><th>Etapa</th><th>GP compartidos</th><th>Victorias conjuntas</th></tr></thead><tbody>{group.items.map(item => <tr key={item.id}><td><Link prefetch={false} href={item.href}>{item.name} →</Link></td><td>{item.firstSeason}–{item.lastSeason}</td><td>{item.races}</td><td>{item.wins}</td></tr>)}</tbody></table></div></details>)}</div>
    </section>

    <section id="fuentes" className="team-section team-sources">
      <h2>Fuentes</h2>
      <Suspense fallback={<p className="team-note">Consultando Wikipedia…</p>}><TeamWikipedia entity={entity} /></Suspense>
      <p className="team-note">Resultados de <a href="https://github.com/f1db/f1db" target="_blank" rel="noreferrer">F1DB (CC BY 4.0)</a>, contrastados con <a href={entity.sources.statsf1} target="_blank" rel="noreferrer">StatsF1</a> y <a href={entity.sources.wikipedia} target="_blank" rel="noreferrer">Wikipedia</a>. Archivo hasta diciembre de 2025. Victorias y podios se cuentan una vez por auto y carrera; una inscripción puede terminar sin largar, por eso inscripciones ({number(stats.entries)}) y largadas ({number(stats.starts)}) difieren.</p>
      <Link className="team-note-link" href="/historia#metodologia">Cobertura, metodología y limitaciones →</Link>
    </section>
  </div>;
}
