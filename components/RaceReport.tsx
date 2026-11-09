import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { CircuitMap3D } from "@/components/CircuitMap3D";
import { layoutDrawing } from "@/lib/circuit-layouts";
import { getCircuitLayoutUrl } from "@/lib/circuit-visuals";
import { driverPhoto } from "@/lib/driver-photos";
import { formatDelta, type RaceReport as Report } from "@/lib/race-report";
import type { Lang, ReportTexts } from "@/lib/race-report-text";

const tone = (delta: number | null) => delta === null ? "" : delta >= 1 ? "is-up" : delta <= -1 ? "is-down" : "";

// Stat labels when Gemini has not translated the report.
const STAT_LABELS_EN: Record<string, string> = {
  "Ganador": "Winner", "Margen": "Margin", "Desde la pole": "From pole", "Vuelta rápida": "Fastest lap", "Paradas": "Pit stops",
  "Paso por boxes más corto": "Shortest pit pass", "Más adelantamientos": "Most overtakes", "Abandonos": "Retirements",
  "Vueltas lideradas": "Laps led", "Mejor primera vuelta": "Best first lap"
};

/** Turns every name the report knows (drivers, teams, races, record holders) into a link. */
export function Linked({ text, links }: { text: string; links: Record<string, string> }) {
  const names = Object.keys(links).filter(Boolean).sort((a, b) => b.length - a.length);
  if (!names.length) return <>{text}</>;
  const pattern = new RegExp(`(${names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
  const parts: ReactNode[] = text.split(pattern).map((part, i) => links[part]
    ? <Link key={i} href={links[part]} prefetch={false}>{part}</Link>
    : <Fragment key={i}>{part}</Fragment>);
  return <>{parts}</>;
}

export function RaceReport({ report, texts, lang = "es" }: { report: Report; texts: ReportTexts; lang?: Lang }) {
  const es = lang === "es";
  const t = (spanish: string, english: string) => es ? spanish : english;
  const raceName = es ? report.name : report.englishName;
  const { method, links } = report;
  const image = `/api/informe/${report.round}/imagen`;
  const classified = report.expectation.filter(r => r.score !== null);
  const out = report.expectation.filter(r => r.finish === null);
  const overtakes = report.overtakes.rows.filter(r => r.made || r.suffered).slice(0, 10);
  const winner = report.podium[0];
  const winnerPhoto = winner ? driverPhoto(winner.driverId) : null;
  // The same drawing the circuit pages use, served from this site.
  const layout = layoutDrawing(getCircuitLayoutUrl(report.circuitId)?.split("/").pop()?.replace(/\.svg$/, ""));
  const date = new Date(`${report.date}T12:00:00Z`).toLocaleDateString(es ? "es-AR" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const number = (n: number, d = 0) => n.toLocaleString(es ? "es-AR" : "en-GB", { maximumFractionDigits: d });

  return <div className="ency-page-wrap race-report">
    <header className="ency-title">
      <nav className="ency-breadcrumb" aria-label={t("Ruta", "Breadcrumb")}><Link href="/temporada">{t("Temporada", "Season")} {report.season}</Link><span>/</span><Link href={`/carreras/${report.round}`}>{raceName}</Link><span>/</span><span>{t("Informe", "Report")}</span></nav>
      <h1>{t(`Informe: ${report.name} ${report.season}`, `Report: ${report.season} ${raceName}`)}</h1>
      <p className="ency-subtitle">{t("Ronda", "Round")} {report.round} · <Link href={`/circuitos/${report.circuitId}`}>{report.circuit}</Link> · {date} · {report.laps} {t("vueltas", "laps")}</p>
      {report.gridSource !== "official" ? <p className="race-report-provisional">{t(
        `Provisorio: la grilla oficial todavía no se publicó, así que se usa ${report.gridSource === "starting-grid" ? "la grilla de largada de OpenF1" : "el orden de la clasificación (sin penalizaciones)"}. Se actualiza solo.`,
        `Provisional: the official grid is not out yet, so ${report.gridSource === "starting-grid" ? "OpenF1's starting grid" : "the qualifying order (without penalties)"} stands in. It updates itself.`)}</p> : null}
      <p className="race-report-share">
        {report.sessionKey ? <Link href={`/en-vivo/repeticion?sesion=${report.sessionKey}`}>{t("Ver la repetición", "Watch the replay")}</Link> : null}
        <Link href={`/carreras/${report.round}`}>{t("Resultado completo", "Full result")}</Link>
        <a href={image} target="_blank" rel="noreferrer">{t("Imagen para compartir", "Share image")}</a>
        <a href={`/api/informe/${report.round}/puntajes`} target="_blank" rel="noreferrer">{t("Imagen de puntajes", "Scores image")}</a>
      </p>
    </header>

    <section className="race-report-intro">
      <div className="race-report-summary">
        {texts.summary.map((p, i) => <p key={i}><Linked text={p} links={links} /></p>)}
        {texts.writer === "chatgpt" || texts.translator === "gemini" ? <p className="race-report-credit">{[
          texts.writer === "chatgpt" ? t("Texto redactado con ChatGPT a partir de los datos.", "Text drafted with ChatGPT from the data.") : "",
          texts.translator === "gemini" ? t("Traducción de Gemini.", "Translated by Gemini.") : ""
        ].filter(Boolean).join(" ")}</p> : null}
      </div>
      <div className="race-report-figures">
        {winnerPhoto && winner ? <figure>
          <img src={winnerPhoto} alt={winner.name} loading="lazy" />
          <figcaption><Link href={`/pilotos/${winner.driverId}`}>{winner.name}</Link>, {t("ganador", "winner")}</figcaption>
        </figure> : null}
        <figure className="race-report-layout">
          <CircuitMap3D circuitId={report.circuitId} fallback={layout} label={t(`Trazado de ${report.circuit}`, `${report.circuit} layout`)} />
          <figcaption><Link href={`/circuitos/${report.circuitId}`}>{report.circuit}</Link></figcaption>
        </figure>
      </div>
    </section>

    {report.results?.length ? <section className="race-report-section">
      <h2>{t("Resultado", "Result")}</h2>
      <div className="race-report-scroll">
        <table className="race-report-table race-report-results">
          <thead><tr><th>{t("Pos.", "Pos.")}</th><th>{t("Piloto", "Driver")}</th><th>{t("Tiempo", "Time")}</th><th>{t("Vueltas", "Laps")}</th><th>{t("Paradas", "Stops")}</th><th>{t("Adelant.", "Overtakes")}</th><th>{t("Puntos", "Points")}</th></tr></thead>
          <tbody>{report.results.map(r => <tr key={r.driverId} className={r.classified ? "" : "is-out"}>
            <td>{r.position}</td>
            <td><Link href={`/pilotos/${r.driverId}`} prefetch={false}>{r.name}</Link><small>{r.team}</small></td>
            <td>{r.time ?? (!es ? r.statusEn : r.status !== r.statusEn ? r.status : r.position === "DNS" ? "No largó" : r.position === "DSQ" ? "Descalificado" : r.classified ? r.status : "Abandono")}</td>
            <td>{r.laps}</td>
            <td>{r.stops}</td>
            <td>{r.overtakes ?? "—"}</td>
            <td>{r.points ? number(r.points, 1) : "—"}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </section> : null}

    {report.championship?.length ? <section className="race-report-section">
      <h2>{t("Campeonato", "Championship")}</h2>
      <p className="race-report-lead">{report.remainingRaces !== null
        ? t(`Así queda la tabla de pilotos, con ${report.remainingRaces} ${report.remainingRaces === 1 ? "carrera" : "carreras"} por delante.`, `The drivers' standings now, with ${report.remainingRaces} ${report.remainingRaces === 1 ? "race" : "races"} to go.`)
        : t("Así queda la tabla de pilotos.", "The drivers' standings now.")}</p>
      <div className="race-report-scroll">
        <table className="race-report-table race-report-championship">
          <thead><tr><th>{t("Pos.", "Pos.")}</th><th>{t("Piloto", "Driver")}</th><th>{t("Puntos", "Points")}</th><th>{t("En la carrera", "This race")}</th><th>{t("Movimiento", "Change")}</th></tr></thead>
          <tbody>{report.championship.map(r => {
            const moved = r.before === null ? null : r.before - r.position;
            return <tr key={r.driverId}>
              <td>{r.position}</td>
              <td><Link href={`/pilotos/${r.driverId}`} prefetch={false}>{r.name}</Link><small>{r.team}</small></td>
              <td>{number(r.points, 1)}</td>
              <td>{r.gained ? `+${number(r.gained, 1)}` : "—"}</td>
              <td className={`race-report-delta ${tone(moved)}`}>{moved === null ? (r.before === null && report.round > 1 ? t("Nuevo", "New") : "—") : moved > 0 ? `▲ ${moved}` : moved < 0 ? `▼ ${-moved}` : "="}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </section> : null}

    <section className="race-report-section">
      <h2>{t("Llegada contra largada", "Finish against grid")}</h2>
      <p className="race-report-lead">{t(
        "La clasificación oficial solo ordena la llegada. Acá cada piloto se mide contra lo que su lugar de largada hacía esperar, descontando los puestos que regalan los abandonos. El puntaje va de 0 a 10.",
        "The official classification only orders the finish. Here each driver is measured against what their grid slot predicted, after removing the places handed over by retirements. The score runs from 0 to 10.")}</p>
      <div className="race-report-scroll">
        <table className="race-report-table">
          <thead><tr><th>{t("Piloto", "Driver")}</th><th>{t("Largó", "Grid")}</th><th>{t("Esperado", "Expected")}</th><th>{t("Llegó", "Finish")}</th><th>{t("Diferencia", "Difference")}</th><th>{t("Puntaje", "Score")}</th></tr></thead>
          <tbody>
            {classified.map(r => <tr key={r.driverId}>
              <td><Link href={`/pilotos/${r.driverId}`} prefetch={false}>{r.name}</Link><small>{r.team}{r.retiredAhead ? ` · ${r.retiredAhead} ${t(r.retiredAhead === 1 ? "abandono delante" : "abandonos delante", r.retiredAhead === 1 ? "retirement ahead" : "retirements ahead")}` : ""}</small></td>
              <td>{r.grid ? `P${r.grid}` : t("Boxes", "Pit lane")}</td>
              <td>P{r.expected}</td>
              <td>P{r.finish}</td>
              <td className={`race-report-delta ${tone(r.gap)}`}>{formatDelta(r.gap)}</td>
              <td>{r.score !== null ? number(r.score, 2) : "—"}</td>
            </tr>)}
            {out.map(r => <tr key={r.driverId} className="is-out">
              <td><Link href={`/pilotos/${r.driverId}`} prefetch={false}>{r.name}</Link><small>{r.team}</small></td>
              <td>{r.grid ? `P${r.grid}` : t("Boxes", "Pit lane")}</td>
              <td colSpan={4}>{es ? r.status || "No clasificado" : "Not classified"}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>

    {overtakes.length ? <section className="race-report-section">
      <h2>{t("Adelantamientos", "Overtakes")}</h2>
      <p className="race-report-lead">{report.overtakes.total} {t("en total.", "in total.")} {report.overtakes.source === "openf1"
        ? t("Contados por OpenF1 en pista.", "Counted on track by OpenF1.")
        : t("Estimados vuelta a vuelta: cuentan los cambios de posición en pista, sin paradas ni abandonos. No incluye la primera vuelta.", "Estimated lap by lap from position changes on track, leaving out pit stops, retirements and the first lap.")}</p>
      <div className="race-report-scroll">
        <table className="race-report-table race-report-overtakes">
          <thead><tr><th>{t("Piloto", "Driver")}</th><th>{t("Hechos", "Made")}</th><th>{t("Recibidos", "Suffered")}</th></tr></thead>
          <tbody>{overtakes.map(r => <tr key={r.driverId}>
            <td><Link href={`/pilotos/${r.driverId}`} prefetch={false}>{r.name}</Link><small>{r.team}</small></td><td>{r.made}</td><td>{r.suffered}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </section> : null}

    <section className="race-report-section">
      <h2>{t("Estadísticas", "Statistics")}</h2>
      <dl className="race-report-stats">{texts.stats.map((s, i) => <div key={i}>
        <dt>{es || texts.translator === "gemini" ? s.label : STAT_LABELS_EN[s.label] ?? s.label}</dt>
        <dd><strong><Linked text={s.value} links={links} /></strong>{s.detail ? <span><Linked text={s.detail} links={links} /></span> : null}</dd>
      </div>)}</dl>
    </section>

    {texts.records.length ? <section className="race-report-section">
      <h2>{t("Récords y marcas", "Records and milestones")}</h2>
      <ul className="race-report-list">{texts.records.map((text, i) => <li key={i}><Linked text={text} links={links} /></li>)}</ul>
    </section> : null}

    {texts.curiosities.length ? <section className="race-report-section">
      <h2>{t("Curiosidades", "Trivia")}</h2>
      <ul className="race-report-list">{texts.curiosities.map((text, i) => <li key={i}><Linked text={text} links={links} /></li>)}</ul>
    </section> : null}

    <details className="ency-method race-report-method"><summary>{t("Cómo se calcula lo esperado", "How the expectation works")}</summary>
      {es ? <>
        <p>Primero se sacan los autos que no terminaron: quien largó décimo con tres abandonos delante parte, en los hechos, séptimo. Después se aplica lo que pasó en {method.races} carreras de {method.from} a {method.to} ({number(method.finishers)} llegadas): la mediana dice que los dos últimos de esa fila suelen ganar dos puestos, los dos siguientes uno, y el resto termina donde largó.</p>
        <p>Probado con 2024 y 2025 sin usarlos para calcularlo, el error medio es de {number(method.validation.maeModel, 2)} puestos por piloto, contra {number(method.validation.maeRawGrid, 2)} si se toma la grilla tal cual.</p>
        <p>Resultados de Jolpica (FIA) y OpenF1. Récords comparados con el archivo 1950–{method.to} más lo corrido de esta temporada.</p>
      </> : <>
        <p>First the cars that did not finish are removed: a driver who started tenth with three retirements ahead effectively starts seventh. Then comes what happened in {method.races} races from {method.from} to {method.to} ({number(method.finishers)} finishes): on median the last two of that order gain two places, the next two gain one, and everyone else finishes where they started.</p>
        <p>Tested on 2024 and 2025 without using them to build it, the mean error is {number(method.validation.maeModel, 2)} places per driver, against {number(method.validation.maeRawGrid, 2)} using the raw grid.</p>
        <p>Results from Jolpica (FIA) and OpenF1. Records compared with the 1950–{method.to} archive plus this season so far.</p>
      </>}
    </details>
  </div>;
}
