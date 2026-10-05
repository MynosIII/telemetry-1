"use client";

import { useId, useState } from "react";
import Link from "next/link";
import type { HistoryEntity } from "@/lib/history";

const metricLabels = { wins: "Victorias", podiums: "Podios", poles: "Salidas P1", races: "Grandes Premios" };
type Metric = keyof typeof metricLabels;

export function HistoryCharts({ seasons, ratings }: { seasons: HistoryEntity["seasons"]; ratings: HistoryEntity["ratingHistory"] }) {
  const [metric, setMetric] = useState<Metric>("wins");
  const [selected, setSelected] = useState<number | null>(null);
  const chartId = useId();
  const max = Math.max(1, ...seasons.map(s => s[metric]));
  const season = seasons.find(s => s.season === selected);
  const low = ratings.length ? Math.floor(Math.min(...ratings.map(r => r.rating)) / 100) * 100 : 0;
  const high = ratings.length ? Math.ceil(Math.max(...ratings.map(r => r.rating)) / 100) * 100 : 1;
  const range = Math.max(100, high - low);
  // Split at gaps between seasons so retirement periods do not look observed.
  const segments: typeof ratings[] = [];
  ratings.forEach((r, i) => {
    if (!i || r.season - ratings[i - 1].season > 1) segments.push([]);
    segments[segments.length - 1].push(r);
  });
  const firstYear = ratings[0]?.season ?? 0, finalYear = ratings.at(-1)?.season ?? 1;
  const ratingX = (r: typeof ratings[number]) => 48 + ((r.season - firstYear + r.round / 30) / Math.max(1, finalYear - firstYear + 1)) * 710;

  return <div className="history-charts">
    <figure className="history-chart">
      <figcaption><h3>Resultados por temporada</h3><p>Cada barra representa una temporada. Seleccioná una para ver sus cifras.</p></figcaption>
      <div className="history-chart-controls" aria-label="Métrica del gráfico">{(Object.entries(metricLabels) as [Metric, string][]).map(([key, label]) => <button key={key} aria-pressed={key === metric} onClick={() => setMetric(key)}>{label}</button>)}</div>
      <div className="history-bars" style={{ gridTemplateColumns: `repeat(${seasons.length}, minmax(${seasons.length > 30 ? "9px" : "24px"}, 1fr))` }}>
        {seasons.map(s => <button className="history-bar" key={s.season} aria-pressed={selected === s.season} aria-label={`${s.season}: ${s[metric]} ${metricLabels[metric]}`} onClick={() => setSelected(s.season)} title={`${s.season}: ${s[metric]} ${metricLabels[metric]}`}><span style={{ height: `${Math.max(1, s[metric] / max * 100)}%` }} className={s.champion ? "champion-bar" : undefined} /><small>{s.season}</small></button>)}
      </div>
      <p className="history-chart-detail" role="status">{season ? `${season.season} · ${season.races} GP · ${season.wins} victorias · ${season.podiums} podios · ${season.poles} salidas P1${season.position ? ` · Campeonato: ${season.position}` : ""}` : `${metricLabels[metric]} · máximo por temporada: ${max}. Las barras blancas indican un título de pilotos o constructores.`}</p>
      <details><summary>Ver los datos del gráfico</summary><div className="history-table-scroll"><table><thead><tr><th>Temporada</th><th>GP</th><th>Victorias</th><th>Podios</th><th>Salidas P1</th><th>Campeonato</th><th>Puntos</th></tr></thead><tbody>{seasons.map(s => <tr key={s.season}><td>{s.season}{s.champion ? " ★" : ""}</td><td>{s.races}</td><td>{s.wins}</td><td>{s.podiums}</td><td>{s.poles}</td><td>{s.position ?? "—"}</td><td>{s.points ?? "—"}</td></tr>)}</tbody></table></div></details>
    </figure>
    {ratings.length ? <figure className="history-chart">
      <figcaption><h3>La carrera vista por el modelo</h3><p>ELO retrospectivo v7.6 por Gran Premio. Los períodos sin carreras quedan separados.</p></figcaption>
      <svg viewBox="0 0 800 250" role="img" aria-labelledby={chartId} className="history-rating-chart">
        <title id={chartId}>{`Evolución del ELO entre ${firstYear} y ${finalYear}, en una escala de ${low} a ${high}.`}</title>
        {[0, 0.5, 1].map(frac => <g key={frac}><line x1="48" x2="768" y1={210 - frac * 180} y2={210 - frac * 180} stroke="#444" /><text x="4" y={214 - frac * 180}>{Math.round(low + frac * range)}</text></g>)}
        {segments.map((segment, i) => <polyline key={i} points={segment.map(r => `${ratingX(r).toFixed(1)},${(210 - (r.rating - low) / range * 180).toFixed(1)}`).join(" ")} fill="none" stroke="#e10600" strokeWidth="3" />)}
        <text x="48" y="240">{firstYear}</text><text x="725" y="240">{finalYear}</text>
      </svg>
      <p className="history-chart-detail">Estimación analítica. El ELO y las victorias esperadas usan la cobertura propia del modelo.</p>
      <details><summary>Ver el historial del modelo ({ratings.length} carreras)</summary><p className="history-note">La expectativa del auto es su probabilidad modelada de victoria. No es la expectativa XW del piloto usada en el total de victorias esperadas.</p><div className="history-table-scroll history-rating-data"><table><thead><tr><th>Temporada</th><th>GP</th><th>ELO</th><th>Expectativa del auto</th></tr></thead><tbody>{ratings.map(r => <tr key={`${r.season}/${r.round}`}><td>{r.season}</td><td><Link prefetch={false} href={`/historia/carreras/${r.season}/${r.round}`}>{r.event}</Link></td><td>{r.rating.toFixed(1)}</td><td>{r.expectedCarWin === null ? "—" : `${(r.expectedCarWin * 100).toFixed(1)}%`}</td></tr>)}</tbody></table></div></details>
    </figure> : null}
  </div>;
}
