"use client";

import { useMemo, useState } from "react";
import { formatLapTime } from "@/components/replay/format";
import { compoundInfo } from "@/components/replay/tyres";
import type { ReplayDriver, ReplaySession } from "@/lib/replay";

const HEIGHT = 190;
const MARGIN = { top: 10, right: 12, bottom: 22, left: 58 };

type Point = { age: number; lap: number; time: number; slow: boolean };

function slope(points: Point[]) {
  if (points.length < 3) return null;
  const n = points.length;
  const mx = points.reduce((sum, p) => sum + p.age, 0) / n;
  const my = points.reduce((sum, p) => sum + p.time, 0) / n;
  const sxx = points.reduce((sum, p) => sum + (p.age - mx) ** 2, 0);
  return sxx ? points.reduce((sum, p) => sum + (p.age - mx) * (p.time - my), 0) / sxx : null;
}

/** Lap times since each tyre change, the current stint on top of the earlier ones. */
export function StintChart({ data, driver, at }: { data: ReplaySession; driver: ReplayDriver; at: number }) {
  const [box, setBox] = useState<HTMLDivElement | null>(null);
  const width = Math.max(260, box?.clientWidth ?? 520);
  const lapClock = Math.floor(at / 2000);

  const stints = useMemo(() => {
    const laps = (data.laps[driver.number] ?? []).filter((lap) => lap.start !== null && lap.duration !== null && lap.start + lap.duration * 1000 <= lapClock * 2000);
    return data.stints
      .filter((stint) => stint.driver === driver.number)
      .map((stint) => {
        const points = laps
          .filter((lap) => lap.lap >= stint.lapStart && (stint.lapEnd === null || lap.lap <= stint.lapEnd) && !lap.pitOut && lap.lap > 1)
          .map((lap) => ({ age: stint.ageAtStart + lap.lap - stint.lapStart + 1, lap: lap.lap, time: lap.duration as number, slow: false }));
        return { stint, points };
      })
      .filter((item) => item.points.length);
  }, [data, driver.number, lapClock]);

  const current = stints.at(-1);
  const all = stints.flatMap((item) => item.points);
  if (!current || !all.length) {
    return (
      <section className="replay-panel stint-chart">
        <h2>Stint de {driver.acronym}</h2>
        <p className="replay-empty">Todavía no completó vueltas con estos neumáticos.</p>
      </section>
    );
  }

  // Laps far off the pace (safety car, traffic, the in-lap) are drawn at the top edge.
  const sorted = all.map((p) => p.time).sort((a, b) => a - b);
  const reference = sorted[Math.floor(sorted.length * 0.3)];
  const ceiling = reference * 1.06;
  for (const item of stints) for (const p of item.points) p.slow = p.time > ceiling;
  const fast = all.filter((p) => !p.slow).map((p) => p.time);
  const low = Math.min(...fast) - 0.3;
  const high = Math.min(ceiling, Math.max(...fast) + 0.3);
  const maxAge = Math.max(...all.map((p) => p.age), 5);
  const plotW = width - MARGIN.left - MARGIN.right;
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom;
  const x = (age: number) => MARGIN.left + ((age - 1) / Math.max(1, maxAge - 1)) * plotW;
  const y = (time: number) => MARGIN.top + (1 - (Math.min(time, high) - low) / (high - low || 1)) * plotH;
  const ticks = [low + 0.3, (low + high) / 2, high - 0.3].filter((value, i, list) => i === 0 || value - list[i - 1] > 0.2);

  const info = compoundInfo(current.stint.compound);
  const clean = current.points.filter((p) => !p.slow);
  const trend = slope(clean);
  const lastThree = clean.slice(-3);
  const average = lastThree.length ? lastThree.reduce((sum, p) => sum + p.time, 0) / lastThree.length : null;

  return (
    <section className="replay-panel stint-chart" aria-label={`Stint de ${driver.name}`}>
      <h2>Stint de {driver.acronym}</h2>
      <p className="stint-summary">
        <b style={{ color: info.color }}>{info.label}</b>, {current.points.at(-1)?.age} vueltas de uso
        {average !== null && <> · últimas {lastThree.length}: {formatLapTime(average)}</>}
        {trend !== null && <> · {trend >= 0 ? "pierde" : "gana"} {Math.abs(trend).toFixed(2).replace(".", ",")} s por vuelta</>}
      </p>
      <div ref={setBox}>
        <svg viewBox={`0 0 ${width} ${HEIGHT}`} width="100%" height={HEIGHT} role="img" aria-label="Tiempos de vuelta según el uso del neumático">
          {ticks.map((value) => (
            <g key={value}>
              <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(value)} y2={y(value)} className="dt-grid" />
              <text x={MARGIN.left - 6} y={y(value) + 3} textAnchor="end" className="dt-tick">{formatLapTime(value)}</text>
            </g>
          ))}
          {[1, Math.round(maxAge / 2), maxAge].map((age) => (
            <text key={age} x={x(age)} y={HEIGHT - 6} textAnchor="middle" className="dt-tick">{age}</text>
          ))}
          {stints.map(({ stint, points }) => {
            const isCurrent = stint === current.stint;
            const color = isCurrent ? compoundInfo(stint.compound).color : "#4a4a4a";
            const line = points.filter((p) => !p.slow).map((p, i) => `${i ? "L" : "M"}${x(p.age).toFixed(1)},${y(p.time).toFixed(1)}`).join("");
            return (
              <g key={stint.stint}>
                <path d={line} fill="none" stroke={color} strokeWidth={isCurrent ? 2 : 1.25} />
                {points.map((p) => (
                  <circle key={p.lap} cx={x(p.age)} cy={y(p.time)} r={isCurrent ? 3 : 2} fill={p.slow ? "none" : color} stroke={color}>
                    <title>Vuelta {p.lap} · {compoundInfo(stint.compound).label} de {p.age} vueltas · {formatLapTime(p.time)}</title>
                  </circle>
                ))}
              </g>
            );
          })}
        </svg>
      </div>
      {stints.length > 1 && <p className="stint-note">En gris, los stints anteriores. Los puntos huecos son vueltas lentas (boxes, safety car o tráfico).</p>}
    </section>
  );
}
