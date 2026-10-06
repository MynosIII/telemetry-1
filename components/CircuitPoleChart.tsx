"use client";
import { useState } from "react";
import type { CircuitRace } from "@/lib/circuit-history";
import { layoutSeasons } from "@/lib/circuit-layouts";
const lapTime = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(3).padStart(6,"0")}`;
export function CircuitPoleChart({ races }: { races: CircuitRace[] }) {
  const layouts = [...new Set(races.map(r => r.layoutId ?? "unknown"))];
  const [selected,setSelected] = useState(layouts.at(-1) ?? "unknown");
  const rows = races.filter(r => (r.layoutId ?? "unknown") === selected);
  const points = rows.filter((r): r is CircuitRace & {poleSeconds:number} => r.poleSeconds !== null);
  const values = points.map(r => r.poleSeconds);
  const low = values.length ? Math.floor(Math.min(...values) / 5) * 5 : 0;
  const high = values.length ? Math.max(low + 5, Math.ceil(Math.max(...values) / 5) * 5) : 5;
  const first = rows[0]?.year ?? 0, last = rows.at(-1)?.year ?? first;
  const x = (year:number) => 86 + (year-first) / Math.max(1,last-first) * 774;
  const y = (seconds:number) => 250 - (seconds-low)/(high-low)*210;
  let missing = true;
  const line = rows.map(r => { if(r.poleSeconds === null){missing=true;return "";} const command=missing?"M":"L";missing=false;return `${command}${x(r.year)},${y(r.poleSeconds)}`; }).join(" ");
  return <div className="circuit-pole-chart">
    <label htmlFor="pole-layout">Configuración <select id="pole-layout" value={selected} onChange={e => setSelected(e.target.value)}>{layouts.map(id => <option value={id} key={id}>{id === "unknown" ? "Sin identificación" : `${id} · ${layoutSeasons(id)}`}</option>)}</select></label>
    <p className="history-note">{rows[0]?.length ? `${rows[0].length.toLocaleString("es-AR")} km · ` : ""}{rows.some(r => r.poleFormat === "four-laps") ? "Clasificación de Indianápolis: tiempo total de cuatro vueltas." : "Tiempo registrado del piloto que obtuvo la primera posición de salida."} Elegí un trazado para comparar la misma configuración. Cada punto abre la carrera.</p>
    {points.length ? <svg viewBox="0 0 920 300" role="group" aria-label={`Evolución de tiempos de pole en ${selected}, ${first}–${last}. Consultá los valores exactos en la tabla del trazado.`}>
      {[0,1,2,3,4].map(i => { const v=low+(high-low)*i/4;return <g key={i}><line x1={86} x2={860} y1={y(v)} y2={y(v)} stroke="#303035" /><text x={76} y={y(v)+4} textAnchor="end" fill="#aaa" fontSize="12">{lapTime(v)}</text></g>; })}
      <path d={line} fill="none" stroke="#ff4d42" strokeWidth="2.5" />
      {points.map(r => <a key={`${r.year}-${r.round}`} href={r.href} aria-label={`${r.year}: ${r.pole?.name}, ${r.poleTime}. Abrir ${r.name}`}><circle cx={x(r.year)} cy={y(r.poleSeconds)} r={5} fill="#ff4d42"><title>{`${r.year} · ${r.name}\n${r.pole?.name}\n${r.poleTime}`}</title></circle></a>)}
      {[...new Set([first,Math.round((first+last)/2),last])].map(year => <text key={year} x={x(year)} y={282} textAnchor="middle" fill="#aaa" fontSize="13">{year}</text>)}
    </svg> : <p className="ency-empty">No hay tiempos de pole comparables registrados para esta configuración.</p>}
    <p className="history-note">La meteorología, los neumáticos y el reglamento cambian entre ediciones. La curva describe los registros, no aísla el rendimiento de los autos. Las poles decididas por sprint en 2021 aparecen sin tiempo de vuelta.</p>
  </div>;
}
