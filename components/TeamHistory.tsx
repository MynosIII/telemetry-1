import { EntityFlag } from "./EntityFlag";
import { Suspense } from "react";
import Link from "next/link";
import { HistoryCharts } from "./HistoryCharts";
import { LinkedNarrative, tidy, type NarrativeTarget } from "./LinkedNarrative";
import { LineageExplorer, type LineageView } from "./LineageExplorer";
import { TeamBadge } from "./TeamBadge";
import { FallbackImage } from "./FallbackImage";
import { driverPhoto } from "@/lib/driver-photos";
import eloRatings from "@/lib/elo-ratings.json";
import { TeamCarIndex, type TeamCar } from "./TeamCarIndex";
import { historyCategories, type HistoryEntity } from "@/lib/history";
import { getWikipediaHistory } from "@/lib/wikipedia-history";
import { inkFor } from "@/lib/team-lineage";
import { getCountryFlagUrl } from "@/lib/circuit-visuals";
import { translate } from "@/lib/dictionary";
import { SocialLinks } from "./SocialLinks";

const number = (value: number) => value.toLocaleString("es-AR");
const photoOf = (id: string) => { const url = driverPhoto(id); return url ? [url] : []; };
const monogram = (name: string) => name.split(" ").filter(Boolean).map(part => part[0]).slice(0, 2).join("");

async function TeamWikipedia({ entity }: { entity: HistoryEntity }) {
  const context = await getWikipediaHistory(entity.sources.wikipediaTitle);
  if (!context) return null;
  return <div className="team-wiki">
    {context.facts.length ? <dl>{context.facts.map((f, i) => <div key={`${f.label}/${i}`}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}</dl> : null}
    {context.sections.length ? <div className="team-wiki-chapters"><span>Capítulos en Wikipedia:</span>{context.sections.map(s => <a href={s.url} key={s.url} target="_blank" rel="noreferrer">{s.title} ↗</a>)}</div> : null}
  </div>;
}

export function TeamHistory({ entity, color, logo, cars, lineage }: {
  entity: HistoryEntity; color: string; logo: string | null; cars: TeamCar[];
  lineage: { base: string; steps: LineageView[]; current: number } | null;
}) {
  const stats = entity.stats;
  const drivers = entity.relations.find(group => group.category === "drivers")?.items ?? [];
  const engines = entity.relations.find(group => group.category === "engines")?.items ?? [];
  const allWinners = drivers.filter(d => d.wins > 0).sort((a, b) => b.wins - a.wins || a.firstSeason - b.firstSeason);
  const winners = allWinners.slice(0, 9), moreWinners = allWinners.slice(9);
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

  // The header already carries totals and title years, so the story keeps only what it adds.
  const story = entity.narrative.filter(p => !/^(Sus participantes acumularon|El campeonato de constructores se ganó en)/.test(p));
  if (story.length > 2 && / aparece como constructor en /.test(story[0])) story.shift();
  const top = allWinners[0]?.wins ?? 1;
  type Rating = { name: string; careerRating: number; sustainedPrime: number | null; peakRating: number | null; peakSeason: number | null; expectedWins: number | null; observedWins: number | null; winsAboveExpected: number | null };
  const ratings = eloRatings as Record<string, Rating>;
  const rated = drivers.filter(d => ratings[d.id]).map(d => ({ ...d, elo: ratings[d.id] })).sort((a, b) => b.elo.careerRating - a.elo.careerRating);
  const eloTop = rated.slice(0, 10);
  const eloMax = eloTop[0]?.elo.careerRating ?? 2000, eloMin = Math.floor(((eloTop.at(-1)?.elo.careerRating ?? 1400) - 60) / 50) * 50;
  const winnerCard = (d: typeof allWinners[number], i: number) => <li key={d.id}>
    <Link prefetch={false} href={d.href}>
      <span className="team-winner-rank">{i + 1}</span>
      <span className="team-winner-face" aria-hidden="true"><FallbackImage sources={photoOf(d.id)} alt="" fallback={monogram(d.name)} /></span>
      <span className="team-winner-name"><strong>{d.name}</strong><small>{d.firstSeason === d.lastSeason ? d.firstSeason : `${d.firstSeason}–${d.lastSeason}`} · {d.races} GP</small></span>
      <span className="team-winner-wins"><b>{d.wins}</b><small>{d.wins === 1 ? "victoria" : "victorias"}</small></span>
      <span className="team-winner-bar"><span style={{ width: `${d.wins / top * 100}%` }} /></span>
    </Link>
  </li>;

  const sections = [["historia", "Historia"], ...(winners.length ? [["victorias", "Victorias"]] : []), ...(rated.length ? [["modelo", "Modelo v7.6"]] : []), ["resultados", "Resultados"], ...(cars.length ? [["autos", "Autos"]] : []), ["conexiones", "Conexiones"], ["fuentes", "Fuentes"]];

  return <div className="team-history" style={{ ["--team" as string]: color, ["--team-ink" as string]: inkFor(color) }}>
    <header className="team-hero">
      <nav className="archive-crumb" aria-label="Ruta"><Link href="/historia">Estadísticas</Link><span>/</span><span>Constructores</span></nav>
      <div className="team-hero-main">
        <TeamBadge name={entity.name} color={color} logo={logo} size="lg" />
        <div>
          <h1>{entity.name}</h1>
          <SocialLinks category="constructors" sourceId={entity.sourceId} name={entity.name} />
          <p className="team-hero-meta">{entity.country && getCountryFlagUrl(entity.country) ? <img className="history-flag-inline" src={getCountryFlagUrl(entity.country)} alt="" width={16} height={11} /> : null}{[entity.fullName !== entity.name ? entity.fullName : null, entity.country ? translate(entity.country, "countries") : null, entity.firstSeason === entity.lastSeason ? `${entity.firstSeason}` : `${entity.firstSeason}–${entity.lastSeason}`].filter(Boolean).join(" · ")}</p>
        </div>
      </div>
      <dl className="archive-figures">
        <div><dt>Grandes Premios</dt><dd>{number(stats.races)}</dd></div>
        <div><dt>Victorias</dt><dd>{number(stats.wins)}</dd></div>
        <div><dt>Podios</dt><dd>{number(stats.podiums)}</dd></div>
        <div><dt>Poles</dt><dd>{number(stats.poles)}</dd></div>
        <div><dt>Pilotos</dt><dd>{number(stats.drivers)}</dd></div>
      </dl>
      {constructorTitles.length || driverTitles.length ? <div className="team-titles">
        {constructorTitles.length ? <p><span>{constructorTitles.length} {constructorTitles.length === 1 ? "título" : "títulos"} de constructores</span>{constructorTitles.map(y => <Link key={y} prefetch={false} href={`/historia/seasons/${y}`}>{y}</Link>)}</p> : null}
        {driverTitles.length ? <p><span>Otros {driverTitles.length === 1 ? "año" : "años"} con campeón de pilotos</span>{driverTitles.map(y => <Link key={y} prefetch={false} href={`/historia/seasons/${y}`}>{y}</Link>)}</p> : null}
      </div> : null}
    </header>

    <nav className="team-nav" aria-label="Secciones de la historia">{sections.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}<Link href="/historia">Todo el archivo →</Link></nav>

    {lineage ? <LineageExplorer base={lineage.base} steps={lineage.steps} current={lineage.current} /> : null}

    <section id="historia" className="team-section team-story-section">
      <h2>La historia de {entity.name}</h2>
      <div className="team-story-layout">
        <div className="team-story">{story.map((paragraph, i) => <LinkedNarrative key={i} text={paragraph} targets={unique} counts={counts} />)}</div>
        <aside className="team-moments" aria-labelledby="momentos"><h3 id="momentos">Momentos</h3><ol>{moments.map((m, i) => <li key={i}>
          <Link prefetch={false} href={`/historia/seasons/${m.season}`} className="team-moment-year">{m.season}</Link>
          <span><strong>{m.label.replace(" del archivo", "")}</strong><small>{tidy(m.event)}</small></span>
        </li>)}</ol></aside>
      </div>
    </section>

    {winners.length ? <section id="victorias" className="team-section">
      <h2>Sus {number(stats.wins)} {stats.wins === 1 ? "victoria" : "victorias"}</h2>
      <p className="team-lead">Quiénes ganaron con {entity.name}{bestSeason?.wins ? <>, y su mejor año: <Link prefetch={false} href={`/historia/seasons/${bestSeason.season}`}>{bestSeason.season}</Link>, con {bestSeason.wins} {bestSeason.wins === 1 ? "triunfo" : "triunfos"}</> : null}.</p>
      <ol className="team-winners">{winners.map((d, i) => winnerCard(d, i))}</ol>
      {moreWinners.length ? <details className="team-more-winners">
        <summary>Ver {moreWinners.length === 1 ? "el otro ganador" : `los otros ${moreWinners.length} ganadores`}</summary>
        <ol className="team-winners" start={10}>{moreWinners.map((d, i) => winnerCard(d, i + 9))}</ol>
      </details> : null}
      {engineWinners.length ? <p className="team-engines"><span>Motores ganadores</span>{engineWinners.map(e => <Link key={e.id} prefetch={false} href={e.href}>{e.name} <b>{e.wins}</b></Link>)}</p> : null}
    </section> : null}

    {rated.length ? <section id="modelo" className="team-section">
      <h2>Sus pilotos según el modelo</h2>
      <p className="team-lead">ELO retrospectivo de TelemetryOne v7.6: mide a cada piloto contra sus rivales y su auto, carrera por carrera. Los {eloTop.length} mejores de {rated.length}, con cifras de toda su carrera.</p>
      <ol className="team-elo">{eloTop.map((d, i) => <li key={d.id}>
        <Link prefetch={false} href={d.href}>
          <span className="team-winner-rank">{i + 1}</span>
          <span className="team-elo-name"><strong>{d.name}</strong><small>{d.firstSeason === d.lastSeason ? d.firstSeason : `${d.firstSeason}–${d.lastSeason}`} con {entity.name}{d.elo.peakSeason ? ` · pico en ${d.elo.peakSeason}` : ""}</small></span>
          <span className="team-elo-bar"><span style={{ width: `${Math.max(4, (d.elo.careerRating - eloMin) / (eloMax - eloMin) * 100)}%` }} /></span>
          <span className="team-elo-value"><b>{Math.round(d.elo.careerRating)}</b><small>ELO</small></span>
          <span className="team-elo-xw">{d.elo.observedWins !== null && d.elo.expectedWins !== null ? <><b className={(d.elo.winsAboveExpected ?? 0) >= 0 ? "is-up" : "is-down"}>{(d.elo.winsAboveExpected ?? 0) >= 0 ? "+" : ""}{(d.elo.winsAboveExpected ?? 0).toFixed(1)}</b><small>{d.elo.observedWins} victorias · {d.elo.expectedWins.toFixed(1)} esperadas</small></> : null}</span>
        </Link>
      </li>)}</ol>
      <Link className="team-note-link" href="/ranking">Ver el ranking completo →</Link>
    </section> : null}

    <section id="resultados" className="team-section">
      <h2>Temporada a temporada</h2>
      <HistoryCharts seasons={entity.seasons} ratings={entity.ratingHistory} />
    </section>

    {cars.length ? <section id="autos" className="team-section">
      <h2>Sus {cars.length} autos</h2>
      <TeamCarIndex cars={cars} color={color} />
    </section> : null}

    <section id="conexiones" className="team-section">
      <h2>Conexiones</h2>
      <div className="history-connections team-connections">{entity.relations.map(group => <details key={group.category} ><summary>{historyCategories[group.category]} <span>{group.items.length}</span></summary><div className="history-table-scroll"><table><thead><tr><th>Nombre</th><th>Etapa</th><th>GP compartidos</th><th>Victorias conjuntas</th></tr></thead><tbody>{group.items.map(item => <tr key={item.id}><td><EntityFlag href={item.href} /><Link prefetch={false} href={item.href}>{item.name} ↗</Link></td><td>{item.firstSeason}–{item.lastSeason}</td><td>{item.races}</td><td>{item.wins}</td></tr>)}</tbody></table></div></details>)}</div>
    </section>

    <section id="fuentes" className="team-section team-sources">
      <h2>Fuentes</h2>
      <Suspense fallback={null}><TeamWikipedia entity={entity} /></Suspense>
      <p className="team-note">Resultados de <a href="https://github.com/f1db/f1db" target="_blank" rel="noreferrer">F1DB (CC BY 4.0)</a> hasta diciembre de 2025, contrastados con <a href={entity.sources.statsf1} target="_blank" rel="noreferrer">StatsF1</a> y <a href={entity.sources.wikipedia} target="_blank" rel="noreferrer">Wikipedia</a>. ELO y victorias esperadas: <Link href="/ranking">TelemetryOne v7.6</Link>, investigación propia. Victorias y podios se cuentan una vez por auto y carrera. <Link href="/historia#metodologia">Criterios de conteo →</Link></p>
    </section>
  </div>;
}
