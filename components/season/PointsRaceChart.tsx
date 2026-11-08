import type { ConstructorProgress } from "@/lib/season-analysis";

/** Cumulative points after each round, one line per team, labelled at the right end. */
export function PointsRaceChart({ progress }: { progress: ConstructorProgress }) {
  const width = 900;
  const height = 360;
  const left = 40;
  const right = 120;
  const top = 12;
  const bottom = 28;
  const rounds = progress.rounds.length;
  const max = Math.max(...progress.teams.map((team) => team.points), 1);
  const x = (index: number) => left + (rounds > 1 ? (index / (rounds - 1)) * (width - left - right) : 0);
  const y = (points: number) => top + (1 - points / max) * (height - top - bottom);
  const step = max > 400 ? 100 : max > 150 ? 50 : 25;
  const gridLines: number[] = [];
  for (let value = 0; value <= max; value += step) gridLines.push(value);

  // Spread end labels so close finishers don't overprint each other.
  const labels = progress.teams.map((team) => ({ team, y: y(team.points) }));
  for (let i = 1; i < labels.length; i += 1) if (labels[i].y - labels[i - 1].y < 13) labels[i].y = labels[i - 1].y + 13;

  return (
    <svg className="season-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Puntos acumulados por equipo en cada carrera">
      {gridLines.map((value) => (
        <g key={value}>
          <line className="grid" x1={left} x2={width - right} y1={y(value)} y2={y(value)} />
          <text x={left - 8} y={y(value) + 4} textAnchor="end">{value}</text>
        </g>
      ))}
      {progress.rounds.map((round, index) => (index % Math.ceil(rounds / 12) === 0 || index === rounds - 1) ? (
        <text key={round.round} x={x(index)} y={height - 8} textAnchor="middle">{round.name.slice(0, 3).toUpperCase()}</text>
      ) : null)}
      {[...progress.teams].reverse().map((team) => (
        <g key={team.team}>
          <title>{`${team.name}: ${team.points} puntos`}</title>
          <polyline fill="none" stroke={team.color} strokeWidth={2} strokeLinejoin="round" points={team.cumulative.map((points, index) => `${x(index)},${y(points)}`).join(" ")} />
          {team.cumulative.map((points, index) => (
            <circle key={index} cx={x(index)} cy={y(points)} r={7} fill="transparent"><title>{`${team.name}, ${progress.rounds[index].name}: ${points} puntos`}</title></circle>
          ))}
        </g>
      ))}
      {labels.map(({ team, y: labelY }) => (
        <g key={team.team}>
          <circle cx={x(rounds - 1)} cy={y(team.points)} r={3.5} fill={team.color} stroke="var(--a-panel)" strokeWidth={2} />
          <text className="label" x={width - right + 12} y={labelY + 4}>{team.name} <tspan fill="var(--a-muted)">{team.points}</tspan></text>
        </g>
      ))}
    </svg>
  );
}
