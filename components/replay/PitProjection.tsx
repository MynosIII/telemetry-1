"use client";

import { useEffect, useMemo, useState } from "react";
import { formatLapTime } from "@/components/replay/format";
import { TyreChip } from "@/components/replay/TyreChip";
import { NEUTRALISED_FACTOR, compoundsUsed, estimatePitLoss, gapSeconds, projectStops, recentPace } from "@/components/replay/strategy";
import type { ReplayDriver, ReplaySession, ReplayTimeline } from "@/lib/replay";

export type TowerInput = {
  driver: ReplayDriver;
  position: number | null;
  gap: number | string | null;
  lap: number | null;
  inPit: boolean;
  lastLap: number | null;
  tyre: { compound: string; age: number } | null;
};

function seconds(value: number) {
  return `${Math.abs(value).toFixed(1).replace(".", ",")} s`;
}

/** Where each car would rejoin if it pitted now, who has to stop before a fresher car gets by, and the order once every pending stop is made. */
export function PitProjection({ data, timeline, rows, at, neutralised, selected, onSelect }: {
  data: ReplaySession;
  timeline: ReplayTimeline;
  rows: TowerInput[];
  at: number;
  neutralised: boolean;
  selected: number | null;
  onSelect: (driver: number) => void;
}) {
  const minute = Math.floor(at / 60_000);
  const estimate = useMemo(() => estimatePitLoss(data, timeline, minute * 60_000), [data, timeline, minute]);
  const [manual, setManual] = useState<number | null>(null);
  useEffect(() => setManual(null), [data.session.key]);
  const base = manual ?? Math.round(estimate.seconds * 10) / 10;
  const loss = neutralised ? base * NEUTRALISED_FACTOR : base;

  const mandatory = !/sprint/i.test(data.session.name);
  const leaderLap = rows.find((row) => row.position === 1)?.lastLap ?? null;
  const drivers = new Map(rows.map((row) => [row.driver.number, row.driver]));
  const tyres = new Map(rows.map((row) => [row.driver.number, row.tyre]));
  // Pace and stop counts only change lap by lap.
  const clock = Math.floor(at / 5_000) * 5_000;
  const history = useMemo(() => {
    const result = new Map<number, { stops: number; pace: number | null }>();
    for (const driver of data.drivers) {
      const pits = timeline.pits.filter((pit) => pit.driver === driver.number && pit.at <= clock);
      const pitLaps = new Set(pits.flatMap((pit) => (pit.lap === null ? [] : [pit.lap])));
      result.set(driver.number, { stops: pits.length, pace: recentPace(data.laps[driver.number] ?? [], clock, pitLaps) });
    }
    return result;
  }, [data, timeline, clock]);

  const projection = useMemo(() => {
    const input = rows
      .filter((row) => row.position !== null)
      .map((row) => ({
        driver: row.driver.number,
        position: row.position as number,
        gap: row.position === 1 ? 0 : gapSeconds(row.gap, leaderLap),
        compounds: compoundsUsed(data, row.driver.number, row.lap ?? 1),
        stops: history.get(row.driver.number)?.stops ?? 0,
        pace: history.get(row.driver.number)?.pace ?? null,
        inPit: row.inPit
      }));
    return projectStops(input, loss, mandatory).sort((a, b) => a.position - b.position);
  }, [rows, data, loss, leaderLap, mandatory, history]);
  const pending = projection.filter((row) => row.owes).length;
  const urgent = projection.filter((row) => row.shouldStop).length;

  return (
    <section className="replay-panel pit-projection" aria-label="Proyección de paradas">
      <h2>Paradas</h2>
      <div className="pit-loss">
        <label>
          <span>Pérdida en boxes</span>
          <input type="range" min={8} max={35} step={0.5} value={base} onChange={(event) => setManual(Number(event.target.value))} />
          <b>{seconds(base)}</b>
        </label>
        <p>
          {manual !== null ? "Valor elegido a mano. " : estimate.samples ? `Estimada con ${estimate.samples} ${estimate.samples === 1 ? "parada" : "paradas"} de esta carrera. ` : "Valor típico, todavía no hubo paradas para medirla. "}
          {neutralised && `Con safety car se calcula ${seconds(loss)}. `}
          {!mandatory
            ? "En el sprint no hay parada obligatoria."
            : pending
              ? `${pending} ${pending === 1 ? "piloto debe" : "pilotos deben"} su parada${urgent ? `, ${urgent} ${urgent === 1 ? "debería hacerla ya" : "deberían hacerla ya"}` : ""}.`
              : "Todos hicieron su parada obligatoria."}
        </p>
      </div>
      <div className="pit-table" role="table">
        <div className="pit-row pit-head" role="row">
          <span role="columnheader">Pos</span><span role="columnheader">Piloto</span><span role="columnheader">Neum.</span>
          <span role="columnheader">Ritmo</span><span role="columnheader">Si para ahora</span><span role="columnheader">Lo que viene de atrás</span>
          <span role="columnheader">Teórica</span>
        </div>
        {projection.map((row) => {
          const driver = drivers.get(row.driver);
          if (!driver) return null;
          const tyre = tyres.get(row.driver);
          const change = row.theoretical - row.position;
          const chaser = row.threat ? drivers.get(row.threat.driver)?.acronym : null;
          return (
            <button type="button" role="row" className="pit-row" key={row.driver} aria-pressed={selected === row.driver} onClick={() => onSelect(row.driver)}>
              <b>{row.position}</b>
              <span className="tower-driver">
                <i style={{ background: driver.color }} /><b>{driver.acronym}</b>
                {row.shouldStop ? <small className="pit-should">Debería parar</small> : row.owes ? <small className="pit-owes">Debe parar</small> : null}
              </span>
              <span>{tyre ? <TyreChip compound={tyre.compound} age={tyre.age} /> : "—"}</span>
              <code className="pit-muted">{formatLapTime(row.pace)}</code>
              {row.inPit ? <span className="pit-muted">En boxes</span> : (
                <span className="pit-between">
                  <b>P{row.rejoin}</b>
                  {row.ahead && <> · {seconds(row.ahead.margin)} tras {drivers.get(row.ahead.driver)?.acronym}</>}
                </span>
              )}
              <span className="pit-threat">
                {row.threat && chaser && (row.threat.laps === null
                  ? <>{chaser} ya le ganó la posición: saldría {seconds(row.threat.margin)} detrás</>
                  : <>{chaser} le descuenta {seconds(row.threat.gain).replace(" s", "")} s por vuelta: {row.threat.laps < 1 ? "si no para ahora, sale detrás" : `le quedan ${Math.floor(row.threat.laps)} ${Math.floor(row.threat.laps) === 1 ? "vuelta" : "vueltas"} para parar delante`}</>)}
              </span>
              <span className={change < 0 ? "pit-up" : change > 0 ? "pit-down" : "pit-muted"}>P{row.theoretical}{change ? ` (${change > 0 ? "−" : "+"}${Math.abs(change)})` : ""}</span>
            </button>
          );
        })}
      </div>
      <p className="stint-note">
        «Si para ahora» supone que solo para ese piloto. «Teórica» es la posición una vez que todos los que deben su parada la hacen.
        «Debería parar» aparece cuando un auto de atrás que ya paró, con gomas más nuevas, va más rápido y en un par de vueltas le ganaría el lugar en la parada.
      </p>
    </section>
  );
}
