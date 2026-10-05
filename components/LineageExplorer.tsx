"use client";

import { useState } from "react";
import Link from "next/link";
import { TeamBadge } from "./TeamBadge";
import { inkFor } from "@/lib/team-lineage";

export type LineageSeason = { season: number; position: number | null; wins: number; podiums: number; champion: boolean };
export type LineageView = {
  id: string; name: string; href: string; from: number; to: number; color: string; logo: string | null;
  wins: number; podiums: number; races: number; titles: number[]; best: number | null; seasons: LineageSeason[];
};

const years = (from: number, to: number) => from === to ? `${from}` : `${from}–${to}`;

export function LineageExplorer({ base, steps, current }: { base: string; steps: LineageView[]; current: number }) {
  const [selected, setSelected] = useState(current);
  const step = steps[selected];
  const first = steps[0].from, last = steps.at(-1)!.to;
  const span = last - first + 1;
  const seasons = steps.flatMap((s, i) => s.seasons.map(season => ({ ...season, step: i })));
  const worst = Math.max(10, ...seasons.map(s => s.position ?? 0));
  const width = 1000, left = 40, chartTop = 14, chartHeight = 150, bandY = 182;
  const slot = (width - left) / span;
  const x = (year: number) => left + (year - first) * slot;
  const totalWins = steps.reduce((sum, s) => sum + s.wins, 0);

  return <section className="lineage" aria-labelledby="lineage-title" style={{ ["--team" as string]: step.color, ["--team-ink" as string]: inkFor(step.color) }}>
    <div className="lineage-head">
      <h2 id="lineage-title">Un equipo, {steps.length} nombres</h2>
      <p>La misma fábrica de {base} corrió con {steps.length} identidades entre {first} y {last}: {totalWins.toLocaleString("es-AR")} victorias en total. Tocá un nombre o usá las flechas para recorrer su historia.</p>
    </div>
    <div className="lineage-switcher">
      <button className="lineage-arrow" onClick={() => setSelected(Math.max(0, selected - 1))} disabled={selected === 0} aria-label="Nombre anterior">←</button>
      <ol className="lineage-strip">
        {steps.map((s, i) => <li key={`${s.id}/${s.from}`}>
          <button aria-pressed={i === selected} aria-current={i === current ? "page" : undefined} onClick={() => setSelected(i)}>
            <TeamBadge name={s.name} color={s.color} logo={s.logo} size="md" />
            <span className="lineage-years">{years(s.from, s.to)}</span>
            {i === current ? <span className="lineage-here">Esta página</span> : null}
          </button>
        </li>)}
      </ol>
      <button className="lineage-arrow" onClick={() => setSelected(Math.min(steps.length - 1, selected + 1))} disabled={selected === steps.length - 1} aria-label="Nombre siguiente">→</button>
    </div>
    <div className="lineage-detail" role="status">
      <div>
        <h3>{step.name} <span>{years(step.from, step.to)}</span></h3>
        <dl>
          <div><dt>Grandes Premios</dt><dd>{step.races}</dd></div>
          <div><dt>Victorias</dt><dd>{step.wins}</dd></div>
          <div><dt>Podios</dt><dd>{step.podiums}</dd></div>
          <div><dt>Mejor posición</dt><dd>{step.best ? `${step.best}.º` : "—"}</dd></div>
          <div><dt>Títulos</dt><dd>{step.titles.length ? step.titles.join(", ") : "—"}</dd></div>
        </dl>
      </div>
      {selected === current ? <span className="lineage-go is-current">Estás leyendo esta etapa</span> : <Link className="lineage-go" href={step.href}>Ir a la historia de {step.name} →</Link>}
    </div>
    <figure className="lineage-chart">
      <svg viewBox={`0 0 ${width} 214`} role="img" aria-label={`Posición en el campeonato de constructores de cada etapa, ${first}–${last}. Barras más altas indican mejores posiciones.`}>
        {[1, 5, 10].filter(p => p <= worst).map(p => {
          const y = chartTop + (p - 1) / worst * chartHeight;
          return <g key={p} className="lineage-grid"><line x1={left} x2={width} y1={y} y2={y} /><text x={left - 8} y={y + 4} textAnchor="end">{p}.º</text></g>;
        })}
        {seasons.map(s => {
          const height = s.position ? (worst - s.position + 1) / worst * chartHeight : 3;
          return <rect key={`${s.step}/${s.season}`} className={s.step === selected ? "is-on" : undefined} x={x(s.season) + slot * .12} width={slot * .76} y={chartTop + chartHeight - height} height={height} fill={steps[s.step].color} onClick={() => setSelected(s.step)}>
            <title>{`${s.season} · ${steps[s.step].name}: ${s.position ? `${s.position}.º en constructores` : "sin posición"} · ${s.wins} victorias${s.champion ? " · campeón" : ""}`}</title>
          </rect>;
        })}
        {seasons.filter(s => s.champion).map(s => <text key={`c${s.season}`} className="lineage-star" x={x(s.season) + slot / 2} y={chartTop + 10} textAnchor="middle">★</text>)}
        {steps.map((s, i) => <g key={`${s.id}/${s.from}`} className={`lineage-band${i === selected ? " is-on" : ""}`} onClick={() => setSelected(i)}>
          <rect x={x(s.from)} width={(s.to - s.from + 1) * slot - 2} y={bandY} height="12" fill={s.color} />
          <text x={x(s.from)} y={bandY + 28}>{(s.to - s.from + 1) * slot > 60 ? s.name : ""}</text>
        </g>)}
      </svg>
      <figcaption>Barras: posición en el campeonato de constructores (más alta, mejor). ★ temporada con título. Abajo, cuánto duró cada nombre.</figcaption>
    </figure>
  </section>;
}
