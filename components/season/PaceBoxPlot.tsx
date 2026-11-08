import type { DriverPace } from "@/lib/season-pace";
import { decimal, lapTime } from "./SeasonShell";

/** One row per driver: whiskers from best to worst clean lap, box over the middle half, a tick at the median. */
export function PaceBoxPlot({ drivers }: { drivers: DriverPace[] }) {
  const width = 900;
  const left = 64;
  const right = 78;
  const row = 24;
  const top = 26;
  const height = top + drivers.length * row + 6;
  const fastest = Math.min(...drivers.map((driver) => driver.median));
  const min = Math.min(...drivers.map((driver) => driver.best));
  // Long tails would squash everyone else: cap the axis three and a half seconds off the best median.
  const max = Math.min(Math.max(...drivers.map((driver) => driver.worst)), fastest + 3.5);
  const span = Math.max(max - min, 0.5);
  const x = (value: number) => left + ((Math.min(value, max) - min) / span) * (width - left - right);
  const ticks: number[] = [];
  for (let tick = Math.ceil(min); tick <= max; tick += span > 4 ? 1 : 0.5) ticks.push(tick);

  return (
    <svg className="season-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Distribución de vueltas limpias por piloto">
      {ticks.map((tick) => (
        <g key={tick}>
          <line className="grid" x1={x(tick)} x2={x(tick)} y1={top - 6} y2={height - 4} />
          <text x={x(tick)} y={top - 12} textAnchor="middle">{lapTime(tick)}</text>
        </g>
      ))}
      {drivers.map((driver, index) => {
        const y = top + index * row + row / 2;
        return (
          <g className="row" key={driver.number}>
            <title>{`${driver.name}: mediana ${lapTime(driver.median)}, mitad central ${lapTime(driver.q1)}–${lapTime(driver.q3)}, mejor ${lapTime(driver.best)}, ${driver.laps} vueltas limpias`}</title>
            <rect className="hit" x={0} y={y - row / 2} width={width} height={row} />
            <text className="label" x={left - 10} y={y + 4} textAnchor="end">{driver.code}</text>
            <line className="whisker" x1={x(driver.best)} x2={x(driver.worst)} y1={y} y2={y} stroke={driver.color} strokeOpacity={0.55} />
            <rect className="box" x={x(driver.q1)} y={y - 6} width={Math.max(x(driver.q3) - x(driver.q1), 2)} height={12} rx={2} fill={driver.color} fillOpacity={0.85} />
            <line x1={x(driver.median)} x2={x(driver.median)} y1={y - 8} y2={y + 8} stroke="var(--a-text)" strokeWidth={2} />
            <text x={width - right + 10} y={y + 4}>{index === 0 ? lapTime(driver.median) : `+${decimal(driver.gap, 3)}`}</text>
          </g>
        );
      })}
    </svg>
  );
}
