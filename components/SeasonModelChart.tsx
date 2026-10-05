"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArchiveReference } from "./ArchiveReference";
import type { SeasonModel, SeasonRace, StandingRow } from "@/lib/championship-history";
import { number, percent } from "@/lib/weekend-format";

const colors = ["#ce302c", "#2873b9", "#16897c", "#b27616", "#8251aa", "#53687b"];
const metrics = { points: "Puntos del campeonato", elo: "ELO retrospectivo", xw: "Victoria esperada · XW", xp: "Rendimiento esperado · XP", carWin: "Expectativa del auto" };
type Metric = keyof typeof metrics;
export function SeasonModelChart({ model, races, standings }: { model: SeasonModel[]; races: SeasonRace[]; standings: StandingRow[] }) {
  const options = [...standings.map(s => s.entity), ...model.map(s => s.driver)].filter((d, i, all) => all.findIndex(other => other.id === d.id) === i);
  const [selected, setSelected] = useState(options.slice(0, 3).map(d => d.id));
  const [metric, setMetric] = useState<Metric>("points");
  const id = useId();
  const series = selected.map(identity => {
    const driver = options.find(d => d.id === identity)!;
    const history = model.find(d => d.driver.id === identity)?.history;
    return { driver, points: races.flatMap(r => { const value = metric === "points" ? r.driverStandings.find(s => s.entity.id === identity)?.points : history?.find(h => h.round === r.round)?.[metric]; return value == null ? [] : [{ round: r.round, value, href: r.href, label: r.eventName }]; }) };
  });
  const values = series.flatMap(s => s.points.map(p => p.value));
  const probability = ["xw", "xp", "carWin"].includes(metric);
  const low = metric === "elo" && values.length ? Math.floor(Math.min(...values) / 50) * 50 : 0;
  // Round the top of the scale so the three gridlines land on readable values.
  const roundTo = metric === "elo" ? 50 : 20;
  const high = probability ? 1 : Math.ceil(Math.max(low + 1, ...values) / roundTo) * roundTo;
  const x = (round: number) => 54 + (round - 1) / Math.max(1, races.length - 1) * 710;
  const y = (value: number) => 225 - (value - low) / (high - low) * 195;
  return <div className="season-model-chart"><div className="ency-controls" aria-label="Métrica de evolución">{(Object.entries(metrics) as [Metric, string][]).map(([key, label]) => <button key={key} aria-pressed={metric === key} onClick={() => setMetric(key)}>{label}</button>)}</div><details className="ency-method"><summary>Elegir pilotos para comparar ({selected.length}/6)</summary><div className="driver-select">{options.map(driver => <label key={driver.id}><input type="checkbox" checked={selected.includes(driver.id)} disabled={!selected.includes(driver.id) && selected.length >= 6} onChange={() => setSelected(current => current.includes(driver.id) ? current.filter(d => d !== driver.id) : [...current, driver.id])} />{driver.name}</label>)}</div></details><figure><figcaption>{metrics[metric]} por Gran Premio</figcaption><svg viewBox="0 0 800 265" role="img" aria-labelledby={id}><title id={id}>{`${metrics[metric]} de ${series.map(s => s.driver.name).join(", ")}. Cada punto enlaza a su carrera. Datos disponibles en la tabla siguiente.`}</title>{[0, .5, 1].map(f => <g key={f}><line x1="54" x2="764" y1={225 - f * 195} y2={225 - f * 195} stroke="#d8dde4" /><text x="3" y={229 - f * 195}>{probability ? percent(low + f * (high - low)) : number(low + f * (high - low))}</text></g>)}{series.map((s, i) => {
    const segments: typeof s.points[] = [];
    s.points.forEach((point, index) => { if (!index || point.round !== s.points[index - 1].round + 1) segments.push([]); segments.at(-1)!.push(point); });
    return <g key={s.driver.id}>{segments.map((points, j) => <polyline key={j} points={points.map(p => `${x(p.round)},${y(p.value)}`).join(" ")} fill="none" stroke={colors[i]} strokeWidth="2.5" />)}{s.points.map(p => <a key={p.round} href={p.href} aria-label={`${s.driver.name}, ${p.label}: ${probability ? percent(p.value) : number(p.value, 2)}`}><circle cx={x(p.round)} cy={y(p.value)} r="4" fill={colors[i]}><title>{`${s.driver.name} · R${p.round}: ${probability ? percent(p.value) : number(p.value, 2)}`}</title></circle></a>)}</g>;
  })}{races.map(r => <text key={r.id} x={x(r.round)} y="250" textAnchor="middle">{r.round}</text>)}</svg><ul className="chart-driver-key">{series.map((s, i) => <li key={s.driver.id}><i style={{ background: colors[i] }} /><ArchiveReference entity={s.driver} /></li>)}</ul></figure>{!values.length ? <p className="ency-empty">No hay observaciones de esta métrica para los pilotos seleccionados.</p> : null}<p className="ency-note">{metric === "points" ? "Puntos oficiales después de cada carrera, con descartes y ajustes del campeonato. No se acumula una escala de puntos moderna." : "Estimación retrospectiva v7.6. XP es rendimiento esperado, no puntos del campeonato. XW del piloto y probabilidad de victoria del auto son variables distintas. Los huecos no se interpolan."}</p><details className="ency-method"><summary>Ver los datos del gráfico</summary><div className="ency-table-scroll"><table><thead><tr><th>Ronda</th>{series.map(s => <th key={s.driver.id}>{s.driver.name}</th>)}</tr></thead><tbody>{races.map(r => <tr key={r.id}><th><Link href={r.href} prefetch={false}>R{r.round} · {r.eventName}</Link></th>{series.map(s => { const p = s.points.find(p => p.round === r.round); return <td key={s.driver.id}>{p ? probability ? percent(p.value) : number(p.value, 2) : "—"}</td>; })}</tr>)}</tbody></table></div></details></div>;
}
