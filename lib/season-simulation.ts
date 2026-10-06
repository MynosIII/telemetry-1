import type { ArchiveRef, Championship, StandingRow } from "./championship-history";

// Current (2025) scoring, applied to every season with no dropped scores or reduced-points races.
export const RACE_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
export const SPRINT_POINTS = [8, 7, 6, 5, 4, 3, 2, 1];
export const FIRST_CONSTRUCTORS_SEASON = 1958;

export type SimEntry = { driver: string; team: string; position: number | null };
// The Indianapolis 500 (1950-1960) scored for drivers only, never for constructors.
export type SimRound = { round: number; name: string; constructors: boolean; race: SimEntry[]; sprint: SimEntry[]; fastest: string[] };
export type SimInput = {
  year: number; rounds: SimRound[];
  drivers: Record<string, ArchiveRef>; teams: Record<string, { entity: ArchiveRef; engine: ArchiveRef | null }>;
  realDrivers: StandingRow[]; realConstructors: StandingRow[];
};
export type SimRow = { id: string; entity: ArchiveRef; engine: ArchiveRef | null; points: number; position: number; realPosition: number | null; realPoints: number | null };

export const teamKey = (constructor: ArchiveRef, engine: ArchiveRef | null | undefined) => `${constructor.id}/${engine?.id ?? ""}`;
const numeric = (position: unknown) => typeof position === "number" ? position : null;

type SprintRow = { position: number | string | null; driver: ArchiveRef; constructor: ArchiveRef; engine: ArchiveRef | null };
export function simulationInput(season: Championship, sprints: Record<number, SprintRow[]>): SimInput {
  const drivers: SimInput["drivers"] = {}, teams: SimInput["teams"] = {};
  const rounds = season.races.map(race => ({ round: race.round, name: race.eventName, constructors: !/indianapolis/i.test(race.eventName), race: [] as SimEntry[], sprint: [] as SimEntry[], fastest: [] as string[] }));
  const byRound = new Map(rounds.map(r => [r.round, r]));
  season.driverStandings.forEach(row => { drivers[row.entity.id] = row.entity; });
  for (const [driver, results] of Object.entries(season.driverResults)) for (const [round, cells] of Object.entries(results)) {
    const target = byRound.get(Number(round));
    if (!target) continue;
    for (const cell of cells) {
      const team = teamKey(cell.constructor, cell.engine);
      teams[team] ??= { entity: cell.constructor, engine: cell.engine ?? null };
      target.race.push({ driver, team, position: numeric(cell.position) });
    }
    // "fastest" is flagged per driver and round, on every car the driver raced.
    if (cells.some(cell => cell.fastest)) target.fastest.push(driver);
  }
  for (const [round, rows] of Object.entries(sprints)) {
    const target = byRound.get(Number(round));
    if (!target) continue;
    for (const row of rows) {
      const team = teamKey(row.constructor, row.engine);
      drivers[row.driver.id] ??= row.driver;
      teams[team] ??= { entity: row.constructor, engine: row.engine };
      target.sprint.push({ driver: row.driver.id, team, position: numeric(row.position) });
    }
  }
  return { year: season.year, rounds, drivers, teams, realDrivers: season.driverStandings, realConstructors: season.constructorStandings };
}

export function missingFastestLaps(input: SimInput) { return input.rounds.filter(r => !r.fastest.length).map(r => r.name); }

export function simulate(input: SimInput, fastestLapPoint: boolean) {
  const driverPoints = new Map<string, number>(), teamPoints = new Map<string, number>();
  const driverFinishes = new Map<string, number[]>(), teamFinishes = new Map<string, number[]>();
  const add = (map: Map<string, number>, id: string, value: number) => map.set(id, (map.get(id) ?? 0) + value);
  const finish = (map: Map<string, number[]>, id: string, position: number) => { const list = map.get(id) ?? []; list[position] = (list[position] ?? 0) + 1; map.set(id, list); };
  for (const round of input.rounds) {
    for (const [entries, scale] of [[round.race, RACE_POINTS], [round.sprint, SPRINT_POINTS]] as const) {
      // Drivers who shared one car share its result, so they split the points as in the 1950s.
      const cars = new Map<string, SimEntry[]>();
      for (const entry of entries) if (entry.position !== null) {
        const key = `${entry.team}|${entry.position}`;
        cars.set(key, [...(cars.get(key) ?? []), entry]);
      }
      for (const crew of cars.values()) {
        const { team, position } = crew[0], points = scale[position! - 1] ?? 0;
        crew.forEach(entry => add(driverPoints, entry.driver, points / crew.length));
        if (round.constructors) add(teamPoints, team, points);
        if (scale === RACE_POINTS) { crew.forEach(entry => finish(driverFinishes, entry.driver, position!)); if (round.constructors) finish(teamFinishes, team, position!); }
      }
    }
    if (fastestLapPoint && round.fastest.length) {
      // As in 2019-2024: the point only goes to a top-10 finisher; shared fastest laps split it.
      const share = 1 / round.fastest.length;
      for (const driver of round.fastest) {
        const best = round.race.filter(e => e.driver === driver && e.position !== null && e.position <= 10).sort((a, b) => a.position! - b.position!)[0];
        if (!best) continue;
        add(driverPoints, driver, share);
        if (round.constructors) add(teamPoints, best.team, share);
      }
    }
  }
  const drivers = new Map<string, { entity: ArchiveRef; engine: ArchiveRef | null }>();
  Object.entries(input.drivers).forEach(([id, entity]) => drivers.set(id, { entity, engine: null }));
  input.rounds.forEach(r => r.race.forEach(e => { if (!drivers.has(e.driver)) drivers.set(e.driver, { entity: { id: e.driver, name: e.driver, href: null }, engine: null }); }));
  const realDriver = new Map(input.realDrivers.map(r => [r.entity.id, r]));
  const realTeam = new Map(input.realConstructors.map(r => [teamKey(r.entity, r.engine), r]));
  return {
    drivers: rank(drivers, driverPoints, driverFinishes, realDriver),
    constructors: input.year >= FIRST_CONSTRUCTORS_SEASON ? rank(new Map(Object.entries(input.teams).filter(([id]) => teamPoints.has(id) || realTeam.has(id))), teamPoints, teamFinishes, realTeam) : [],
  };
}

function rank(entities: Map<string, { entity: ArchiveRef; engine: ArchiveRef | null }>, points: Map<string, number>, finishes: Map<string, number[]>, real: Map<string, StandingRow>): SimRow[] {
  const countback = (a: string, b: string) => {
    const fa = finishes.get(a) ?? [], fb = finishes.get(b) ?? [];
    for (let p = 1; p < Math.max(fa.length, fb.length); p++) if ((fa[p] ?? 0) !== (fb[p] ?? 0)) return (fb[p] ?? 0) - (fa[p] ?? 0);
    return 0;
  };
  const rows = [...entities].map(([id, { entity, engine }]) => {
    const r = real.get(id);
    return { id, entity, engine, points: Math.round((points.get(id) ?? 0) * 100) / 100, position: 0, realPosition: typeof r?.position === "number" ? r.position : null, realPoints: r?.points ?? null };
  });
  const realOrder = (row: SimRow) => row.realPosition ?? Infinity;
  rows.sort((a, b) => b.points - a.points || countback(a.id, b.id) || realOrder(a) - realOrder(b) || a.entity.name.localeCompare(b.entity.name, "es"));
  rows.forEach((row, i) => {
    const prev = rows[i - 1];
    row.position = prev && prev.points === row.points && countback(prev.id, row.id) === 0 ? prev.position : i + 1;
  });
  return rows;
}
