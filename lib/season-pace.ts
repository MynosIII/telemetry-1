import { cache } from "react";
import { translate } from "./dictionary";
import { num, str, type Row } from "./openf1";
import { seasonTeam, seasonTeamId } from "./season-teams";

/**
 * Race pace, lap consistency and pit stops from OpenF1 lap timing. Finished races never change,
 * so every request is cached for a day; the session list refreshes every half hour.
 */
const ROOT = `${(process.env.OPENF1_BASE_URL ?? "https://api.openf1.org").replace(/\/$/, "")}/v1`;

async function get(path: string, revalidate: number): Promise<Row[]> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${ROOT}${path}`, { next: { revalidate }, signal: AbortSignal.timeout(20_000) });
    if (response.status === 404) return [];
    if (response.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
      continue;
    }
    if (!response.ok) throw new Error(`OpenF1 ${response.status} ${path}`);
    const body: unknown = await response.json();
    return Array.isArray(body) ? (body as Row[]) : [];
  }
  throw new Error(`OpenF1 rate limit ${path}`);
}

export type RaceSession = {
  key: number;
  meeting: number;
  name: string;
  /** Spanish label: the country, or the city when the country hosts two races. */
  country: string;
  circuit: string;
  date: string;
  sprint: boolean;
};

const titleCase = (name: string) => name.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, gap: string, letter: string) => gap + letter.toUpperCase());

export const getRaceSessions = cache(async (year: number): Promise<RaceSession[]> => {
  try {
    const rows = await get(`/sessions?year=${year}&session_type=Race`, 1800);
    const now = Date.now();
    const races = rows.filter((row) => !/sprint/i.test(str(row.session_name)));
    const perCountry = new Map<string, number>();
    for (const row of races) perCountry.set(str(row.country_name), (perCountry.get(str(row.country_name)) ?? 0) + 1);
    const label = (row: Row) => (perCountry.get(str(row.country_name)) ?? 0) > 1
      ? str(row.location) || str(row.circuit_short_name)
      : translate(str(row.country_name), "countries");
    return rows
      .filter((row) => Date.parse(str(row.date_end)) < now)
      .map((row) => ({
        key: num(row.session_key) ?? 0,
        meeting: num(row.meeting_key) ?? 0,
        name: str(row.session_name),
        country: label(row),
        circuit: str(row.circuit_short_name) || str(row.location),
        date: str(row.date_start).slice(0, 10),
        sprint: /sprint/i.test(str(row.session_name))
      }))
      .filter((session) => session.key)
      .sort((a, b) => a.date.localeCompare(b.date) || Number(a.sprint) - Number(b.sprint));
  } catch {
    return [];
  }
});

type DriverInfo = { number: number; code: string; name: string; team: string };

function driverMap(rows: Row[]) {
  const map = new Map<number, DriverInfo>();
  for (const row of rows) {
    const number = num(row.driver_number);
    if (number === null) continue;
    map.set(number, {
      number,
      code: str(row.name_acronym) || String(number),
      name: titleCase(str(row.full_name) || str(row.broadcast_name) || String(number)),
      team: seasonTeamId(str(row.team_name))
    });
  }
  return map;
}

export type DriverPace = {
  number: number;
  code: string;
  name: string;
  team: string;
  color: string;
  laps: number;
  median: number;
  q1: number;
  q3: number;
  best: number;
  worst: number;
  /** Seconds off the fastest median. */
  gap: number;
  /** Spread of clean laps once each stint's tyre and fuel trend is taken out, in seconds. */
  consistency: number;
  /** Raw standard deviation of clean laps, in seconds. */
  deviation: number;
};

export type RacePace = {
  session: RaceSession;
  drivers: DriverPace[];
  teams: { team: string; name: string; color: string; median: number; gap: number }[];
  neutralisedLaps: number[];
  totalLaps: number;
};

const quantile = (sorted: number[], q: number) => {
  const position = (sorted.length - 1) * q;
  const low = Math.floor(position);
  const high = Math.ceil(position);
  return sorted[low] + (sorted[high] - sorted[low]) * (position - low);
};
const medianOf = (values: number[]) => quantile([...values].sort((a, b) => a - b), 0.5);

/** Residual spread around a straight line per stint: tyre wear and fuel burn are not inconsistency. */
function detrendedSpread(stints: { lap: number; time: number }[][]) {
  const residuals: number[] = [];
  for (const stint of stints) {
    if (stint.length < 4) continue;
    const n = stint.length;
    const mx = stint.reduce((sum, p) => sum + p.lap, 0) / n;
    const my = stint.reduce((sum, p) => sum + p.time, 0) / n;
    const sxx = stint.reduce((sum, p) => sum + (p.lap - mx) ** 2, 0);
    const slope = sxx ? stint.reduce((sum, p) => sum + (p.lap - mx) * (p.time - my), 0) / sxx : 0;
    for (const p of stint) residuals.push(p.time - (my + slope * (p.lap - mx)));
  }
  if (residuals.length < 4) return null;
  return Math.sqrt(residuals.reduce((sum, value) => sum + value * value, 0) / (residuals.length - 2));
}

export async function getRacePace(session: RaceSession): Promise<RacePace | null> {
  const [laps, drivers, pits, stints] = await Promise.all([
    get(`/laps?session_key=${session.key}`, 86_400),
    get(`/drivers?session_key=${session.key}`, 86_400),
    get(`/pit?session_key=${session.key}`, 86_400),
    get(`/stints?session_key=${session.key}`, 86_400)
  ]);
  if (!laps.length) return null;
  const info = driverMap(drivers);

  // Laps run behind the safety car or under a red flag: the field-wide median jumps.
  const byLap = new Map<number, number[]>();
  for (const row of laps) {
    const lap = num(row.lap_number);
    const time = num(row.lap_duration);
    if (lap && time) byLap.set(lap, [...(byLap.get(lap) ?? []), time]);
  }
  const lapMedians = [...byLap.entries()].map(([lap, times]) => [lap, medianOf(times)] as const);
  const reference = medianOf(lapMedians.filter(([lap]) => lap > 1).map(([, value]) => value));
  const neutralised = new Set(lapMedians.filter(([, value]) => value > reference * 1.08).map(([lap]) => lap));

  const pitLaps = new Map<number, Set<number>>();
  for (const row of pits) {
    const driver = num(row.driver_number);
    const lap = num(row.lap_number);
    if (driver === null || lap === null) continue;
    const set = pitLaps.get(driver) ?? new Set<number>();
    set.add(lap);
    set.add(lap + 1);
    pitLaps.set(driver, set);
  }
  const stintStarts = new Map<number, number[]>();
  for (const row of stints) {
    const driver = num(row.driver_number);
    const start = num(row.lap_start);
    if (driver !== null && start !== null) stintStarts.set(driver, [...(stintStarts.get(driver) ?? []), start]);
  }

  const perDriver = new Map<number, { lap: number; time: number }[]>();
  for (const row of laps) {
    const driver = num(row.driver_number);
    const lap = num(row.lap_number);
    const time = num(row.lap_duration);
    if (driver === null || !lap || !time || lap === 1) continue;
    if (row.is_pit_out_lap === true || pitLaps.get(driver)?.has(lap) || neutralised.has(lap)) continue;
    perDriver.set(driver, [...(perDriver.get(driver) ?? []), { lap, time }]);
  }

  const rows: Omit<DriverPace, "gap">[] = [];
  for (const [number, rawLaps] of perDriver) {
    const ownMedian = medianOf(rawLaps.map((p) => p.time));
    // Traffic, a spin or a slow puncture: drop laps 5% off the driver's own median.
    const clean = rawLaps.filter((p) => p.time < ownMedian * 1.05).sort((a, b) => a.lap - b.lap);
    if (clean.length < 8) continue;
    const times = clean.map((p) => p.time).sort((a, b) => a - b);
    const mean = times.reduce((sum, value) => sum + value, 0) / times.length;
    const starts = [...(stintStarts.get(number) ?? [])].sort((a, b) => a - b);
    const groups: { lap: number; time: number }[][] = [];
    for (const point of clean) {
      const stint = starts.filter((start) => start <= point.lap).length;
      (groups[stint] ??= []).push(point);
    }
    const driver = info.get(number) ?? { number, code: String(number), name: String(number), team: "" };
    const team = seasonTeam(driver.team);
    rows.push({
      number,
      code: driver.code,
      name: driver.name,
      team: team.id,
      color: team.color,
      laps: clean.length,
      median: quantile(times, 0.5),
      q1: quantile(times, 0.25),
      q3: quantile(times, 0.75),
      best: times[0],
      worst: times.at(-1)!,
      consistency: detrendedSpread(groups.filter(Boolean)) ?? Math.sqrt(times.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (times.length - 1)),
      deviation: Math.sqrt(times.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (times.length - 1))
    });
  }
  if (!rows.length) return null;
  const fastest = Math.min(...rows.map((row) => row.median));
  const withGap = rows.map((row) => ({ ...row, gap: row.median - fastest })).sort((a, b) => a.median - b.median);

  const teamTimes = new Map<string, number[]>();
  for (const row of withGap) teamTimes.set(row.team, [...(teamTimes.get(row.team) ?? []), row.median]);
  const teamRows = [...teamTimes.entries()].map(([id, values]) => {
    const team = seasonTeam(id);
    // A team is as quick as its quicker car: one driver stuck in traffic should not drag it down.
    return { team: id, name: team.name, color: team.color, median: Math.min(...values), gap: 0 };
  }).sort((a, b) => a.median - b.median);
  const teamBest = teamRows[0]?.median ?? 0;

  return {
    session,
    drivers: withGap,
    teams: teamRows.map((row) => ({ ...row, gap: row.median - teamBest })),
    neutralisedLaps: [...neutralised].sort((a, b) => a - b),
    totalLaps: Math.max(...byLap.keys())
  };
}

// ---------------------------------------------------------------------------------------------
// Pit stops across the season

export type PitStop = {
  race: string;
  date: string;
  driver: string;
  code: string;
  team: string;
  lap: number;
  /** Time stationary in the box, when OpenF1 has it. */
  stop: number | null;
  /** Pit lane time from entry to exit. */
  lane: number | null;
};

export type PitSeason = {
  stops: PitStop[];
  races: number;
  teams: { team: string; name: string; color: string; stops: number; median: number | null; best: PitStop | null; under3: number; laneMedian: number | null }[];
  hasStationary: boolean;
};

export const getPitSeason = cache(async (year: number): Promise<PitSeason | null> => {
  const sessions = (await getRaceSessions(year)).filter((session) => !session.sprint);
  if (!sessions.length) return null;
  const first = sessions[0].key;
  try {
    // One driver list for the season (practice rows are dropped below), then the races two at a
    // time so a cold cache stays inside OpenF1's rate limit. Finished races are cached for a day.
    const drivers = await get(`/drivers?session_key%3E=${first}`, 3600);
    const pits: Row[] = [];
    for (let index = 0; index < sessions.length; index += 2) {
      const batch = await Promise.all(sessions.slice(index, index + 2).map((session) => get(`/pit?session_key=${session.key}`, 86_400)));
      pits.push(...batch.flat());
    }
    const bySession = new Map(sessions.map((session) => [session.key, session]));
    const driversBySession = new Map<number, Row[]>();
    for (const row of drivers) {
      const key = num(row.session_key);
      if (key !== null && bySession.has(key)) driversBySession.set(key, [...(driversBySession.get(key) ?? []), row]);
    }
    const infoBySession = new Map([...driversBySession.entries()].map(([key, rows]) => [key, driverMap(rows)]));
    const stops: PitStop[] = [];
    for (const row of pits) {
      const key = num(row.session_key);
      const session = key === null ? undefined : bySession.get(key);
      if (!session) continue;
      const number = num(row.driver_number) ?? 0;
      const driver = infoBySession.get(session.key)?.get(number);
      const stop = num(row.stop_duration);
      const lane = num(row.lane_duration) ?? num(row.pit_duration);
      // Drive-throughs and red-flag entries have no stationary time and a lane time far off the norm.
      if (stop !== null && (stop < 1.5 || stop > 15)) continue;
      stops.push({
        race: session.country || session.circuit,
        date: session.date,
        driver: driver?.name ?? String(number),
        code: driver?.code ?? String(number),
        team: driver?.team ?? "",
        lap: num(row.lap_number) ?? 0,
        stop,
        lane: lane !== null && lane < 60 ? lane : null
      });
    }
    const hasStationary = stops.some((stop) => stop.stop !== null);
    const teams = new Map<string, PitStop[]>();
    for (const stop of stops) teams.set(stop.team, [...(teams.get(stop.team) ?? []), stop]);
    return {
      stops,
      races: new Set(stops.map((stop) => stop.date)).size,
      hasStationary,
      teams: [...teams.entries()].map(([id, list]) => {
        const team = seasonTeam(id);
        const stationary = list.filter((stop) => stop.stop !== null).map((stop) => stop.stop!);
        const lanes = list.filter((stop) => stop.lane !== null).map((stop) => stop.lane!);
        const best = [...list].filter((stop) => stop.stop !== null).sort((a, b) => a.stop! - b.stop!)[0] ?? null;
        return {
          team: id, name: team.name, color: team.color, stops: list.length,
          median: stationary.length ? medianOf(stationary) : null,
          best,
          under3: stationary.filter((value) => value < 3).length,
          laneMedian: lanes.length ? medianOf(lanes) : null
        };
      }).sort((a, b) => (a.median ?? a.laneMedian ?? 99) - (b.median ?? b.laneMedian ?? 99))
    };
  } catch {
    return null;
  }
});
