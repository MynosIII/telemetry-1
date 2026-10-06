import { Suspense } from "react";
import Link from "next/link";
import { HistoryCharts } from "./HistoryCharts";
import { historyCategories, type HistoryEntity } from "@/lib/history";
import { tidyNarrative } from "@/lib/text";
import { getWikipediaHistory } from "@/lib/wikipedia-history";
import { CircuitLayoutFigure } from "./ArchiveImages";
import { LAYOUT_CREDIT, layoutDrawing, layoutSeasons } from "@/lib/circuit-layouts";

const number = (value: number) => value.toLocaleString("es-AR");

async function WikipediaContext({ entity }: { entity: HistoryEntity }) {
  const context = await getWikipediaHistory(entity.sources.wikipediaTitle);
  if (!context || (!context.facts.length && !context.sections.length)) return null;
  return <div className="history-wikipedia">
    <h3>En Wikipedia</h3>
    {context.facts.length ? <dl className="history-facts">{context.facts.map((f, i) => <div key={`${f.label}/${i}`}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}</dl> : null}
    {context.sections.length ? <div className="history-reading">{context.sections.map(s => <a href={s.url} key={s.url} target="_blank" rel="noreferrer">{s.title} ↗</a>)}</div> : null}
    <p className="history-note"><a href={context.revisionUrl ?? context.url} target="_blank" rel="noreferrer">Revisión consultada ↗</a>{context.wikidataUrl ? <> · <a href={context.wikidataUrl} target="_blank" rel="noreferrer">Wikidata ↗</a></> : null}</p>
  </div>;
}

export function HistoryDossier({ entity }: { entity: HistoryEntity }) {
  const driver = entity.category === "drivers";
  const layouts = entity.biography.layouts ?? [];
  const drawn = layouts.filter(l => layoutDrawing(l.id));
  return <article className="history-dossier">
    <nav className="history-profile-nav" aria-label="Secciones de la ficha"><a href="#historia">Historia</a>{drawn.length ? <a href="#trazados">Trazados</a> : null}<a href="#evolucion">Resultados</a><a href="#hitos">Momentos</a><a href="#conexiones">Conexiones</a><a href="#fuentes">Fuentes</a><Link href="/historia">Todo el archivo →</Link></nav>
    <section id="historia" className="history-section">
      <div className="detail-heading"><h2>La historia de {entity.name}</h2></div>
      <div className="history-story">{entity.narrative.filter(p => driver || !p.startsWith("Sus participantes acumularon")).map((paragraph, i) => <p key={i}>{tidyNarrative(paragraph)}</p>)}</div>
      {entity.editorialSources?.length ? <p className="history-note">Fuentes del relato: {entity.editorialSources.map((url, i) => <span key={url}>{i ? " · " : ""}<a href={url} target="_blank" rel="noreferrer">{new URL(url).hostname.includes("statsf1") ? "StatsF1" : `Wikipedia · ${decodeURIComponent(new URL(url).pathname.split("/wiki/")[1] ?? "").replaceAll("_", " ")}`} ↗</a></span>)}</p> : null}
      <Suspense fallback={null}><WikipediaContext entity={entity} /></Suspense>
    </section>
    {drawn.length ? <section id="trazados" className="history-section"><div className="detail-heading"><h2>{drawn.length > 1 ? `Los ${drawn.length} trazados` : "Trazado"}</h2></div>
      <div className="circuit-layout-grid">{drawn.map(l => <CircuitLayoutFigure key={l.id} layoutId={l.id} alt={`Trazado de ${entity.name}, ${layoutSeasons(l.id)}`}><b>{layoutSeasons(l.id)}</b><span>{l.length.toLocaleString("es-AR")} km · {l.turns} curvas</span></CircuitLayoutFigure>)}</div>
      <p className="history-note">Configuraciones de F1DB, en orden cronológico. Dibujos: <a href={LAYOUT_CREDIT.url} target="_blank" rel="noreferrer">{LAYOUT_CREDIT.label}</a>.</p>
    </section> : null}
    <section id="evolucion" className="history-section"><div className="detail-heading"><h2>Temporada a temporada</h2></div><HistoryCharts seasons={entity.seasons} ratings={entity.ratingHistory} />
      {entity.model?.model ? <div className="history-model-context"><h3>Resultados frente a expectativa</h3><dl className="archive-figures"><div><dt>Carreras del modelo</dt><dd>{number(entity.model.races ?? 0)}</dd></div><div><dt>Victorias observadas</dt><dd>{entity.model.model.observedWins ?? "—"}</dd></div><div><dt>Esperadas</dt><dd>{entity.model.model.expectedWins ?? "—"}</dd></div><div><dt>Diferencia</dt><dd>{entity.model.model.winsAboveExpected ?? "—"}</dd></div></dl><p className="history-note">El modelo reparte una victoria compartida entre sus pilotos, así que puede diferir del palmarés. <Link href="/ranking">Ver en el ranking →</Link></p></div> : <p className="history-note">{driver ? "El modelo v7.6 no tiene una estimación ELO para este piloto." : "Resultados conjuntos: no separan el aporte del piloto, el auto o el equipo."}</p>}
    </section>
    <section id="hitos" className="history-section"><div className="detail-heading"><h2>Momentos clave</h2></div><ol className="history-timeline">{entity.milestones.map((milestone, i) => <li key={i}><strong>{milestone.season}</strong><div><b>{milestone.label}</b><span>{tidyNarrative(`${milestone.event}${milestone.date ? ` · ${milestone.date}` : ""}`)}</span></div></li>)}</ol></section>
    <section id="conexiones" className="history-section"><div className="detail-heading"><h2>Conexiones</h2></div>
      {entity.raceResults?.length ? <details><summary>Resultados históricos completos · {entity.raceResults.length} registros</summary><p className="history-note">Clasificaciones de F1DB. Los registros de autos compartidos se conservan; las estadísticas agregadas se deduplican. DNF: abandono; DNS: no largó; DNQ/DNPQ: no clasificó; DSQ: descalificado; NC: no clasificado.</p><div className="history-table-scroll history-rating-data"><table><thead><tr><th>Año</th><th>Gran Premio</th><th>Constructor</th><th>Motor</th><th>Grilla</th><th>Resultado</th><th>Vueltas</th><th>Puntos de carrera</th><th>Estado</th></tr></thead><tbody>{entity.raceResults.map((r, i) => <tr key={`${r.season}/${r.round}/${i}`}><td>{r.season}</td><td><Link prefetch={false} href={`/historia/carreras/${r.season}/${r.round}`}>{r.event}</Link></td><td><Link prefetch={false} href={`/historia/constructors/${r.constructorId}`}>{r.constructorId}</Link></td><td>{r.engineId ? <Link prefetch={false} href={`/historia/engines/${r.engineId}`}>{r.engineId}</Link> : "—"}</td><td>{r.grid ?? "—"}</td><td>{r.position ?? r.status}{r.shared ? " · compartido" : ""}</td><td>{r.laps ?? "—"}</td><td>{r.points}</td><td>{r.retired ?? (r.fastest ? "Vuelta rápida" : "—")}</td></tr>)}</tbody></table></div></details> : null}
      <div className="history-connections">{entity.relations.map(group => <details key={group.category} open={group.category === "constructors" || (entity.category === "constructors" && group.category === "engines")}><summary>{historyCategories[group.category]} <span>{group.items.length}</span></summary><div className="history-table-scroll"><table><thead><tr><th>Nombre</th><th>Etapa</th><th>GP compartidos</th><th>Victorias conjuntas</th></tr></thead><tbody>{group.items.map(item => <tr key={item.id}><td><Link prefetch={false} href={item.href}>{item.name} →</Link></td><td>{item.firstSeason}–{item.lastSeason}</td><td>{item.races}</td><td>{item.wins}</td></tr>)}</tbody></table></div></details>)}</div>
      {entity.model?.teammates?.length ? <details className="history-teammates"><summary>Comparación con compañeros · muestra elegible del modelo</summary><p className="history-note">Sólo carreras elegibles para rating en v7.6; puede excluir abandonos mecánicos. «Delante» es un conteo dentro de esas carreras.</p><div className="history-table-scroll"><table><thead><tr><th>Compañero</th><th>GP elegibles</th><th>Delante en carrera</th><th>Delante en clasificación</th><th>Ventaja ELO media</th></tr></thead><tbody>{entity.model.teammates.map(m => <tr key={m.id}><td><Link prefetch={false} href={`/pilotos/${m.id}`}>{m.name} →</Link></td><td>{m.races}</td><td>{m.finishWins}</td><td>{m.qualifyingWins}</td><td>{m.averageRatingEdge > 0 ? "+" : ""}{m.averageRatingEdge}</td></tr>)}</tbody></table></div></details> : null}
      {entity.engineSpecs?.length ? <details><summary>Catálogo técnico de motores · {entity.engineSpecs.length} variantes</summary><p className="history-note">Catálogo de F1DB. La lista de variantes no implica que todas estén cubiertas por las temporadas mostradas.</p><div className="history-table-scroll"><table><thead><tr><th>Motor</th><th>Litros</th><th>Configuración</th><th>Aspiración</th></tr></thead><tbody>{entity.engineSpecs.map(e => <tr key={String(e.id)}><td>{e.fullName}</td><td>{e.capacity ?? "—"}</td><td>{e.configuration ?? "—"}</td><td>{e.aspiration ?? "—"}</td></tr>)}</tbody></table></div></details> : null}
      {layouts.length > drawn.length ? <details><summary>Configuraciones históricas del circuito</summary><div className="history-table-scroll"><table><thead><tr><th>Configuración</th><th>Longitud</th><th>Curvas</th></tr></thead><tbody>{layouts.map(l => <tr key={l.id}><td>{l.id}</td><td>{l.length} km</td><td>{l.turns}</td></tr>)}</tbody></table></div></details> : null}
    </section>
    <section id="fuentes" className="history-section history-sources"><h3>Fuentes</h3>
      <p className="history-note">Resultados de <a target="_blank" rel="noreferrer" href="https://github.com/f1db/f1db">F1DB (CC BY 4.0)</a> hasta diciembre de 2025, contrastados con <a target="_blank" rel="noreferrer" href={entity.sources.statsf1}>StatsF1</a> y <a target="_blank" rel="noreferrer" href={entity.sources.wikipedia}>Wikipedia</a>. ELO y victorias esperadas: <Link href="/ranking">TelemetryOne v7.6</Link>, investigación propia. {driver ? "Un auto compartido cuenta una vez por piloto y GP." : "Victorias y podios se cuentan una vez por auto y carrera."} Las salidas P1 son posiciones de grilla y pueden diferir de las poles oficiales.</p>
      <Link className="history-source-link" href="/historia#metodologia">Criterios de conteo →</Link>
    </section>
  </article>;
}
