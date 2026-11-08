"use client";

import { useMemo } from "react";
import { compoundInfo } from "@/components/replay/tyres";
import type { TowerInput } from "@/components/replay/PitProjection";
import type { ReplaySession, ReplayTimeline } from "@/lib/replay";

export type StintRow = TowerInput & { interval: number | string | null; pits: number };

function formatGap(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") return value === 0 ? "—" : `+${value.toFixed(3)}`;
  return value.replace(/\s*LAPS?/i, " V");
}

/** Track length in metres from the OpenF1 outline (about 0.1 m per unit). */
function outlineLength(track: ReplayTimeline["track"]) {
  let total = 0;
  for (let i = 1; i < track.length; i += 1) total += Math.hypot(track[i].x - track[i - 1].x, track[i].y - track[i - 1].y);
  return total / 10;
}

/** Every driver's tyre stints laid out over the race distance, next to their place in the order. */
export function StintBoard({ data, timeline, rows, totalLaps, live, selected, onSelect }: {
  data: ReplaySession;
  timeline: ReplayTimeline;
  rows: StintRow[];
  /** Laps run by the winner in a finished session; 0 when unknown. */
  totalLaps: number;
  live: boolean;
  selected: number | null;
  onSelect: (driver: number) => void;
}) {
  const isRace = data.session.type === "Race";
  const leaderLap = Math.max(0, ...rows.map((row) => row.lap ?? 0));

  // A live race has no published distance: 305 km over the lap length, or 260 km in Monaco.
  const axisLaps = useMemo(() => {
    if (!live && totalLaps) return totalLaps;
    const length = outlineLength(timeline.track);
    const monaco = /monte carlo|monaco/i.test(data.session.circuit);
    const sprint = /sprint/i.test(data.session.name);
    const planned = isRace && length > 2500 && length < 8000 ? Math.ceil((sprint ? 100_000 : monaco ? 260_000 : 305_000) / length) : 0;
    return Math.max(planned, leaderLap, 10);
  }, [live, totalLaps, timeline.track, data.session.circuit, data.session.name, isRace, leaderLap]);

  const ticks = useMemo(() => {
    const step = axisLaps > 40 ? 10 : 5;
    const list: number[] = [];
    for (let lap = 0; lap <= axisLaps; lap += step) list.push(lap);
    return list;
  }, [axisLaps]);

  const grid = useMemo(() => {
    const result = new Map<number, number>();
    for (const [driver, list] of Object.entries(timeline.positions)) if (list.length) result.set(Number(driver), list[0][1]);
    return result;
  }, [timeline.positions]);

  const pct = (lap: number) => `${Math.min(100, Math.max(0, (lap / axisLaps) * 100))}%`;

  return (
    <section className="replay-panel stint-board" aria-label="Neumáticos de cada piloto">
      <h2>Neumáticos</h2>
      <div className="stint-board-scroll">
        <div className="stint-board-table" role="table">
          <div className="stint-board-row stint-board-head" role="row">
            <span role="columnheader">Pos</span>
            <span role="columnheader">Piloto</span>
            {isRace && <span role="columnheader" aria-label="Puestos ganados desde la largada" />}
            <span role="columnheader">{isRace ? "Líder" : "Mejor"}</span>
            <span role="columnheader">Int.</span>
            <span role="columnheader">Vtas.</span>
            <span role="columnheader">Pits</span>
            <span role="columnheader">Neum.</span>
            <span role="columnheader" className="stint-board-axis">
              {ticks.map((lap) => <i key={lap} style={{ left: pct(lap) }}>{lap}</i>)}
            </span>
          </div>
          {rows.map((row) => {
            const number = row.driver.number;
            const lap = row.lap ?? 0;
            const start = grid.get(number);
            const change = isRace && start && row.position ? start - row.position : 0;
            const stints = data.stints
              .filter((stint) => stint.driver === number && stint.lapStart <= Math.max(1, lap))
              .sort((a, b) => a.stint - b.stint);
            const current = row.tyre ? compoundInfo(row.tyre.compound) : null;
            return (
              <button
                type="button"
                role="row"
                key={number}
                className="stint-board-row"
                aria-pressed={selected === number}
                onClick={() => onSelect(number)}
              >
                <b className="stint-board-pos">{row.position ?? "—"}</b>
                <span className="stint-board-driver"><i style={{ background: row.driver.color }} />{row.driver.acronym}</span>
                {isRace && (
                  <span className={change > 0 ? "stint-board-delta is-up" : change < 0 ? "stint-board-delta is-down" : "stint-board-delta"}>
                    {change > 0 ? `▲${change}` : change < 0 ? `▼${-change}` : ""}
                  </span>
                )}
                <code>{row.position === 1 && isRace ? "Líder" : formatGap(row.gap)}</code>
                <code>{formatGap(row.interval)}</code>
                <code>{row.lap ?? "—"}</code>
                <span className="stint-board-pit">{row.inPit ? <b>Boxes</b> : row.pits || "—"}</span>
                <span className="stint-board-tyre">
                  {current && row.tyre ? (
                    <><b style={{ borderColor: current.color, color: current.color }} title={current.label}>{current.letter}</b>{row.tyre.age}</>
                  ) : "—"}
                </span>
                <span className="stint-board-track">
                  {ticks.map((tick) => <i key={tick} className="stint-board-tick" style={{ left: pct(tick) }} />)}
                  {stints.map((stint, index) => {
                    const info = compoundInfo(stint.compound);
                    const from = stint.lapStart - 1;
                    const to = Math.max(from, Math.min(stint.lapEnd ?? lap, lap));
                    const age = stint.ageAtStart + (to - from);
                    return (
                      <span
                        key={stint.stint}
                        className="stint-board-stint"
                        style={{ left: pct(from), width: `calc(${pct(to)} - ${pct(from)})`, "--tyre": info.color } as React.CSSProperties}
                        title={`${info.label}: vueltas ${stint.lapStart} a ${to}${stint.ageAtStart ? `, usados con ${stint.ageAtStart} vueltas` : ""}`}
                      >
                        <b>{info.letter}</b>
                        {index === stints.length - 1 && to - from >= 2 && <small>{age}</small>}
                      </span>
                    );
                  })}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
