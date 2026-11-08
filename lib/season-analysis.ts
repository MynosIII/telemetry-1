import { cache } from "react";
import { translate } from "./dictionary";
import { seasonTeam, seasonTeamId, teamOrder } from "./season-teams";

/**
 * Season-long analysis for the Temporada section, built from Jolpica (results, qualifying, sprints,
 * standings). JOLPICA_BASE_URL points local development at a stand-in when the API is unreachable.
 */
const API_ROOT = `${(process.env.JOLPICA_BASE_URL ?? "https://api.jolpi.ca").replace(/\/$/, "")}/ergast/f1`;
const PAGE = 100;
const REVALIDATE = 1800;

type Json = Record<string, any>;

async function getJson(path: string): Promise<Json> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(`${API_ROOT}${path}`, { next: { revalidate: REVALIDATE }, signal: AbortSignal.timeout(10_000) });
      if (response.status === 429) {
        await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
        continue;
      }
      if (!response.ok) throw new Error(`Jolpica ${response.status} ${path}`);
      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

/** Jolpica pages by result row, so one race can straddle two pages: merge them by round. */
async function allRaces(table: string, key: string): Promise<Json[]> {
  const rounds = new Map<string, Json>();
  let offset = 0;
  let total = Infinity;
  while (offset < total) {
    const body = await getJson(`/current/${table}.json?limit=${PAGE}&offset=${offset}`);
    total = Number(body.MRData?.total ?? 0);
    const races: Json[] = body.MRData?.RaceTable?.Races ?? [];
    for (const race of races) {
      const existing = rounds.get(race.round);
      if (existing) existing[key] = [...(existing[key] ?? []), ...(race[key] ?? [])];
      else rounds.set(race.round, { ...race, [key]: [...(race[key] ?? [])] });
    }
    if (!races.length) break;
    offset += PAGE;
  }
  return [...rounds.values()].sort((a, b) => Number(a.round) - Number(b.round));
}

export type Entry = {
  driverId: string;
  code: string;
  name: string;
  team: string;
  position: number | null;
  classified: boolean;
  grid: number | null;
  points: number;
  status: string;
  laps: number;
};

export type QualiEntry = { driverId: string; team: string; position: number | null; q1: number | null; q2: number | null; q3: number | null };

export type SeasonRace = {
  round: number;
  name: string;
  circuitId: string;
  date: string;
  results: Entry[];
  sprint: Entry[];
  qualifying: QualiEntry[];
};

export type SeasonData = { season: number; races: SeasonRace[]; live: boolean };

const shortName = (name: string) => name.replace(/^Gran Premio (de la |de los |de |del )?/i, "").replace(/ Grand Prix$/i, "");

function entry(raw: Json): Entry {
  const position = Number(raw.position);
  return {
    driverId: raw.Driver?.driverId ?? "",
    code: raw.Driver?.code ?? (raw.Driver?.familyName ?? "").slice(0, 3).toUpperCase(),
    name: `${raw.Driver?.givenName ?? ""} ${raw.Driver?.familyName ?? ""}`.trim(),
    team: seasonTeamId(raw.Constructor?.constructorId ?? raw.Constructor?.name ?? ""),
    position: Number.isFinite(position) ? position : null,
    // Jolpica numbers every car; positionText is R, D, W, N, E or F for cars that were not classified.
    classified: /^\d+$/.test(String(raw.positionText ?? raw.position ?? "")),
    grid: Number(raw.grid) > 0 ? Number(raw.grid) : null,
    points: Number(raw.points) || 0,
    status: String(raw.status ?? ""),
    laps: Number(raw.laps) || 0
  };
}

export function lapSeconds(value: unknown): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parts = value.trim().split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return null;
  return parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0];
}

export const getSeasonData = cache(async (): Promise<SeasonData> => {
  try {
    const [results, qualifying, sprints] = await Promise.all([
      allRaces("results", "Results"),
      allRaces("qualifying", "QualifyingResults"),
      allRaces("sprint", "SprintResults")
    ]);
    const qualiByRound = new Map(qualifying.map((race) => [race.round, race]));
    const sprintByRound = new Map(sprints.map((race) => [race.round, race]));
    const races: SeasonRace[] = results.map((race) => ({
      round: Number(race.round),
      name: shortName(translate(String(race.raceName ?? ""), "races")),
      circuitId: race.Circuit?.circuitId ?? "",
      date: race.date ?? "",
      results: (race.Results ?? []).map(entry),
      sprint: (sprintByRound.get(race.round)?.SprintResults ?? []).map(entry),
      qualifying: (qualiByRound.get(race.round)?.QualifyingResults ?? []).map((raw: Json) => ({
        driverId: raw.Driver?.driverId ?? "",
        team: seasonTeamId(raw.Constructor?.constructorId ?? ""),
        position: Number(raw.position) || null,
        q1: lapSeconds(raw.Q1),
        q2: lapSeconds(raw.Q2),
        q3: lapSeconds(raw.Q3)
      }))
    }));
    const season = Number(results[0]?.season ?? new Date().getUTCFullYear());
    return { season, races, live: true };
  } catch {
    return { season: new Date().getUTCFullYear(), races: [], live: false };
  }
});

// ---------------------------------------------------------------------------------------------
// Teammate head to head

export type DriverRef = { driverId: string; code: string; name: string };
export type Duel = { a: number; b: number };
export type TeammatePair = {
  team: string;
  a: DriverRef;
  b: DriverRef;
  races: number;
  qualifying: Duel;
  race: Duel;
  sprint: Duel;
  points: Duel;
  /** Median of A's qualifying gap to B, in percent of B's time (negative: A faster). */
  qualiGap: number | null;
  qualiGapSamples: number;
  bestFinish: Duel;
  dnf: Duel;
};

const median = (values: number[]) => {
  if (!values.length) return null;
  const sorted = [...values].sort((x, y) => x - y);
  const middle = sorted.length >> 1;
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

/** Times from the deepest session both drivers reached, so they are comparable. */
function commonQualiTimes(a: QualiEntry, b: QualiEntry): [number, number] | null {
  for (const key of ["q3", "q2", "q1"] as const) if (a[key] && b[key]) return [a[key]!, b[key]!];
  return null;
}

export function teammateDuels(data: SeasonData): TeammatePair[] {
  const pairs = new Map<string, TeammatePair>();
  const gaps = new Map<TeammatePair, number[]>();
  const drivers = new Map<string, DriverRef>();
  for (const race of data.races) for (const result of [...race.results, ...race.sprint]) {
    drivers.set(result.driverId, { driverId: result.driverId, code: result.code, name: result.name });
  }
  const pairFor = (team: string, x: string, y: string) => {
    const [first, second] = [x, y].sort();
    const key = `${team}:${first}:${second}`;
    let pair = pairs.get(key);
    if (!pair) {
      const zero = () => ({ a: 0, b: 0 });
      pair = {
        team, a: drivers.get(first)!, b: drivers.get(second)!, races: 0,
        qualifying: zero(), race: zero(), sprint: zero(), points: zero(), qualiGap: null, qualiGapSamples: 0,
        bestFinish: { a: 99, b: 99 }, dnf: zero()
      };
      pairs.set(key, pair);
      gaps.set(pair, []);
    }
    return { pair, aIsX: first === x };
  };
  const add = (duel: Duel, aIsX: boolean, xWins: boolean) => {
    if (xWins === aIsX) duel.a += 1; else duel.b += 1;
  };

  for (const race of data.races) {
    const byTeam = new Map<string, Entry[]>();
    for (const result of race.results) byTeam.set(result.team, [...(byTeam.get(result.team) ?? []), result]);
    for (const [team, entries] of byTeam) {
      for (let i = 0; i < entries.length; i += 1) for (let j = i + 1; j < entries.length; j += 1) {
        const x = entries[i];
        const y = entries[j];
        const { pair, aIsX } = pairFor(team, x.driverId, y.driverId);
        const [ax, bx] = aIsX ? [x, y] : [y, x];
        pair.races += 1;
        pair.points.a += ax.points;
        pair.points.b += bx.points;
        if (!ax.classified) pair.dnf.a += 1;
        if (!bx.classified) pair.dnf.b += 1;
        if (ax.classified && ax.position) pair.bestFinish.a = Math.min(pair.bestFinish.a, ax.position);
        if (bx.classified && bx.position) pair.bestFinish.b = Math.min(pair.bestFinish.b, bx.position);
        // A race duel needs both cars at the flag; a retirement says more about the car than the driver.
        if (x.classified && y.classified && x.position && y.position) add(pair.race, aIsX, x.position < y.position);
        const qx = race.qualifying.find((q) => q.driverId === x.driverId);
        const qy = race.qualifying.find((q) => q.driverId === y.driverId);
        if (qx?.position && qy?.position) add(pair.qualifying, aIsX, qx.position < qy.position);
        const times = qx && qy ? commonQualiTimes(qx, qy) : null;
        if (times) {
          const [tx, ty] = times;
          const gap = aIsX ? (tx - ty) / ty : (ty - tx) / tx;
          // Ignore laps ruined by a crash or a red flag: real teammate gaps stay within 2.5%.
          if (Math.abs(gap) < 0.025) gaps.get(pair)!.push(gap * 100);
        }
        const sx = race.sprint.find((s) => s.driverId === x.driverId);
        const sy = race.sprint.find((s) => s.driverId === y.driverId);
        if (sx && sy) {
          pair.points.a += aIsX ? sx.points : sy.points;
          pair.points.b += aIsX ? sy.points : sx.points;
          if (sx.classified && sy.classified && sx.position && sy.position) add(pair.sprint, aIsX, sx.position < sy.position);
        }
      }
    }
  }

  return [...pairs.values()]
    .map((pair) => ({ ...pair, qualiGap: median(gaps.get(pair)!), qualiGapSamples: gaps.get(pair)!.length }))
    // A pairing that only met once or twice (a stand-in driver) goes below the regular lineups.
    .sort((x, y) => (y.races >= 3 ? 1 : 0) - (x.races >= 3 ? 1 : 0) || teamOrder(x.team) - teamOrder(y.team) || y.races - x.races);
}

// ---------------------------------------------------------------------------------------------
// Constructors' championship, round by round

export type ConstructorProgress = {
  rounds: { round: number; name: string }[];
  teams: { team: string; name: string; color: string; points: number; wins: number; podiums: number; cumulative: number[] }[];
};

export function constructorProgress(data: SeasonData): ConstructorProgress {
  const totals = new Map<string, { points: number; wins: number; podiums: number; cumulative: number[] }>();
  const rounds = data.races.filter((race) => race.results.length);
  rounds.forEach((race, index) => {
    for (const result of [...race.results, ...race.sprint]) {
      const team = totals.get(result.team) ?? { points: 0, wins: 0, podiums: 0, cumulative: [] };
      team.points += result.points;
      totals.set(result.team, team);
    }
    for (const result of race.results) {
      const team = totals.get(result.team)!;
      if (result.classified && result.position === 1) team.wins += 1;
      if (result.classified && result.position && result.position <= 3) team.podiums += 1;
    }
    for (const team of totals.values()) team.cumulative[index] = team.points;
  });
  const teams = [...totals.entries()].map(([id, team]) => {
    const meta = seasonTeam(id);
    // Teams that joined late have holes at the start.
    const cumulative = rounds.map((_, index) => team.cumulative[index] ?? 0);
    return { team: id, name: meta.name, color: meta.color, points: team.points, wins: team.wins, podiums: team.podiums, cumulative };
  });
  teams.sort((a, b) => b.points - a.points || b.wins - a.wins);
  return { rounds: rounds.map((race) => ({ round: race.round, name: race.name })), teams };
}

// ---------------------------------------------------------------------------------------------
// Destructors' championship: who ends races in the wall

const CRASH = /accident|collision|spun|damage|debris|crash/i;

export type CrashRecord = { round: number; race: string; driver: string; session: "Carrera" | "Sprint"; status: string; lap: number };
export type DestructorRow = { team: string; name: string; color: string; crashes: number; drivers: Record<string, number>; records: CrashRecord[] };

export function destructorsChampionship(data: SeasonData): DestructorRow[] {
  const rows = new Map<string, DestructorRow>();
  for (const race of data.races) {
    for (const [session, entries] of [["Carrera", race.results], ["Sprint", race.sprint]] as const) {
      for (const result of entries) {
        if (result.classified || !CRASH.test(result.status)) continue;
        const meta = seasonTeam(result.team);
        const row = rows.get(result.team) ?? { team: result.team, name: meta.name, color: meta.color, crashes: 0, drivers: {}, records: [] };
        row.crashes += 1;
        row.drivers[result.name] = (row.drivers[result.name] ?? 0) + 1;
        row.records.push({ round: race.round, race: race.name, driver: result.name, session, status: result.status, lap: result.laps + 1 });
        rows.set(result.team, row);
      }
    }
  }
  return [...rows.values()].sort((a, b) => b.crashes - a.crashes || teamOrder(a.team) - teamOrder(b.team));
}

// ---------------------------------------------------------------------------------------------
// Results consistency across the season

export type ResultConsistency = {
  driverId: string;
  name: string;
  team: string;
  starts: number;
  finishes: number;
  averageFinish: number | null;
  /** Standard deviation of finishing positions, in places. */
  spread: number | null;
  /** Average places gained from the grid to the flag. */
  gained: number | null;
  pointsFinishes: number;
};

export function resultConsistency(data: SeasonData): ResultConsistency[] {
  const rows = new Map<string, Entry[]>();
  for (const race of data.races) for (const result of race.results) rows.set(result.driverId, [...(rows.get(result.driverId) ?? []), result]);
  return [...rows.values()]
    .map((entries) => {
      const last = entries.at(-1)!;
      const finished = entries.filter((result) => result.classified && result.position);
      const positions = finished.map((result) => result.position!);
      const mean = positions.length ? positions.reduce((sum, value) => sum + value, 0) / positions.length : null;
      const spread = mean !== null && positions.length > 1
        ? Math.sqrt(positions.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (positions.length - 1))
        : null;
      const gains = finished.filter((result) => result.grid).map((result) => result.grid! - result.position!);
      return {
        driverId: last.driverId,
        name: last.name,
        team: last.team,
        starts: entries.length,
        finishes: finished.length,
        averageFinish: mean,
        spread,
        gained: gains.length ? gains.reduce((sum, value) => sum + value, 0) / gains.length : null,
        pointsFinishes: entries.filter((result) => result.points > 0).length
      };
    })
    .filter((row) => row.starts >= 3)
    .sort((a, b) => (a.spread ?? 99) - (b.spread ?? 99));
}
