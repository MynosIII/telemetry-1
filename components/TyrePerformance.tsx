"use client";

import { useState } from 'react';
import Link from 'next/link';
import type { TyreAnalysis } from '@/lib/tyre-history';
import { number, percent } from '@/lib/weekend-format';

const metrics = { wins: 'Victorias', races: 'Grandes Premios', rate: 'Victorias / GP' } as const;
const modes = { all: 'Todo el archivo', multi: 'Varios proveedores', sole: 'Un proveedor' } as const;
export function TyrePerformance({ analysis }: { analysis: TyreAnalysis }) {
  const [metric, setMetric] = useState<keyof typeof metrics>('wins');
  const [mode, setMode] = useState<keyof typeof modes>('all');
  const [year, setYear] = useState<number | null>(null);
  const rows = analysis.seasons.map(s => ({ year: s.year, ...(mode === 'all' ? { races: s.races, wins: s.wins } : s[mode]) })).filter(s => s.races > 0);
  const value = (s: typeof rows[number]) => metric === 'rate' ? 100 * s.wins / s.races : s[metric];
  const max = metric === 'rate' ? 100 : Math.max(1, ...rows.map(value));
  const selected = rows.find(s => s.year === year);
  const races = rows.reduce((n, s) => n + s.races, 0), wins = rows.reduce((n, s) => n + s.wins, 0);
  return <div className="tyre-performance">
    <div className="tyre-controls" role="group" aria-label="Métrica de neumáticos">{Object.entries(metrics).map(([key, label]) => <button key={key} aria-pressed={metric === key} onClick={() => setMetric(key as keyof typeof metrics)}>{label}</button>)}</div>
    <div className="tyre-controls" role="group" aria-label="Competencia entre proveedores">{Object.entries(modes).map(([key, label]) => <button key={key} aria-pressed={mode === key} onClick={() => { setMode(key as keyof typeof modes); setYear(null); }}>{label}</button>)}</div>
    <div className="tyre-chart-summary"><strong>{number(wins)} <small>victorias</small></strong><strong>{number(races)} <small>GP con registros</small></strong><strong>{races ? percent(wins / races) : '—'} <small>victorias / GP</small></strong></div>
    <figure className="tyre-season-chart"><figcaption>{metrics[metric]} por temporada · {modes[mode]}. Seleccioná una barra.</figcaption>
      {rows.length ? <div className="tyre-bars" style={{ gridTemplateColumns: `repeat(${rows.length}, minmax(24px, 1fr))` }}>{rows.map(s => <button key={s.year} aria-pressed={year === s.year} aria-label={`${s.year}: ${number(value(s), metric === 'rate' ? 1 : 0)} ${metrics[metric]}`} onClick={() => setYear(s.year)}><span style={{ height: `${Math.max(1, 100 * value(s) / max)}%` }} /><small>{String(s.year).slice(-2)}</small></button>)}</div> : <p>No hay carreras registradas con este criterio.</p>}
    </figure>
    <p className="tyre-chart-selection" role="status">{selected ? <>{selected.year}: {selected.wins} victorias en {selected.races} GP · <Link href={`/historia/seasons/${selected.year}`}>Abrir temporada →</Link></> : 'Las temporadas sin registros quedan fuera del gráfico. Los años completos figuran en la tabla.'}</p>
    <details><summary>Ver tabla por temporada</summary><div className="ency-table-scroll"><table><caption>{metrics[metric]} · {modes[mode]}</caption><thead><tr><th>Año</th><th>GP</th><th>Victorias</th><th>Victorias / GP</th></tr></thead><tbody>{rows.map(s => <tr key={s.year}><th scope="row"><Link href={`/historia/seasons/${s.year}`}>{s.year}</Link></th><td>{s.races}</td><td>{s.wins}</td><td>{percent(s.wins / s.races)}</td></tr>)}</tbody></table></div></details>
    <p className="ency-note">GP cuenta pruebas con al menos una inscripción registrada de la marca. La comparación de proveedores usa las largadas registradas y separa los casos sin largada o con identidad incompleta. Las victorias compartidas cuentan una vez por auto. Esto describe resultados; no aísla el efecto del neumático frente al piloto, auto, motor, circuito o época.</p>
  </div>;
}
