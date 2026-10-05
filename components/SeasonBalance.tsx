"use client";

import { useState } from "react";
import Link from "next/link";
import { ArchiveReference } from "./ArchiveReference";
import type { Balance, Championship, StandingRow } from "@/lib/championship-history";
import { number, raceCode, resultColor } from "@/lib/weekend-format";

type Props = Pick<Championship, "year" | "races" | "driverStandings" | "constructorStandings" | "driverResults" | "qualifyingResults" | "gridResults">;
const modes = { race: "Clasificación de carrera", qualifying: "Clasificación de sesión", grid: "Parrilla de salida" };
export function SeasonBalance({ races, driverStandings, constructorStandings, driverResults, qualifyingResults, gridResults }: Props) {
  const [mode, setMode] = useState<keyof typeof modes>("race");
  const [group, setGroup] = useState<"drivers" | "constructors">("drivers");
  const balance: Balance = mode === "race" ? driverResults : mode === "qualifying" ? qualifyingResults : gridResults;
  let rows: (StandingRow & { cells: Balance[string] })[];
  if (group === "drivers") rows = driverStandings.map(row => ({ ...row, cells: balance[row.entity.id] ?? {} }));
  else {
    const teams = new Map<string, StandingRow & { cells: Balance[string] }>();
    constructorStandings.forEach(row => teams.set(`${row.entity.id}/${row.engine?.id ?? ""}`, { ...row, cells: {} }));
    Object.values(balance).forEach(driver => Object.entries(driver).forEach(([round, cells]) => cells.forEach(cell => {
      const id = `${cell.constructor.id}/${cell.engine?.id ?? ""}`;
      if (!teams.has(id)) teams.set(id, { entity: cell.constructor, engine: cell.engine ?? null, position: null, points: 0, cells: {} });
      const team = teams.get(id)!;
      const target = team.cells[round] ??= [];
      // Shared drivers represent one car; separate retired cars remain separate.
      if (!cell.shared) target.push(cell);
    })));
    rows = [...teams.values()];
  }
  return <div><div className="ency-controls" aria-label="Grupo del balance"><button aria-pressed={group === "drivers"} onClick={() => setGroup("drivers")}>Pilotos</button><button aria-pressed={group === "constructors"} onClick={() => setGroup("constructors")}>Constructores</button></div><div className="ency-controls" aria-label="Sesión del balance">{(Object.entries(modes) as [keyof typeof modes, string][]).map(([key, label]) => <button key={key} aria-pressed={mode === key} onClick={() => setMode(key)}>{label}</button>)}</div><p className="ency-note">Seleccioná una ronda para abrir su Gran Premio. Los puntos finales son los oficiales del campeonato; la media usa sólo posiciones numéricas de la sesión seleccionada.</p><div className="ency-table-scroll"><table className="balance-table"><caption>Balance de {group === "drivers" ? "pilotos" : "constructores"} · {modes[mode]}</caption><thead><tr><th scope="col">Pos.</th><th scope="col" className="balance-name">{group === "drivers" ? "Piloto" : "Constructor · motor"}</th>{races.map(r => <th scope="col" key={r.id}><Link href={r.href} prefetch={false} title={r.eventName}>{r.round}<small>{raceCode(r.eventName)}</small></Link></th>)}<th scope="col">Media</th><th scope="col">Puntos</th></tr></thead><tbody>{rows.map(row => {
    const numeric = Object.values(row.cells).flat().map(r => r.position).filter((p): p is number => typeof p === "number");
    return <tr key={`${row.entity.id}/${row.engine?.id ?? ""}`}><td>{row.position ?? "—"}</td><th scope="row" className="balance-name"><ArchiveReference entity={row.entity} />{row.engine ? <small><ArchiveReference entity={row.engine} /></small> : null}</th>{races.map(r => <td key={r.id} className="balance-result">{row.cells[String(r.round)]?.length ? row.cells[String(r.round)].map((cell, i) => <Link key={i} prefetch={false} href={r.href} className={`${resultColor(cell.position, mode === "race" ? cell.retired : undefined)}${cell.fastest && mode === "race" ? " finish-fastest" : ""}`} title={`${r.eventName}: ${cell.position ?? "sin posición"}${cell.shared ? " · auto compartido" : ""}${cell.retired ? ` · ${cell.retired}` : ""}${cell.time ? ` · ${cell.time}` : ""}`}>{cell.position ?? "—"}{cell.shared ? "*" : ""}</Link>) : "—"}</td>)}<td>{numeric.length ? number(numeric.reduce((a, b) => a + b, 0) / numeric.length, 2) : "—"}</td><td><strong>{row.position != null ? number(row.points, 2) : "—"}</strong></td></tr>;
  })}</tbody></table></div><p className="balance-key"><span className="finish-gold">1º</span><span className="finish-silver">2º</span><span className="finish-bronze">3º</span><span className="finish-classified">Clasificado</span><span className="finish-retired">Abandono</span><span className="finish-no-start">Sin largada</span><span className="finish-fastest">Vuelta rápida</span><span>* Auto compartido</span></p><p className="ency-note">RET/DNF: abandono · DNS: no largó · DNQ/DNPQ: no clasificó · DSQ: descalificado. Un abandono puede conservar una posición numérica oficial. Los resultados sprint se detallan en la ficha de cada carrera.</p></div>;
}
