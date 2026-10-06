"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChampionshipBase } from "@/lib/replay-championship";
import type { ReplayDriver, ReplaySession } from "@/lib/replay";

const RACE_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
const SPRINT_POINTS = [8, 7, 6, 5, 4, 3, 2, 1];

type Row = { key: string; label: string; color: string; before: number; beforePosition: number; today: number };

function format(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(".", ",");
}

/** The championship as it would stand if the session ended with the order at the playhead. */
export function ChampionshipPanel({ data, rows }: {
  data: ReplaySession;
  rows: { driver: ReplayDriver; position: number | null; bestLap: number | null }[];
}) {
  const [base, setBase] = useState<ChampionshipBase | null>(null);
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState<"drivers" | "teams">("drivers");
  const key = data.session.key;

  useEffect(() => {
    let cancelled = false;
    setBase(null);
    setFailed(false);
    fetch(`/api/replay/championship?key=${key}`)
      .then((response) => (response.ok ? (response.json() as Promise<ChampionshipBase>) : Promise.reject(new Error(String(response.status)))))
      .then((value) => !cancelled && setBase(value))
      .catch(() => !cancelled && setFailed(true));
    return () => { cancelled = true; };
  }, [key]);

  const table = useMemo(() => {
    if (!base) return [];
    const scale = base.sprint ? SPRINT_POINTS : RACE_POINTS;
    const earned = new Map<number, number>();
    for (const row of rows) if (row.position !== null) earned.set(row.driver.number, scale[row.position - 1] ?? 0);
    if (base.fastestLapPoint) {
      const fastest = rows.filter((row) => row.bestLap !== null).sort((a, b) => (a.bestLap as number) - (b.bestLap as number))[0];
      if (fastest && fastest.position !== null && fastest.position <= 10) earned.set(fastest.driver.number, (earned.get(fastest.driver.number) ?? 0) + 1);
    }
    let list: Row[];
    if (view === "drivers") {
      const seen = new Set<number>();
      list = base.drivers.map((entry) => {
        const driver = data.drivers.find((item) => (entry.acronym !== null ? item.acronym === entry.acronym : item.number === entry.number));
        if (driver) seen.add(driver.number);
        return {
          key: driver ? `d${driver.number}` : `a${entry.acronym ?? entry.number}`,
          label: driver?.acronym ?? entry.acronym ?? `#${entry.number}`,
          color: driver?.color ?? "#555",
          before: entry.points,
          beforePosition: entry.position,
          today: driver ? earned.get(driver.number) ?? 0 : 0
        };
      });
      for (const driver of data.drivers) {
        if (!seen.has(driver.number)) list.push({ key: `d${driver.number}`, label: driver.acronym, color: driver.color, before: 0, beforePosition: 99, today: earned.get(driver.number) ?? 0 });
      }
    } else {
      list = base.teams.map((team) => {
        const drivers = data.drivers.filter((driver) => driver.team === team.name);
        return {
          key: team.name,
          label: team.name,
          color: drivers[0]?.color ?? "#555",
          before: team.points,
          beforePosition: team.position,
          today: drivers.reduce((sum, driver) => sum + (earned.get(driver.number) ?? 0), 0)
        };
      });
    }
    const ranked = [...list].sort((a, b) => b.before + b.today - (a.before + a.today) || a.beforePosition - b.beforePosition);
    const leader = ranked[0] ? ranked[0].before + ranked[0].today : 0;
    return ranked.map((row, index) => ({ ...row, position: index + 1, total: row.before + row.today, behind: leader - (row.before + row.today) }));
  }, [base, rows, data, view]);

  if (failed) return null;
  return (
    <section className="replay-panel championship" aria-label="Campeonato en este momento">
      <div className="championship-head">
        <h2>Campeonato si termina así</h2>
        <div className="replay-speeds" role="radiogroup" aria-label="Campeonato">
          <button type="button" role="radio" aria-checked={view === "drivers"} onClick={() => setView("drivers")}>Pilotos</button>
          <button type="button" role="radio" aria-checked={view === "teams"} onClick={() => setView("teams")}>Equipos</button>
        </div>
      </div>
      {!base ? <p className="replay-empty">Cargando el campeonato…</p> : (
        <>
          <div className="champ-heads">
            {[0, 1].map((column) => (
              <div className="champ-row champ-head" key={column} aria-hidden={column === 1 || undefined}>
                <span>Pos</span><span /><span>{view === "drivers" ? "Piloto" : "Equipo"}</span><span>Antes</span><span>Hoy</span><span>Total</span><span>Al líder</span>
              </div>
            ))}
          </div>
          <ol className="champ-list">
            {table.map((row) => {
              const change = row.beforePosition < 99 ? row.beforePosition - row.position : 0;
              return (
                <li key={row.key} className="champ-row">
                  <b>{row.position}</b>
                  <span className={change > 0 ? "pit-up" : change < 0 ? "pit-down" : "pit-muted"}>{change > 0 ? `▲${change}` : change < 0 ? `▼${-change}` : ""}</span>
                  <span className="tower-driver"><i style={{ background: row.color }} /><b>{row.label}</b></span>
                  <code>{format(row.before)}</code>
                  <code className={row.today ? "champ-today" : "pit-muted"}>{row.today ? `+${format(row.today)}` : "—"}</code>
                  <code><b>{format(row.total)}</b></code>
                  <code className="pit-muted">{row.behind ? `−${format(row.behind)}` : "—"}</code>
                </li>
              );
            })}
          </ol>
          <p className="stint-note">
            {base.sprint ? "Puntos del sprint" : "Puntos de carrera"} según el orden de este momento{base.fastestLapPoint ? ", con el punto por vuelta rápida" : ""}.
            {base.source === "jolpica" ? " Puntos previos de Jolpica." : ""}
          </p>
        </>
      )}
    </section>
  );
}
