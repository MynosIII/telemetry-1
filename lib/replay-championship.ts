import { MEMO_FINISHED, num, openF1, str } from "@/lib/openf1";
import { getSessionSummary } from "@/lib/replay";

const JOLPICA = process.env.JOLPICA_BASE_URL ?? "https://api.jolpi.ca/ergast/f1";

export type ChampionshipBase = {
  /** Where the standings before this session came from. */
  source: "openf1" | "jolpica";
  drivers: { number: number | null; acronym: string | null; points: number; position: number }[];
  teams: { name: string; points: number; position: number }[];
  sprint: boolean;
  /** 2019–2024 races gave a point for the fastest lap to a top-10 finisher. */
  fastestLapPoint: boolean;
};

type Json = Record<string, any>;

async function jolpica(path: string): Promise<Json | null> {
  try {
    const response = await fetch(`${JOLPICA}${path}`, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) });
    return response.ok ? ((await response.json()) as Json) : null;
  } catch {
    return null;
  }
}

async function fromOpenF1(key: number) {
  const [drivers, teams] = await Promise.all([
    openF1(`/championship_drivers?session_key=${key}`, MEMO_FINISHED).catch(() => []),
    openF1(`/championship_teams?session_key=${key}`, MEMO_FINISHED).catch(() => [])
  ]);
  if (!drivers.length) return null;
  return {
    drivers: drivers.flatMap((row) => {
      const number = num(row.driver_number);
      const points = num(row.points_start) ?? 0;
      const position = num(row.position_start);
      return number === null ? [] : [{ number, acronym: null, points, position: position ?? 99 }];
    }),
    teams: teams.flatMap((row) => {
      const name = str(row.team_name);
      return name ? [{ name, points: num(row.points_start) ?? 0, position: num(row.position_start) ?? 99 }] : [];
    })
  };
}

/** Standings after the previous round, plus this weekend's sprint when the session is the race. */
async function fromJolpica(year: number, startsAt: string, sprint: boolean, teamOf: Map<string, string>) {
  const schedule = await jolpica(`/${year}.json?limit=40`);
  const races: Json[] = schedule?.MRData?.RaceTable?.Races ?? [];
  const day = Date.parse(startsAt);
  const race = races.find((item) => Math.abs(Date.parse(`${item.date}T12:00:00Z`) - day) < 4 * 86_400_000);
  if (!race) return null;
  const round = Number(race.round);
  const drivers = new Map<string, { number: number | null; acronym: string; points: number; team: string }>();
  const teams = new Map<string, number>();
  if (round > 1) {
    const [driverTable, teamTable] = await Promise.all([
      jolpica(`/${year}/${round - 1}/driverStandings.json?limit=100`),
      jolpica(`/${year}/${round - 1}/constructorStandings.json?limit=100`)
    ]);
    const driverRows: Json[] = driverTable?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings ?? [];
    if (!driverRows.length) return null;
    for (const row of driverRows) {
      const acronym = String(row.Driver?.code ?? "").toUpperCase();
      if (!acronym) continue;
      drivers.set(acronym, { number: Number(row.Driver?.permanentNumber) || null, acronym, points: Number(row.points) || 0, team: String(row.Constructors?.at(-1)?.name ?? "") });
    }
    for (const row of teamTable?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings ?? []) {
      teams.set(String(row.Constructor?.name ?? ""), Number(row.points) || 0);
    }
  }
  if (!sprint && race.Sprint) {
    const sprintTable = await jolpica(`/${year}/${round}/sprint.json`);
    for (const row of sprintTable?.MRData?.RaceTable?.Races?.[0]?.SprintResults ?? []) {
      const acronym = String(row.Driver?.code ?? "").toUpperCase();
      const points = Number(row.points) || 0;
      const team = String(row.Constructor?.name ?? "");
      const entry = drivers.get(acronym) ?? { number: Number(row.Driver?.permanentNumber) || null, acronym, points: 0, team };
      entry.points += points;
      drivers.set(acronym, entry);
      teams.set(team, (teams.get(team) ?? 0) + points);
    }
  }
  // Show OpenF1's team names, matched through the drivers that raced for each.
  const teamName = new Map<string, string>();
  for (const entry of drivers.values()) {
    const name = teamOf.get(entry.acronym);
    if (name && entry.team) teamName.set(entry.team, name);
  }
  const rank = <T extends { points: number }>(list: T[]) => list.sort((a, b) => b.points - a.points).map((item, index) => ({ ...item, position: index + 1 }));
  return {
    drivers: rank([...drivers.values()].map(({ number, acronym, points }) => ({ number, acronym, points }))),
    teams: rank([...teams.entries()].map(([name, points]) => ({ name: teamName.get(name) ?? name, points })))
  };
}

export async function getChampionshipBase(key: number): Promise<ChampionshipBase | null> {
  const session = await getSessionSummary(key);
  if (!session || session.type !== "Race") return null;
  const year = new Date(session.startsAt).getUTCFullYear();
  const sprint = /sprint/i.test(session.name);
  const fastestLapPoint = !sprint && year >= 2019 && year <= 2024;
  const openf1 = await fromOpenF1(key);
  if (openf1) return { source: "openf1", ...openf1, sprint, fastestLapPoint };
  const driverRows = await openF1(`/drivers?session_key=${key}`, MEMO_FINISHED).catch(() => []);
  const teamOf = new Map(driverRows.map((row) => [str(row.name_acronym).toUpperCase(), str(row.team_name)]));
  const fallback = await fromJolpica(year, session.startsAt, sprint, teamOf);
  return fallback ? { source: "jolpica", ...fallback, sprint, fastestLapPoint } : null;
}
