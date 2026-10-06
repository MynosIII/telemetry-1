import Link from "next/link";
import type { HistoricRace } from "@/lib/championship-history";
import { FIRST_LAP_CHART_SEASON, getLapPositions, leadStints } from "@/lib/lap-chart";
import { teamColor } from "@/lib/team-lineage";

const surname = (name: string) => name.split(" ").filter(w => !/^(jr|sr|ii|iii)\.?$/i.test(w)).slice(-1)[0] ?? name;
/** Dark liveries (Red Bull navy) vanish on the black page: lift them toward white. */
function visible(color: string) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
  if (Math.max(r, g, b) >= 140) return color;
  return `#${[r, g, b].map(c => Math.round(c + (255 - c) * .4).toString(16).padStart(2, "0")).join("")}`;
}

/** Position of every driver on every lap, with the grid as lap 0 and the race leaders below. */
export async function RaceLapChart({ race }: { race: HistoricRace }) {
  if (race.year < FIRST_LAP_CHART_SEASON) return null;
  const data = await getLapPositions(race.year, race.round);
  if (!data) return <p className="ency-note">No pudimos cargar las vueltas de esta carrera. Probá de nuevo más tarde.</p>;
  const entries = new Map(race.sessions.race.map(r => [r.driver.id, r]));
  const seenTeams = new Set<string>();
  const rows = [...data.drivers].map(([id, positions]) => {
    const entry = entries.get(id);
    const team = entry?.constructor.id ?? "";
    // The second car of a team keeps the livery colour but draws dashed.
    const dashed = seenTeams.has(team);
    seenTeams.add(team);
    const grid = typeof entry?.gridPosition === "number" && entry.gridPosition > 0 ? entry.gridPosition : null;
    const last = positions.findLastIndex(p => p != null);
    return { id, name: entry?.driver.name ?? id, href: entry?.driver.href, team, dashed, grid, positions, last, final: positions[last] ?? null };
  }).sort((a, b) => (a.final ?? 99) - (b.final ?? 99));
  const field = Math.max(...rows.map(r => Math.max(r.grid ?? 0, ...r.positions.map(p => p ?? 0))));
  const W = 800, left = 40, right = 92, top = 14, H = Math.max(260, field * 17 + 40);
  const x = (lap: number) => left + lap / data.laps * (W - left - right);
  const y = (pos: number) => top + (pos - 1) / Math.max(1, field - 1) * (H - top - 30);
  const step = data.laps > 60 ? 10 : 5;
  const leaders = rows.map(r => ({ ...r, stints: leadStints(r.positions) })).filter(r => r.stints.length)
    .map(r => ({ ...r, led: r.stints.reduce((sum, [a, b]) => sum + b - a + 1, 0) })).sort((a, b) => b.led - a.led);

  return <>
    <figure className="lap-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Posición de cada piloto en las ${data.laps} vueltas del ${race.name}. Líderes en la tabla siguiente.`}>
        {Array.from({ length: Math.floor(data.laps / step) + 1 }, (_, i) => i * step).map(lap => <g key={lap} className="lap-chart-grid"><line x1={x(lap)} x2={x(lap)} y1={top - 6} y2={H - 24} /><text x={x(lap)} y={H - 8} textAnchor="middle">{lap === 0 ? "Largada" : lap}</text></g>)}
        {rows.map(r => {
          const points: string[] = [];
          if (r.grid) points.push(`${x(0)},${y(r.grid)}`);
          r.positions.forEach((p, i) => { if (p != null) points.push(`${x(i + 1).toFixed(1)},${y(p).toFixed(1)}`); });
          const end = r.positions[r.last];
          return <g key={r.id} className="lap-chart-line">
            <title>{`${r.name}: largó ${r.grid ?? "—"}, ${r.last + 1 < data.laps ? `abandonó en la vuelta ${r.last + 1}` : `terminó ${end}`}`}</title>
            <polyline points={points.join(" ")} stroke={visible(teamColor(r.team))} strokeDasharray={r.dashed ? "5 3" : undefined} />
            {end != null ? <text x={x(r.last + 1) + 6} y={y(end) + 4}>{surname(r.name)}</text> : null}
          </g>;
        })}
        {Array.from({ length: field }, (_, i) => i + 1).map(p => <text key={p} className="lap-chart-pos" x={left - 10} y={y(p) + 4} textAnchor="end">{p}</text>)}
      </svg>
    </figure>
    <p className="ency-note">Pasá el cursor por una línea para ver a quién corresponde. El segundo auto de cada equipo va punteado. Datos de Jolpica.{race.year >= 2023 ? <> También podés ver esta carrera en la <Link href="/en-vivo/repeticion">repetición</Link>, con el mapa y los tiempos.</> : null}</p>
    {leaders.length ? <div className="ency-table-scroll"><table>
      <caption>Líderes de la carrera</caption>
      <thead><tr><th>Piloto</th><th>Vueltas al frente</th><th>Tramos</th></tr></thead>
      <tbody>{leaders.map(r => <tr key={r.id}><th scope="row">{r.href ? <Link href={r.href} prefetch={false}>{r.name}</Link> : r.name}</th><td>{r.led}</td><td>{r.stints.map(([a, b]) => a === b ? `${a}` : `${a}–${b}`).join(", ")}</td></tr>)}</tbody>
    </table></div> : null}
  </>;
}
