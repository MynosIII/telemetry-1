import Link from "next/link";
import { formatDelta, type RaceReport } from "@/lib/race-report";

/** The post-race report on the home page: our finish-against-grid ranking plus the headlines. */
export function HomeRaceReport({ report }: { report: RaceReport }) {
  const ranked = report.expectation.filter(r => r.delta !== null);
  const above = ranked.filter(r => r.delta! > 0).slice(0, 5);
  const below = ranked.filter(r => r.delta! < 0).slice(-3).reverse();
  const winner = report.stats.find(s => s.label === "Ganador");
  const passer = report.overtakes.rows[0];
  const href = `/informe/${report.slug}`;
  const row = (r: (typeof ranked)[number]) => <li key={r.driverId}>
    <Link href={`/pilotos/${r.driverId}`} prefetch={false}>{r.name}</Link>
    <span>{r.grid ? `P${r.grid}` : "Boxes"} → P{r.finish} · esperado P{r.expected}</span>
    <b className={r.delta! > 0 ? "is-up" : "is-down"}>{formatDelta(r.delta)}</b>
  </li>;

  return <section className="home-report" aria-labelledby="home-report-title">
    <header className="home-report-head">
      <h2 id="home-report-title"><Link href={href}>Informe: {report.name}</Link></h2>
      <p>Quién terminó por encima de lo que su lugar de largada hacía esperar{report.gridSource !== "official" ? " (provisorio, con la grilla todavía sin publicar)" : ""}.</p>
    </header>
    <div className="home-report-body">
      <div className="home-report-ranking">
        <h3>Por encima de lo esperado</h3>
        <ol>{above.map(row)}</ol>
        {below.length ? <><h3>Por debajo</h3><ol>{below.map(row)}</ol></> : null}
      </div>
      <div className="home-report-facts">
        {winner ? <p><small>Ganador</small>{winner.value} <span>{winner.detail}</span></p> : null}
        {passer?.made ? <p><small>Más adelantamientos</small>{passer.name} <span>{passer.made} de {report.overtakes.total}</span></p> : null}
        {report.records.length ? <ul>{report.records.slice(0, 3).map(text => <li key={text}>{text}</li>)}</ul> : null}
        {report.curiosities[0] ? <p className="home-report-trivia">{report.curiosities[0]}</p> : null}
        <div className="home-report-links">
          <Link href={href}>Informe completo →</Link>
          <a href={`/api/informe/${report.round}/imagen`} target="_blank" rel="noreferrer">Imagen para compartir</a>
        </div>
      </div>
    </div>
  </section>;
}
