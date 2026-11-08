import Link from "next/link";
import { formatDelta, type RaceReport as Report } from "@/lib/race-report";

const longDate = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const tone = (delta: number | null) => delta === null ? "" : delta >= 1 ? "is-up" : delta <= -1 ? "is-down" : "";

export function RaceReport({ report }: { report: Report }) {
  const { method } = report;
  const image = `/api/informe/${report.round}/imagen`;
  const classified = report.expectation.filter(r => r.delta !== null);
  const out = report.expectation.filter(r => r.delta === null);
  const overtakes = report.overtakes.rows.filter(r => r.made || r.suffered).slice(0, 10);

  return <div className="ency-page-wrap race-report">
    <header className="ency-title">
      <nav className="ency-breadcrumb" aria-label="Ruta"><Link href="/temporada">Temporada {report.season}</Link><span>/</span><Link href={`/carreras/${report.round}`}>{report.name}</Link><span>/</span><span>Informe</span></nav>
      <h1>{report.name}: quién rindió más de lo esperado</h1>
      <p className="ency-subtitle">Ronda {report.round} · {report.circuit} · {longDate(report.date)} · {report.laps} vueltas</p>
      {report.gridSource !== "official" ? <p className="race-report-provisional">Provisorio: la grilla oficial todavía no se publicó, así que se usa {report.gridSource === "starting-grid" ? "la grilla de largada de OpenF1" : "el orden de la clasificación (sin penalizaciones)"}. Se actualiza solo.</p> : null}
      <p className="race-report-share"><a href={image} target="_blank" rel="noreferrer">Imagen para compartir</a></p>
    </header>

    <section className="race-report-section">
      <h2>Llegada contra largada</h2>
      <p className="race-report-lead">La clasificación oficial solo ordena la llegada. Acá cada piloto se mide contra lo que su lugar de largada hacía esperar, descontando los puestos que regalan los abandonos.</p>
      <div className="race-report-scroll">
        <table className="race-report-table">
          <thead><tr><th>Piloto</th><th>Largó</th><th>Esperado</th><th>Llegó</th><th>Diferencia</th></tr></thead>
          <tbody>
            {classified.map(r => <tr key={r.driverId}>
              <td><Link href={`/pilotos/${r.driverId}`} prefetch={false}>{r.name}</Link><small>{r.team}{r.retiredAhead ? ` · ${r.retiredAhead} ${r.retiredAhead === 1 ? "abandono" : "abandonos"} delante` : ""}</small></td>
              <td>{r.grid ? `P${r.grid}` : "Boxes"}</td>
              <td>P{r.expected}</td>
              <td>P{r.finish}</td>
              <td className={`race-report-delta ${tone(r.delta)}`}>{formatDelta(r.delta)}</td>
            </tr>)}
            {out.map(r => <tr key={r.driverId} className="is-out">
              <td><Link href={`/pilotos/${r.driverId}`} prefetch={false}>{r.name}</Link><small>{r.team}</small></td>
              <td>{r.grid ? `P${r.grid}` : "Boxes"}</td>
              <td colSpan={3}>{r.status || "No clasificado"}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>

    {overtakes.length ? <section className="race-report-section">
      <h2>Adelantamientos</h2>
      <p className="race-report-lead">{report.overtakes.total} en total. {report.overtakes.source === "openf1"
        ? "Contados por OpenF1 en pista."
        : "Estimados vuelta a vuelta: cuentan los cambios de posición en pista, sin paradas ni abandonos. No incluye la primera vuelta."}</p>
      <div className="race-report-scroll">
        <table className="race-report-table race-report-overtakes">
          <thead><tr><th>Piloto</th><th>Hechos</th><th>Recibidos</th></tr></thead>
          <tbody>{overtakes.map(r => <tr key={r.driverId}>
            <td>{r.name}<small>{r.team}</small></td><td>{r.made}</td><td>{r.suffered}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </section> : null}

    <section className="race-report-section">
      <h2>Estadísticas</h2>
      <dl className="race-report-stats">{report.stats.map(s => <div key={s.label}>
        <dt>{s.label}</dt><dd><strong>{s.value}</strong>{s.detail ? <span>{s.detail}</span> : null}</dd>
      </div>)}</dl>
    </section>

    {report.records.length ? <section className="race-report-section">
      <h2>Récords y marcas</h2>
      <ul className="race-report-list">{report.records.map(text => <li key={text}>{text}</li>)}</ul>
    </section> : null}

    {report.curiosities.length ? <section className="race-report-section">
      <h2>Datos que no le importan a nadie</h2>
      <ul className="race-report-list">{report.curiosities.map(text => <li key={text}>{text}</li>)}</ul>
    </section> : null}

    <details className="ency-method race-report-method"><summary>Cómo se calcula lo esperado</summary>
      <p>Primero se sacan los autos que no terminaron: quien largó décimo con tres abandonos delante parte, en los hechos, séptimo. Después se aplica lo que pasó en {method.races} carreras de {method.from} a {method.to} ({method.finishers.toLocaleString("es-AR")} llegadas): la mediana dice que los dos últimos de esa fila suelen ganar dos puestos, los dos siguientes uno, y el resto termina donde largó.</p>
      <p>Probado con 2024 y 2025 sin usarlos para calcularlo, el error medio es de {method.validation.maeModel.toLocaleString("es-AR")} puestos por piloto, contra {method.validation.maeRawGrid.toLocaleString("es-AR")} si se toma la grilla tal cual.</p>
      <p>Resultados de Jolpica (FIA). Récords comparados con el archivo 1950–{method.to} más lo corrido de esta temporada.</p>
    </details>
  </div>;
}
