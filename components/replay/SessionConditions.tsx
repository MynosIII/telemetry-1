"use client";

import { useMemo, useState } from "react";
import { TraceChart } from "@/components/replay/TraceChart";
import { formatClock } from "@/components/replay/format";
import { COMPOUNDS, compoundInfo, rainedBetween } from "@/components/replay/tyres";
import type { ReplaySession } from "@/lib/replay";

const TRACK_COLOR = "#c8701c";
const AIR_COLOR = "#2fa58e";

/** Weather through the session and every driver's tyre stints, with rain marked on both. */
export function SessionConditions({ data, selected, onSelect }: {
  data: ReplaySession;
  selected: number | null;
  onSelect: (driver: number) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const { weather, stints, laps, drivers } = data;
  const start = weather[0]?.at ?? Date.parse(data.session.startsAt);

  const minutes = weather.map((reading) => (reading.at - start) / 60_000);
  const span = Math.max(1, minutes.at(-1) ?? 1);
  const rainBands = useMemo(() => {
    const bands: [number, number][] = [];
    weather.forEach((reading, i) => {
      if (!reading.rain) return;
      const from = minutes[i];
      const to = minutes[i + 1] ?? from + 1;
      const last = bands.at(-1);
      if (last && Math.abs(last[1] - from) < 0.01) last[1] = to;
      else bands.push([from, to]);
    });
    return bands;
  }, [weather, minutes]);
  const temps = weather.flatMap((reading) => [reading.air, reading.track]).filter((value): value is number => value !== null);
  const low = Math.floor((Math.min(...temps, 20) - 2) / 5) * 5;
  const high = Math.ceil((Math.max(...temps, 30) + 2) / 5) * 5;
  const rained = weather.some((reading) => reading.rain);

  // The driver who covered the most laps sets the lap clock used to mark wet laps.
  const reference = Object.values(laps).sort((a, b) => b.length - a.length)[0] ?? [];
  const totalLaps = Math.max(1, ...Object.values(laps).map((list) => list.at(-1)?.lap ?? 0), ...stints.map((stint) => stint.lapEnd ?? 0));
  const wetLaps = reference.filter((lap) => lap.start !== null && rainedBetween(weather, lap.start, lap.start + (lap.duration ?? 100) * 1000)).map((lap) => lap.lap);

  // Race order: most laps first, then whoever started the last lap earlier.
  const order = drivers
    .filter((driver) => stints.some((stint) => stint.driver === driver.number))
    .map((driver) => {
      const list = laps[driver.number] ?? [];
      return { driver, count: list.length, lastStart: list.at(-1)?.start ?? Infinity, best: Math.min(...list.map((lap) => lap.duration ?? Infinity)) };
    })
    .sort((a, b) => data.session.type === "Race" ? b.count - a.count || a.lastStart - b.lastStart : a.best - b.best);

  const usedCompounds = Object.keys(COMPOUNDS).filter((compound) => stints.some((stint) => stint.compound === compound));
  const tickEvery = span > 90 ? 30 : 15;

  if (!weather.length && !stints.length) return null;

  return (
    <section className="session-conditions" aria-labelledby="conditions-title">
      <h2 id="conditions-title">Clima y neumáticos</h2>
      {weather.length > 0 && (
        <>
          <TraceChart
            title="Temperatura (°C)"
            series={[
              { key: "track", label: "Pista", color: TRACK_COLOR, x: minutes, y: weather.map((reading) => reading.track ?? NaN) },
              { key: "air", label: "Aire", color: AIR_COLOR, x: minutes, y: weather.map((reading) => reading.air ?? NaN) }
            ]}
            height={170}
            domain={[low, high]}
            ticks={[low, Math.round((low + high) / 10) * 5, high]}
            format={(v) => `${v.toFixed(1)}°`}
            maxX={span}
            formatX={(m) => `${formatClock(start + m * 60_000).slice(0, 5)} ARG`}
            xTicks={Array.from({ length: Math.floor(span / tickEvery) + 1 }, (_, i) => i * tickEvery)}
            bands={rainBands}
            hover={hover}
            onHover={setHover}
          />
          <p className="conditions-legend">
            <span><i style={{ background: TRACK_COLOR }} />Pista</span>
            <span><i style={{ background: AIR_COLOR }} />Aire</span>
            {rained ? <span><i className="conditions-rain" />Lluvia</span> : <span>Sin lluvia en la sesión</span>}
          </p>
        </>
      )}

      {stints.length > 0 && (
        <div className="stint-chart">
          <div className="stint-axis" aria-hidden="true">
            <span />
            <div>
              {Array.from({ length: Math.floor(totalLaps / 5) + 1 }, (_, i) => i * 5).filter((lap) => lap > 0).map((lap) => (
                <small key={lap} style={{ left: `${((lap - 0.5) / totalLaps) * 100}%` }}>{lap}</small>
              ))}
            </div>
          </div>
          {order.map(({ driver }) => (
            <button type="button" className="stint-row" key={driver.number} aria-pressed={selected === driver.number} onClick={() => onSelect(driver.number)}>
              <span className="stint-driver"><i style={{ background: driver.color }} />{driver.acronym}</span>
              <span className="stint-track">
                {wetLaps.map((lap) => (
                  <span key={lap} className="stint-wet" style={{ left: `${((lap - 1) / totalLaps) * 100}%`, width: `${100 / totalLaps}%` }} />
                ))}
                {stints.filter((stint) => stint.driver === driver.number).map((stint) => {
                  const info = compoundInfo(stint.compound);
                  const end = stint.lapEnd ?? laps[driver.number]?.at(-1)?.lap ?? stint.lapStart;
                  const length = end - stint.lapStart + 1;
                  return (
                    <span
                      key={stint.stint}
                      className="stint-bar"
                      title={`${info.label}: vueltas ${stint.lapStart}–${end}${stint.ageAtStart ? `, usados (${stint.ageAtStart} v.)` : ""}`}
                      style={{ left: `${((stint.lapStart - 1) / totalLaps) * 100}%`, width: `${(length / totalLaps) * 100}%`, background: info.color }}
                    >
                      {length / totalLaps > 0.06 ? info.letter : ""}
                    </span>
                  );
                })}
              </span>
            </button>
          ))}
          <p className="conditions-legend">
            {usedCompounds.map((compound) => (
              <span key={compound}><i style={{ background: COMPOUNDS[compound].color }} />{COMPOUNDS[compound].label}</span>
            ))}
            {wetLaps.length > 0 && <span><i className="conditions-rain" />Vueltas con lluvia</span>}
          </p>
        </div>
      )}
    </section>
  );
}
