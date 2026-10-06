"use client";

import { useEffect, useMemo, useState } from "react";
import { ArchiveReference } from "./ArchiveReference";
import { FIRST_CONSTRUCTORS_SEASON, missingFastestLaps, simulate, type SimInput, type SimRow } from "@/lib/season-simulation";
import { number } from "@/lib/weekend-format";

type Group = "drivers" | "constructors";
const SECTION = "simulacion";

function readUrl() {
  const params = new URLSearchParams(window.location.search);
  return { fastest: params.get("vr") === "1", group: (params.get("tabla") === "constructores" ? "constructors" : "drivers") as Group, linked: params.has("vr") || params.has("tabla") || window.location.hash === `#${SECTION}` };
}
function shareUrl(fastest: boolean, group: Group) {
  const params = new URLSearchParams(window.location.search);
  params.delete("vr"); params.delete("tabla");
  if (fastest) params.set("vr", "1");
  if (group === "constructors") params.set("tabla", "constructores");
  const query = params.toString();
  return `${window.location.pathname}${query ? `?${query}` : ""}#${SECTION}`;
}
const name = (row: SimRow) => row.engine && row.engine.id !== row.entity.id ? `${row.entity.name}-${row.engine.name}` : row.entity.name;

export function SeasonSimulator({ input }: { input: SimInput }) {
  const [fastest, setFastest] = useState(false);
  const [group, setGroup] = useState<Group>("drivers");
  const [copied, setCopied] = useState(false);
  const hasConstructors = input.year >= FIRST_CONSTRUCTORS_SEASON;

  useEffect(() => {
    const state = readUrl();
    setFastest(state.fastest);
    setGroup(hasConstructors ? state.group : "drivers");
    if (!state.linked) return;
    const section = document.getElementById(SECTION);
    if (section instanceof HTMLDetailsElement) section.open = true;
    section?.scrollIntoView();
  }, [hasConstructors]);

  function update(nextFastest: boolean, nextGroup: Group) {
    setFastest(nextFastest); setGroup(nextGroup); setCopied(false);
    window.history.replaceState(null, "", shareUrl(nextFastest, nextGroup));
  }
  async function copy() {
    const url = new URL(shareUrl(fastest, group), window.location.origin).toString();
    try { await navigator.clipboard.writeText(url); setCopied(true); } catch { window.prompt("Enlace de esta simulación", url); }
  }

  const result = useMemo(() => simulate(input, fastest), [input, fastest]);
  const rows = (group === "drivers" ? result.drivers : result.constructors).filter(r => r.points > 0 || (r.realPoints ?? 0) > 0);
  const missing = useMemo(() => missingFastestLaps(input), [input]);
  const sprints = input.rounds.filter(r => r.sprint.length).length;
  const shared = useMemo(() => input.rounds.some(r => r.race.some((e, i) => e.position !== null && r.race.findIndex(o => o.team === e.team && o.position === e.position) !== i)), [input]);

  const leaders = rows.filter(r => r.position === 1);
  const realChampions = rows.filter(r => r.realPosition === 1);
  const runnerUp = rows.find(r => r.position > 1);
  const kept = leaders.length === 1 && leaders[0].realPosition === 1;
  const unit = group === "drivers" ? "pilotos" : "constructores";

  return <div className="season-sim">
    <div className="ency-controls" aria-label="Opciones de la simulación">
      {hasConstructors ? <><button aria-pressed={group === "drivers"} onClick={() => update(fastest, "drivers")}>Pilotos</button><button aria-pressed={group === "constructors"} onClick={() => update(fastest, "constructors")}>Constructores</button></> : null}
      <label className="sim-option"><input type="checkbox" checked={fastest} onChange={e => update(e.target.checked, group)} />Punto por vuelta rápida</label>
      <button className="sim-copy" onClick={copy}>{copied ? "Enlace copiado" : "Copiar enlace"}</button>
    </div>
    {leaders.length ? <p className="sim-verdict">{kept
      ? <><ArchiveReference entity={leaders[0].entity} /> conserva el título de {unit} con {number(leaders[0].points, 2)} puntos{runnerUp ? <>, {number(leaders[0].points - runnerUp.points, 2)} más que <ArchiveReference entity={runnerUp.entity} /></> : null}.</>
      : <><strong className="sim-changed">{leaders.map((l, i) => <span key={l.id}>{i ? " y " : ""}<ArchiveReference entity={l.entity} /></span>)}</strong> {leaders.length > 1 ? "empatarían" : "sería campeón"} con {number(leaders[0].points, 2)} puntos. El título real fue de {realChampions.length ? realChampions.map((c, i) => <span key={c.id}>{i ? " y " : ""}<ArchiveReference entity={c.entity} /></span>) : "otro participante"}.</>}</p> : null}
    <div className="ency-table-scroll"><table className="sim-table">
      <caption>{group === "drivers" ? "Pilotos" : "Constructores"} {input.year} con los puntos actuales{fastest ? " y vuelta rápida" : ""}</caption>
      <thead><tr><th scope="col">Pos.</th><th scope="col">{group === "drivers" ? "Piloto" : "Constructor · motor"}</th><th scope="col">Puntos</th><th scope="col">Cambio</th><th scope="col">Pos. real</th><th scope="col" className="sim-real-points">Puntos reales</th></tr></thead>
      <tbody>{rows.map(row => {
        const delta = row.realPosition === null ? null : row.realPosition - row.position;
        const champion = row.position === 1 && row.realPosition !== 1;
        return <tr key={row.id} className={champion ? "sim-new-champion" : undefined}>
          <td>{row.position}</td>
          <th scope="row"><ArchiveReference entity={{ ...row.entity, name: name(row) }} /></th>
          <td>{number(row.points, 2)}</td>
          <td className={delta ? (delta > 0 ? "sim-up" : "sim-down") : "sim-same"}>{delta === null ? "—" : delta === 0 ? "=" : `${delta > 0 ? "▲" : "▼"} ${Math.abs(delta)}`}</td>
          <td>{row.realPosition ?? "—"}</td>
          <td className="sim-real-points">{row.realPoints === null ? "—" : number(row.realPoints, 2)}</td>
        </tr>;
      })}</tbody>
    </table></div>
    <p className="ency-note">Escala 25-18-15-12-10-8-6-4-2-1 en todas las carreras, sin descartes ni puntos reducidos.{sprints ? " Sprints de 8 a 1 punto." : ""}{fastest ? " La vuelta rápida suma sólo si el piloto termina entre los diez primeros." : ""}{shared ? " Los autos compartidos reparten los puntos." : ""}{group === "constructors" ? " Suman todos los autos de cada constructor." : ""}{fastest && missing.length ? ` Sin dato de vuelta rápida: ${missing.join(", ")}.` : ""}</p>
  </div>;
}
