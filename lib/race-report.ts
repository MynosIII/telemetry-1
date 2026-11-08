/**
 * Post-race report for the current season: how each driver finished against what their starting
 * slot predicted, overtakes, race statistics, milestones and records, and odd facts.
 *
 * Sources: Jolpica (results, pit stops, lap-by-lap positions, the season so far), OpenF1
 * (overtakes, when it has them) and lib/race-report-baseline.json, built from the 1950–2025
 * archive by scripts/build-race-report-baseline.mjs.
 */
import baselineJson from "./race-report-baseline.json";
import { translate } from "./dictionary";
import { getLapPositions } from "./lap-chart";
import { openF1, num, str } from "./openf1";

const API_ROOT = process.env.JOLPICA_BASE_URL ?? "https://api.jolpi.ca/ergast/f1";
export const RACE_REPORT_CACHE_TAG = "race-report";
// A race can still change for a few hours (penalties, laps still loading); after that it is fixed.
const FRESH_SECONDS = 30 * 60;

type Raw = Record<string, any>;

type Baseline = {
  gridExpectation: {
    from: number;
    to: number;
    races: number;
    finishers: number;
    shiftFromBack: number[];
    validation: { testRows: number; maeModel: number; maeStartAmongFinishers: number; maeRawGrid: number };
  };
  drivers: Record<string, { name: string; starts: number; wins: number; podiums: number; points: number; pointsFinishes: number; birth: string | null }>;
  constructors: Record<string, { name: string; wins: number; podiums: number; races: number }>;
  leaderboards: Record<"wins" | "podiums" | "starts" | "points", { id: string; name: string; value: number }[]>;
  furthestBackWin: { grid: number; name: string; detail: string };
};
const baseline = baselineJson as Baseline;

export type ExpectationRow = {
  driverId: string;
  code: string;
  name: string;
  team: string;
  grid: number | null; // null = pit lane
  finish: number | null; // null = not classified
  status: string;
  retiredAhead: number;
  startAmongFinishers: number | null;
  expected: number | null;
  delta: number | null; // positive = finished ahead of the expectation
};

export type OvertakeRow = { driverId: string; name: string; team: string; made: number; suffered: number };

export type ReportFact = { label: string; value: string; detail?: string };

export type RaceReport = {
  season: number;
  round: number;
  name: string;
  circuit: string;
  date: string;
  laps: number;
  /** official: Jolpica's race grid. qualifying: the race grid wasn't published yet, so the qualifying order stands in. */
  gridSource: "official" | "starting-grid" | "qualifying";
  /** Grid, laps, pit stops and fastest lap are all in: the report won't change any more. */
  complete: boolean;
  expectation: ExpectationRow[];
  overtakes: { source: "openf1" | "laps" | null; rows: OvertakeRow[]; total: number };
  stats: ReportFact[];
  records: string[];
  curiosities: string[];
  method: Baseline["gridExpectation"];
};

// ---------- fetching ----------

async function jolpica(path: string, revalidate = FRESH_SECONDS): Promise<Raw> {
  const response = await fetch(`${API_ROOT}${path}`, {
    next: { revalidate, tags: [RACE_REPORT_CACHE_TAG] },
    signal: AbortSignal.timeout(10_000)
  });
  if (!response.ok) throw new Error(`Jolpica ${response.status} ${path}`);
  return response.json();
}

/** Every result of the season, merged across pages (a race can be split between two pages). */
async function seasonResults(season: number): Promise<Raw[]> {
  const first = await jolpica(`/${season}/results.json?limit=100`);
  const total = Number(first.MRData?.total ?? 0);
  const pages = [first];
  for (let offset = 100; offset < total; offset += 300) {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Jolpica allows four requests a second
    const batch = [offset, offset + 100, offset + 200].filter(o => o < total);
    pages.push(...await Promise.all(batch.map(o => jolpica(`/${season}/results.json?limit=100&offset=${o}`))));
  }
  const byRound = new Map<number, Raw>();
  for (const page of pages) for (const race of page.MRData?.RaceTable?.Races ?? []) {
    const round = Number(race.round);
    const existing = byRound.get(round);
    if (existing) existing.Results = [...existing.Results, ...(race.Results ?? [])];
    else byRound.set(round, { ...race, Results: [...(race.Results ?? [])] });
  }
  return [...byRound.values()].sort((a, b) => Number(a.round) - Number(b.round));
}

async function pitStops(season: number, round: number): Promise<{ driverId: string; lap: number; stop: number; seconds: number | null }[]> {
  try {
    const data = await jolpica(`/${season}/${round}/pitstops.json?limit=100`);
    return (data.MRData?.RaceTable?.Races?.[0]?.PitStops ?? []).map((p: Raw) => ({
      driverId: p.driverId,
      lap: Number(p.lap),
      stop: Number(p.stop),
      seconds: durationSeconds(p.duration)
    }));
  } catch {
    return [];
  }
}

/** OpenF1 counts real on-track passes for its sessions; null when it has nothing for this race. */
async function openF1Overtakes(season: number, date: string): Promise<{ overtaking: number; overtaken: number }[] | null> {
  try {
    const sessions = await openF1(`/sessions?year=${season}&session_name=Race`, 30 * 60_000);
    const day = Date.parse(`${date}T00:00:00Z`);
    const session = sessions.find(s => Math.abs(Date.parse(str(s.date_start).slice(0, 10) + "T00:00:00Z") - day) <= 86_400_000);
    if (!session) return null;
    const rows = await openF1(`/overtakes?session_key=${num(session.session_key)}`, 30 * 60_000);
    const passes = rows
      .map(r => ({ overtaking: num(r.overtaking_driver_number) ?? 0, overtaken: num(r.overtaken_driver_number) ?? 0 }))
      .filter(r => r.overtaking && r.overtaken);
    return passes.length ? passes : null;
  } catch {
    return null;
  }
}

/**
 * Jolpica publishes the race grid a while after the finish. Until then, OpenF1's starting grid
 * (or, failing that, the qualifying order) stands in so the report is usable on Sunday night.
 */
async function provisionalGrid(season: number, round: number, date: string, results: Raw[]): Promise<{ source: "starting-grid" | "qualifying"; grid: Map<string, number> } | null> {
  try {
    const sessions = await openF1(`/sessions?year=${season}&session_name=Race`, 30 * 60_000);
    const day = Date.parse(`${date}T00:00:00Z`);
    const session = sessions.find(s => Math.abs(Date.parse(str(s.date_start).slice(0, 10) + "T00:00:00Z") - day) <= 86_400_000);
    if (session) {
      const rows = await openF1(`/starting_grid?session_key=${num(session.session_key)}`, 30 * 60_000);
      const byNumber = new Map(results.map(r => [Number(r.number), r.Driver.driverId as string]));
      const grid = new Map<string, number>();
      for (const row of rows) {
        const id = byNumber.get(num(row.driver_number) ?? -1);
        const position = num(row.position);
        if (id && position) grid.set(id, position);
      }
      if (grid.size >= results.length / 2) return { source: "starting-grid", grid };
    }
  } catch {
    // Fall through to qualifying.
  }
  try {
    const data = await jolpica(`/${season}/${round}/qualifying.json?limit=100`);
    const rows = data.MRData?.RaceTable?.Races?.[0]?.QualifyingResults ?? [];
    const grid = new Map<string, number>(rows.map((q: Raw) => [q.Driver.driverId as string, Number(q.position)]));
    return grid.size ? { source: "qualifying", grid } : null;
  } catch {
    return null;
  }
}

// ---------- helpers ----------

function durationSeconds(value: unknown): number | null {
  const text = String(value ?? "");
  const match = text.match(/^(?:(\d+):)?(\d+(?:\.\d+)?)$/);
  if (!match) return null;
  return Number(match[1] ?? 0) * 60 + Number(match[2]);
}

const statusText = (r: Raw) => {
  const status = String(r.status ?? "");
  return /^retired$/i.test(status) ? "Abandono" : translate(status, "statuses");
};
const isClassified = (r: Raw) => /^\d+$/.test(String(r.positionText ?? ""));
const didStart = (r: Raw) => !/did not start|withdrew|not qualified|excluded|107%/i.test(String(r.status ?? "")) && String(r.positionText) !== "W" && String(r.positionText) !== "F";
const fullName = (r: Raw) => `${r.Driver.givenName} ${r.Driver.familyName}`;
const gridOf = (r: Raw) => {
  const grid = Number(r.grid);
  return Number.isFinite(grid) && grid > 0 ? grid : null;
};
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const ord = (n: number) => `${n}.º`;
const fmt = (value: number, digits = 0) => value.toLocaleString("es-AR", { maximumFractionDigits: digits, minimumFractionDigits: digits });
const archiveConstructorId = (id: string) => id.replace(/_/g, "-");

function ageOn(birth: string | null | undefined, date: string) {
  if (!birth) return null;
  const b = new Date(`${birth}T00:00:00Z`);
  const d = new Date(`${date}T00:00:00Z`);
  let years = d.getUTCFullYear() - b.getUTCFullYear();
  if (d.getUTCMonth() < b.getUTCMonth() || (d.getUTCMonth() === b.getUTCMonth() && d.getUTCDate() < b.getUTCDate())) years -= 1;
  const lastBirthday = new Date(Date.UTC(b.getUTCFullYear() + years, b.getUTCMonth(), b.getUTCDate()));
  return { years, days: Math.round((d.getTime() - lastBirthday.getTime()) / 86_400_000), exact: (d.getTime() - b.getTime()) / (365.25 * 86_400_000) };
}

// ---------- 1. finish against the starting slot ----------

/**
 * The expectation removes the places a driver gets for free when cars ahead retire, then applies
 * what history says about the back of the field: among 2014–2025 finishers, the last two starters
 * gained two places on median, the next two one place, and everyone else finished where they started.
 */
export function expectationRows(results: Raw[]): ExpectationRow[] {
  const shift = baseline.gridExpectation.shiftFromBack;
  const starters = results.filter(didStart);
  const slot = (r: Raw) => gridOf(r) ?? 99;
  const classified = starters.filter(isClassified).sort((a, b) => slot(a) - slot(b) || Number(a.position) - Number(b.position));
  const field = classified.length;
  const startOf = new Map(classified.map((r, i) => [r.Driver.driverId as string, i + 1]));

  return starters.map(r => {
    const id = r.Driver.driverId as string;
    const retiredAhead = starters.filter(o => !isClassified(o) && slot(o) < slot(r)).length;
    const start = startOf.get(id) ?? null;
    const finish = isClassified(r) ? Number(r.position) : null;
    const expected = start === null ? null : Math.max(1, start + (shift[field - start] ?? 0));
    return {
      driverId: id,
      code: r.Driver.code ?? r.Driver.familyName.slice(0, 3).toUpperCase(),
      name: fullName(r),
      team: r.Constructor?.name ?? "",
      grid: gridOf(r),
      finish,
      status: finish ? "" : statusText(r),
      retiredAhead,
      startAmongFinishers: start,
      expected,
      delta: expected !== null && finish !== null ? expected - finish : null
    };
  }).sort((a, b) => {
    if (a.delta === null || b.delta === null) return a.delta === null ? (b.delta === null ? (a.grid ?? 99) - (b.grid ?? 99) : 1) : -1;
    return b.delta - a.delta || (a.finish ?? 99) - (b.finish ?? 99);
  });
}

// ---------- 2. overtakes ----------

/**
 * Without OpenF1, passes are read from the lap-by-lap order: a pair of cars that swap places
 * between two laps counts as one pass, unless either car pitted on those laps or the car passed
 * stopped within the next lap (a retirement is not an overtake).
 */
function lapOvertakes(positions: Map<string, (number | null)[]>, laps: number, stops: { driverId: string; lap: number }[]) {
  const pitLaps = new Map<string, Set<number>>();
  for (const s of stops) {
    if (!pitLaps.has(s.driverId)) pitLaps.set(s.driverId, new Set());
    pitLaps.get(s.driverId)!.add(s.lap).add(s.lap + 1);
  }
  const pitted = (id: string, lap: number) => pitLaps.get(id)?.has(lap) ?? false;
  const passes: { by: string; on: string; lap: number }[] = [];
  const ids = [...positions.keys()];
  for (let lap = 2; lap <= laps; lap += 1) {
    for (const a of ids) for (const b of ids) {
      if (a === b) continue;
      const pa = positions.get(a)!, pb = positions.get(b)!;
      const beforeA = pa[lap - 2], beforeB = pb[lap - 2], nowA = pa[lap - 1], nowB = pb[lap - 1];
      if (beforeA == null || beforeB == null || nowA == null || nowB == null) continue;
      if (!(beforeA > beforeB && nowA < nowB)) continue;
      if (pitted(a, lap) || pitted(b, lap) || pitted(a, lap - 1) || pitted(b, lap - 1)) continue;
      if (lap < laps && pb[lap] == null) continue;
      passes.push({ by: a, on: b, lap });
    }
  }
  return passes;
}

// ---------- 3–5. statistics, records and curiosities ----------

type Totals = { starts: number; wins: number; podiums: number; points: number; pointsFinishes: number };
const emptyTotals = (): Totals => ({ starts: 0, wins: 0, podiums: 0, points: 0, pointsFinishes: 0 });

function addRace(totals: Map<string, Totals>, results: Raw[]) {
  for (const r of results) {
    if (!didStart(r)) continue;
    const id = r.Driver.driverId as string;
    const t = totals.get(id) ?? emptyTotals();
    const position = isClassified(r) ? Number(r.position) : null;
    t.starts += 1;
    if (position === 1) t.wins += 1;
    if (position !== null && position <= 3) t.podiums += 1;
    const points = Number(r.points ?? 0);
    t.points += points;
    if (points > 0) t.pointsFinishes += 1;
    totals.set(id, t);
  }
}

const career = (id: string, season: Map<string, Totals>): Totals => {
  const archive = baseline.drivers[id];
  const now = season.get(id) ?? emptyTotals();
  return {
    starts: (archive?.starts ?? 0) + now.starts,
    wins: (archive?.wins ?? 0) + now.wins,
    podiums: (archive?.podiums ?? 0) + now.podiums,
    points: (archive?.points ?? 0) + now.points,
    pointsFinishes: (archive?.pointsFinishes ?? 0) + now.pointsFinishes
  };
};

const isRound = (key: keyof Totals, n: number) => {
  if (key === "wins") return n >= 10 && (n % 10 === 0 || n === 25 || n === 75);
  if (key === "podiums") return n >= 25 && n % 25 === 0;
  if (key === "starts") return n >= 50 && n % 50 === 0;
  return false;
};

const LABELS: Record<"wins" | "podiums" | "starts" | "points", [string, string]> = {
  wins: ["victoria", "victorias"],
  podiums: ["podio", "podios"],
  starts: ["Gran Premio", "Grandes Premios"],
  points: ["punto", "puntos"]
};

function milestones(race: Raw, before: Map<string, Totals>, after: Map<string, Totals>, gridIsOfficial: boolean) {
  const out: string[] = [];
  const winner = race.Results.find((r: Raw) => isClassified(r) && Number(r.position) === 1);

  for (const r of race.Results.filter(didStart)) {
    const id = r.Driver.driverId as string;
    const name = fullName(r);
    const was = career(id, before), now = career(id, after);
    if (was.starts === 0) out.push(`${name} debutó en la Fórmula 1.`);
    if (was.wins === 0 && now.wins === 1) out.push(`${name} ganó por primera vez, en su ${ord(now.starts)} Gran Premio.`);
    else if (was.podiums === 0 && now.podiums === 1) out.push(`${name} subió a su primer podio, en su ${ord(now.starts)} Gran Premio.`);
    else if (was.pointsFinishes === 0 && now.pointsFinishes === 1) out.push(`${name} sumó sus primeros puntos.`);
    for (const key of ["wins", "podiums", "starts"] as const) {
      if (now[key] !== was[key] && isRound(key, now[key])) out.push(`${name} llegó a ${now[key]} ${LABELS[key][1]}.`);
    }
    const step = was.points >= 1000 ? 500 : 250;
    const threshold = Math.floor(now.points / step) * step;
    if (threshold > 0 && was.points < threshold && now.points >= threshold) out.push(`${name} superó los ${fmt(threshold)} puntos en su carrera.`);

    // All-time tables: the record itself, or the names passed on the way up.
    for (const key of ["wins", "podiums", "starts", "points"] as const) {
      if (now[key] === was[key]) continue;
      const others = baseline.leaderboards[key].filter(row => row.id !== id).map(row => ({ ...row, value: career(row.id, after)[key] || row.value }));
      const passed = others.filter(row => row.value >= was[key] && row.value < now[key]);
      if (!passed.length) continue;
      const rank = others.filter(row => row.value > now[key]).length + 1;
      const value = key === "points" ? fmt(now[key], now[key] % 1 ? 1 : 0) : String(now[key]);
      if (rank === 1) out.push(`Récord histórico: ${name} es el piloto con más ${LABELS[key][1]} de la historia (${value}).`);
      else out.push(`${name} superó a ${passed.map(p => p.name).join(" y ")} y es ${ord(rank)} en ${LABELS[key][1]} de la historia (${value}).`);
    }
  }

  if (winner && gridIsOfficial) {
    const grid = gridOf(winner);
    const record = baseline.furthestBackWin;
    if (grid === null || grid > record.grid) out.push(`Récord histórico: nadie había ganado largando tan atrás (${grid === null ? "desde boxes" : `P${grid}`}). La marca era de ${record.name}, P${record.grid} en ${record.detail}.`);
    else if (grid >= 10) out.push(`${fullName(winner)} ganó largando P${grid}. La victoria desde más atrás de la historia sigue siendo la de ${record.name} (P${record.grid}, ${record.detail}).`);
  }
  return out;
}

function constructorMilestones(race: Raw, previousRaces: Raw[]) {
  const out: string[] = [];
  const winner = race.Results.find((r: Raw) => isClassified(r) && Number(r.position) === 1);
  if (!winner) return out;
  const id = winner.Constructor.constructorId as string;
  const archive = baseline.constructors[archiveConstructorId(id)];
  const seasonWins = previousRaces.filter(r => r.Results.some((x: Raw) => isClassified(x) && Number(x.position) === 1 && x.Constructor.constructorId === id)).length;
  const total = (archive?.wins ?? 0) + seasonWins + 1;
  if (total === 1) out.push(`${winner.Constructor.name} ganó su primera carrera en la Fórmula 1.`);
  else if (total % 25 === 0 || (total >= 10 && total % 10 === 0)) out.push(`${winner.Constructor.name} llegó a ${total} victorias.`);
  const top2 = race.Results.filter((r: Raw) => isClassified(r) && Number(r.position) <= 2);
  if (top2.length === 2 && top2[0].Constructor.constructorId === top2[1].Constructor.constructorId) out.push(`Doblete de ${winner.Constructor.name}.`);
  return out;
}

function seasonNotes(race: Raw, previousRaces: Raw[]) {
  const out: string[] = [];
  const winnerOf = (r: Raw) => r.Results.find((x: Raw) => isClassified(x) && Number(x.position) === 1)?.Driver.driverId as string | undefined;
  const winner = race.Results.find((r: Raw) => isClassified(r) && Number(r.position) === 1);
  if (!winner) return out;
  const earlierWinners = new Set(previousRaces.map(winnerOf).filter(Boolean));
  if (!earlierWinners.has(winner.Driver.driverId)) out.push(`${fullName(winner)} es el ${ord(earlierWinners.size + 1)} ganador distinto de la temporada.`);
  else {
    const wins = previousRaces.filter(r => winnerOf(r) === winner.Driver.driverId).length + 1;
    out.push(`${fullName(winner)} suma ${plural(wins, "victoria", "victorias")} en ${previousRaces.length + 1} carreras este año.`);
  }
  return out;
}

// ---------- assembly ----------

export async function getRaceReport(roundParam: string): Promise<RaceReport | null> {
  const wanted = roundParam === "ultima" ? "last" : /^\d+$/.test(roundParam) ? roundParam : null;
  if (!wanted) return null;
  let raceJson: Raw;
  try {
    raceJson = await jolpica(`/current/${wanted}/results.json?limit=100`);
  } catch {
    return null;
  }
  const race = raceJson.MRData?.RaceTable?.Races?.[0];
  if (!race?.Results?.length) return null;
  const season = Number(race.season);
  const round = Number(race.round);
  let results: Raw[] = race.Results;
  let gridSource: RaceReport["gridSource"] = "official";
  const withGrid = results.filter(r => Number(r.grid) > 0).length;
  if (withGrid < results.length / 2) {
    const fallback = await provisionalGrid(season, round, race.date, results);
    if (fallback) {
      gridSource = fallback.source;
      results = results.map(r => ({ ...r, grid: String(fallback.grid.get(r.Driver.driverId) ?? 0) }));
      race.Results = results;
    }
  }
  const winner = results.find(r => isClassified(r) && Number(r.position) === 1);
  const laps = Number(winner?.laps ?? Math.max(...results.map(r => Number(r.laps) || 0)));

  const [allRaces, stops, lapData, passesOpenF1] = await Promise.all([
    seasonResults(season).catch(() => [] as Raw[]),
    pitStops(season, round),
    getLapPositions(season, round, FRESH_SECONDS),
    openF1Overtakes(season, race.date)
  ]);
  const previousRaces = allRaces.filter(r => Number(r.round) < round);

  // --- expectation
  const expectation = expectationRows(results);

  // --- overtakes
  const byNumber = new Map(results.map(r => [Number(r.number), r]));
  const byId = new Map(results.map(r => [r.Driver.driverId as string, r]));
  const counts = new Map<string, { made: number; suffered: number }>();
  const bump = (id: string | undefined, key: "made" | "suffered") => {
    if (!id) return;
    const c = counts.get(id) ?? { made: 0, suffered: 0 };
    c[key] += 1;
    counts.set(id, c);
  };
  let source: RaceReport["overtakes"]["source"] = null;
  let totalPasses = 0;
  if (passesOpenF1) {
    source = "openf1";
    for (const p of passesOpenF1) {
      bump(byNumber.get(p.overtaking)?.Driver.driverId, "made");
      bump(byNumber.get(p.overtaken)?.Driver.driverId, "suffered");
    }
    totalPasses = passesOpenF1.length;
  } else if (lapData) {
    source = "laps";
    const passes = lapOvertakes(lapData.drivers, lapData.laps, stops);
    for (const p of passes) { bump(p.by, "made"); bump(p.on, "suffered"); }
    totalPasses = passes.length;
  }
  const overtakeRows: OvertakeRow[] = [...counts.entries()]
    .map(([id, c]) => ({ driverId: id, name: byId.has(id) ? fullName(byId.get(id)!) : id, team: byId.get(id)?.Constructor?.name ?? "", ...c }))
    .sort((a, b) => b.made - a.made || a.suffered - b.suffered);

  // --- statistics
  const stats: ReportFact[] = [];
  const curiosities: string[] = [];
  const classified = results.filter(isClassified).sort((a, b) => Number(a.position) - Number(b.position));
  const starters = results.filter(didStart);
  const dnfs = starters.filter(r => !isClassified(r));

  if (winner) {
    const grid = gridOf(winner);
    const second = classified[1];
    stats.push({ label: "Ganador", value: fullName(winner), detail: `${winner.Constructor.name} · largó ${grid ? `P${grid}` : "desde boxes"}` });
    if (second?.Time?.time && Number(second.laps) === laps) stats.push({ label: "Margen", value: `${second.Time.time} s`, detail: `sobre ${fullName(second)}` });
  }
  const poleman = results.find(r => gridOf(r) === 1);
  if (poleman) stats.push({ label: "Desde la pole", value: fullName(poleman), detail: isClassified(poleman) ? `terminó ${ord(Number(poleman.position))}` : `abandonó (${statusText(poleman).toLowerCase()})` });

  const fastest = results.find(r => r.FastestLap?.rank === "1");
  if (fastest) stats.push({ label: "Vuelta rápida", value: fastest.FastestLap.Time?.time ?? "", detail: `${fullName(fastest)}, vuelta ${fastest.FastestLap.lap}` });

  const timedStops = stops.filter(s => s.seconds !== null && s.seconds < 120);
  if (stops.length) {
    const quickest = [...timedStops].sort((a, b) => a.seconds! - b.seconds!)[0];
    const perDriver = new Map<string, number>();
    for (const s of stops) perDriver.set(s.driverId, Math.max(perDriver.get(s.driverId) ?? 0, s.stop));
    const most = [...perDriver.entries()].sort((a, b) => b[1] - a[1])[0];
    stats.push({ label: "Paradas", value: String(stops.length), detail: most ? `${byId.has(most[0]) ? fullName(byId.get(most[0])!) : most[0]} hizo ${plural(most[1], "parada", "paradas")}, la mayor cantidad` : undefined });
    if (quickest) stats.push({ label: "Paso por boxes más corto", value: `${fmt(quickest.seconds!, 3)} s`, detail: `${byId.has(quickest.driverId) ? fullName(byId.get(quickest.driverId)!) : quickest.driverId}, vuelta ${quickest.lap} (entrada a salida de boxes)` });
    const noStop = classified.filter(r => !perDriver.has(r.Driver.driverId));
    if (noStop.length && noStop.length <= 4 && stops.length > 3) curiosities.push(`${noStop.map(fullName).join(", ")} ${noStop.length === 1 ? "terminó sin parar en boxes" : "terminaron sin parar en boxes"}.`);
  }
  if (overtakeRows[0]?.made) {
    const top = overtakeRows[0];
    stats.push({ label: "Más adelantamientos", value: top.name, detail: `${plural(top.made, "pase", "pases")} de ${totalPasses} en toda la carrera` });
  }
  stats.push({ label: "Abandonos", value: String(dnfs.length), detail: dnfs.length ? dnfs.map(r => `${r.Driver.familyName} (${statusText(r).toLowerCase()})`).join(", ") : "todos los que largaron llegaron" });

  // Lap-by-lap: leaders, lap one, positions held.
  if (lapData) {
    const led = new Map<string, number>();
    let changes = 0;
    let previousLeader: string | undefined;
    for (let lap = 0; lap < lapData.laps; lap += 1) {
      const leader = [...lapData.drivers.entries()].find(([, p]) => p[lap] === 1)?.[0];
      if (!leader) continue;
      led.set(leader, (led.get(leader) ?? 0) + 1);
      if (previousLeader && leader !== previousLeader) changes += 1;
      previousLeader = leader;
    }
    const leaders = [...led.entries()].sort((a, b) => b[1] - a[1]);
    if (leaders.length) stats.push({
      label: "Vueltas lideradas",
      value: leaders.length === 1 ? "Un solo líder" : `${leaders.length} líderes`,
      detail: leaders.map(([id, n]) => `${byId.get(id)?.Driver.familyName ?? id} ${n}`).join(" · ") + (changes ? ` · ${plural(changes, "cambio", "cambios")} de punta` : "")
    });

    const lapOne = starters
      .map(r => ({ r, gain: (gridOf(r) ?? starters.length) - (lapData.drivers.get(r.Driver.driverId)?.[0] ?? NaN) }))
      .filter(x => Number.isFinite(x.gain));
    const best = [...lapOne].sort((a, b) => b.gain - a.gain)[0];
    const worst = [...lapOne].sort((a, b) => a.gain - b.gain)[0];
    if (best?.gain > 0) stats.push({ label: "Mejor primera vuelta", value: fullName(best.r), detail: `${plural(best.gain, "puesto", "puestos")} ganados (P${gridOf(best.r) ?? "boxes"} → P${lapData.drivers.get(best.r.Driver.driverId)?.[0]})` });
    if (worst && worst.gain < -2) curiosities.push(`${fullName(worst.r)} perdió ${plural(-worst.gain, "puesto", "puestos")} en la primera vuelta.`);

    // Longest spell in one position by someone who was not leading.
    let spell = { id: "", position: 0, length: 0 };
    for (const [id, p] of lapData.drivers) {
      let run = 0;
      for (let i = 0; i < p.length; i += 1) {
        run = i > 0 && p[i] != null && p[i] === p[i - 1] ? run + 1 : 1;
        if (p[i] != null && p[i]! > 1 && run > spell.length) spell = { id, position: p[i]!, length: run };
      }
    }
    if (spell.length >= 20) curiosities.push(`${byId.has(spell.id) ? fullName(byId.get(spell.id)!) : spell.id} pasó ${spell.length} vueltas seguidas en el ${ord(spell.position)} puesto sin moverse.`);
  }

  // Closest finish between two cars on the same lap.
  let closest: { a: Raw; b: Raw; gap: number } | null = null;
  for (let i = 1; i < classified.length; i += 1) {
    const a = classified[i - 1], b = classified[i];
    const ma = Number(a.Time?.millis), mb = Number(b.Time?.millis);
    if (!Number.isFinite(ma) || !Number.isFinite(mb) || mb <= ma || Number(a.laps) !== Number(b.laps)) continue;
    if (!closest || mb - ma < closest.gap) closest = { a, b, gap: mb - ma };
  }
  if (closest && closest.gap < 1500) curiosities.push(`La llegada más ajustada fue por el ${ord(Number(closest.b.position) - 1)} puesto: ${fmt(closest.gap / 1000, 3)} s entre ${fullName(closest.a)} y ${fullName(closest.b)}.`);

  // Expectation curiosities.
  const same = expectation.filter(r => r.finish !== null && r.grid === r.finish);
  if (same.length) curiosities.push(`${same.map(r => r.name).join(", ")} ${same.length === 1 ? "terminó exactamente donde largó" : "terminaron exactamente donde largaron"}.`);
  const gifted = [...expectation].filter(r => r.finish !== null).sort((a, b) => b.retiredAhead - a.retiredAhead)[0];
  if (gifted?.retiredAhead >= 3) curiosities.push(`${gifted.name} heredó ${gifted.retiredAhead} puestos por abandonos de autos que largaron delante.`);

  // Podium ages and nationalities.
  const podium = classified.slice(0, 3);
  const ages = podium.map(r => ({ r, age: ageOn(r.Driver.dateOfBirth ?? baseline.drivers[r.Driver.driverId]?.birth, race.date) })).filter(x => x.age);
  if (ages.length === 3) {
    const avg = ages.reduce((s, x) => s + x.age!.exact, 0) / 3;
    const youngest = [...ages].sort((a, b) => a.age!.exact - b.age!.exact)[0];
    const oldest = [...ages].sort((a, b) => b.age!.exact - a.age!.exact)[0];
    curiosities.push(`El podio promedió ${fmt(avg, 1)} años: de ${youngest.r.Driver.familyName} (${youngest.age!.years}) a ${oldest.r.Driver.familyName} (${oldest.age!.years}).`);
  }
  const birthday = starters.find(r => { const a = ageOn(r.Driver.dateOfBirth ?? baseline.drivers[r.Driver.driverId]?.birth, race.date); return a && a.days === 0; });
  if (birthday) curiosities.push(`${fullName(birthday)} corrió el día de su cumpleaños.`);
  const nations = new Set(classified.slice(0, 10).map(r => r.Driver.nationality));
  if (nations.size) curiosities.push(`Los diez primeros representan ${plural(nations.size, "nacionalidad", "nacionalidades")}.`);

  // Teammates: who beat whom.
  const teams = new Map<string, Raw[]>();
  for (const r of starters) teams.set(r.Constructor.constructorId, [...(teams.get(r.Constructor.constructorId) ?? []), r]);
  const reversed: string[] = [];
  for (const pair of teams.values()) {
    if (pair.length !== 2 || !pair.every(isClassified)) continue;
    const [a, b] = pair;
    const aheadOnGrid = (gridOf(a) ?? 99) < (gridOf(b) ?? 99) ? a : b;
    const aheadAtEnd = Number(a.position) < Number(b.position) ? a : b;
    if (aheadOnGrid !== aheadAtEnd) reversed.push(`${aheadAtEnd.Driver.familyName} a ${aheadOnGrid.Driver.familyName}`);
  }
  if (reversed.length) curiosities.push(`Duelos de compañeros que se dieron vuelta en carrera: ${reversed.join(", ")}.`);

  const totalLaps = starters.reduce((s, r) => s + (Number(r.laps) || 0), 0);
  curiosities.push(`Entre todos completaron ${fmt(totalLaps)} vueltas.`);

  // --- records and milestones
  const before = new Map<string, Totals>();
  for (const r of previousRaces) addRace(before, r.Results);
  const after = new Map([...before].map(([k, v]) => [k, { ...v }]));
  addRace(after, results);
  const records = [
    ...milestones(race, before, after, gridSource === "official"),
    ...constructorMilestones(race, previousRaces),
    ...seasonNotes(race, previousRaces)
  ];

  return {
    season,
    round,
    name: translate(race.raceName, "races"),
    circuit: race.Circuit?.circuitName ?? "",
    date: race.date,
    laps,
    gridSource,
    complete: gridSource === "official" && Boolean(lapData) && stops.length > 0 && Boolean(fastest),
    expectation,
    overtakes: { source, rows: overtakeRows, total: totalPasses },
    stats,
    records,
    curiosities,
    method: baseline.gridExpectation
  };
}

export const formatDelta = (delta: number | null) => delta === null ? "—" : delta > 0 ? `+${fmt(delta, delta % 1 ? 1 : 0)}` : delta < 0 ? `−${fmt(-delta, delta % 1 ? 1 : 0)}` : "0";
