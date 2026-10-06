"use client";

import { useEffect, useMemo, useState } from "react";
import { TyreChip } from "@/components/replay/TyreChip";
import { NEUTRALISED_FACTOR, compoundsUsed, estimatePitLoss, gapSeconds, projectStops } from "@/components/replay/strategy";
import type { ReplayDriver, ReplaySession, ReplayTimeline } from "@/lib/replay";

export type ProjectionInput = {
  driver: ReplayDriver;
  position: number | null;
  gap: number | string | null;
  lap: number | null;
  inPit: boolean;
  lastLap: number | null;
};

function seconds(value: number) {
  return `${value.toFixed(1).replace(".", ",")} s`;
}

/** Where each car would rejoin if it pitted now, and the order once every pending stop is made. */
export function PitProjection({ data, timeline, rows, at, neutralised, selected, onSelect }: {
  data: ReplaySession;
  timeline: ReplayTimeline;
  rows: ProjectionInput[];
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
  const projection = useMemo(() => {
    const input = rows
      .filter((row) => row.position !== null)
      .map((row) => ({
        driver: row.driver.number,
        position: row.position as number,
        gap: row.position === 1 ? 0 : gapSeconds(row.gap, leaderLap),
        compounds: compoundsUsed(data, row.driver.number, row.lap ?? 1)
      }));
    return projectStops(input, loss, mandatory);
  }, [rows, data, loss, leaderLap, mandatory]);
  const inPit = new Set(rows.filter((row) => row.inPit).map((row) => row.driver.number));
  const pending = projection.filter((row) => row.owes).length;

  return (
    <section className="replay-panel pit-projection" aria-label="Proyección de paradas">
      <h2>Si paran ahora</h2>
      <div className="pit-loss">
        <label>
          <span>Pérdida en boxes</span>
          <input type="range" min={8} max={35} step={0.5} value={base} onChange={(event) => setManual(Number(event.target.value))} />
          <b>{seconds(base)}</b>
        </label>
        <p>
          {manual !== null ? "Valor elegido a mano. " : estimate.samples ? `Estimada con ${estimate.samples} ${estimate.samples === 1 ? "parada" : "paradas"} de esta carrera. ` : "Valor típico, todavía no hubo paradas para medirla. "}
          {neutralised && `Con safety car se calcula ${seconds(loss)}. `}
          {!mandatory ? "En el sprint no hay parada obligatoria." : pending ? `${pending} ${pending === 1 ? "piloto debe" : "pilotos deben"} la parada obligatoria.` : "Nadie debe la parada obligatoria."}
        </p>
      </div>
      <div className="pit-table" role="table">
        <div className="pit-row pit-head" role="row">
          <span role="columnheader">Pos</span><span role="columnheader">Piloto</span><span role="columnheader">Neum.</span>
          <span role="columnheader">Sale</span><span role="columnheader">Margen al salir</span><span role="columnheader">Con paradas</span>
        </div>
        {[...projection].sort((a, b) => a.position - b.position).map((row) => {
          const driver = drivers.get(row.driver);
          if (!driver) return null;
          const change = row.virtual - row.position;
          return (
            <button type="button" role="row" className="pit-row" key={row.driver} aria-pressed={selected === row.driver} onClick={() => onSelect(row.driver)}>
              <b>{row.position}</b>
              <span className="tower-driver"><i style={{ background: driver.color }} /><b>{driver.acronym}</b>{row.owes && <small className="pit-owes">Debe parar</small>}</span>
              <span className="pit-compounds">{row.compounds.map((compound) => <TyreChip key={compound} compound={compound} />)}</span>
              {inPit.has(row.driver) ? <span className="pit-muted">En boxes</span> : <b>P{row.rejoin}</b>}
              <span className="pit-between">
                {inPit.has(row.driver) ? null : (
                  <>
                    {row.ahead && <>{seconds(row.ahead.margin)} detrás de {drivers.get(row.ahead.driver)?.acronym}</>}
                    {row.ahead && row.behind && " · "}
                    {row.behind && <>{seconds(row.behind.margin)} delante de {drivers.get(row.behind.driver)?.acronym}</>}
                  </>
                )}
              </span>
              <span className={change < 0 ? "pit-up" : change > 0 ? "pit-down" : "pit-muted"}>P{row.virtual}{change ? ` (${change > 0 ? "−" : "+"}${Math.abs(change)})` : ""}</span>
            </button>
          );
        })}
      </div>
      <p className="stint-note">«Sale» supone que solo para ese piloto. «Con paradas» suma la pérdida a todos los que todavía deben su parada obligatoria.</p>
    </section>
  );
}
