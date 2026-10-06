import type { HistoryEntity, HistorySummary } from "./history";

type RaceResult = NonNullable<HistoryEntity["raceResults"]>[number];

// Entries that never took the start: they count as races entered, not as duels.
const NOT_STARTED = new Set(["DNQ", "DNPQ", "DNS", "EX", "DNP"]);

/** Resolves a query value written as an archive id or as a driver's name. */
export function findDriver(drivers: HistorySummary[], value: string | undefined) {
  if (!value) return undefined;
  const wanted = value.trim().toLowerCase();
  return drivers.find(d => d.id === wanted) ?? drivers.find(d => d.name.toLowerCase() === wanted || d.fullName.toLowerCase() === wanted);
}

/** One row per race: the first non-shared entry, so shared cars do not count twice. */
function byRace(results: RaceResult[] = []) {
  const races = new Map<string, RaceResult>();
  for (const r of results) {
    const key = `${r.season}/${r.round}`;
    const current = races.get(key);
    if (!current || (current.shared && !r.shared)) races.set(key, r);
  }
  return races;
}

/** -1 when a finished ahead of b, 1 when b did, 0 when the result cannot separate them. */
function raceOrder(a: RaceResult, b: RaceResult) {
  if (a.position != null && b.position != null) return Math.sign(a.position - b.position);
  if (a.position != null) return -1;
  if (b.position != null) return 1;
  return Math.sign((b.laps ?? 0) - (a.laps ?? 0));
}

function gridOrder(a: RaceResult, b: RaceResult) {
  // Grid 0 is a pit-lane start in F1DB: it ranks behind every grid slot.
  const slot = (r: RaceResult) => r.grid == null ? null : r.grid === 0 ? 99 : r.grid;
  const ga = slot(a), gb = slot(b);
  return ga == null || gb == null ? 0 : Math.sign(ga - gb);
}

export type Duel = { season: number; round: number; event: string; a: RaceResult; b: RaceResult; teammates: boolean; race: number; grid: number };
export type DuelTotals = { races: number; aRace: number; bRace: number; aGrid: number; bGrid: number; gridRaces: number };

export function headToHead(a: HistoryEntity, b: HistoryEntity) {
  const left = byRace(a.raceResults), right = byRace(b.raceResults);
  const duels: Duel[] = [];
  for (const [key, ra] of left) {
    const rb = right.get(key);
    if (!rb || NOT_STARTED.has(ra.status) || NOT_STARTED.has(rb.status)) continue;
    duels.push({ season: ra.season, round: ra.round, event: ra.event, a: ra, b: rb, teammates: ra.constructorId === rb.constructorId, race: raceOrder(ra, rb), grid: gridOrder(ra, rb) });
  }
  duels.sort((x, y) => x.season - y.season || x.round - y.round);
  const total = (rows: Duel[]): DuelTotals => ({
    races: rows.length,
    aRace: rows.filter(d => d.race < 0).length, bRace: rows.filter(d => d.race > 0).length,
    aGrid: rows.filter(d => d.grid < 0).length, bGrid: rows.filter(d => d.grid > 0).length,
    gridRaces: rows.filter(d => d.a.grid != null && d.b.grid != null).length
  });
  return { duels, all: total(duels), teammates: total(duels.filter(d => d.teammates)) };
}

export type RatingPoint = { x: number; rating: number; label: string };

/** ELO points placed by calendar position or by the driver's age on race day. */
export function ratingSeries(entity: HistoryEntity, axis: "fecha" | "edad"): RatingPoint[][] {
  const dates = new Map((entity.raceResults ?? []).map(r => [`${r.season}/${r.round}`, r.date]));
  const born = entity.biography?.dateOfBirth ? Date.parse(entity.biography.dateOfBirth) : NaN;
  const rounds = new Map<number, number>();
  entity.ratingHistory.forEach(r => rounds.set(r.season, Math.max(rounds.get(r.season) ?? 1, r.round)));
  const points: (RatingPoint & { season: number })[] = [];
  for (const r of entity.ratingHistory) {
    let x: number;
    if (axis === "edad") {
      const date = Date.parse(dates.get(`${r.season}/${r.round}`) ?? "");
      if (Number.isNaN(born) || Number.isNaN(date)) continue;
      x = (date - born) / (365.2425 * 86400000);
    } else {
      x = r.season + (r.round - .5) / (rounds.get(r.season) ?? 1);
    }
    points.push({ x, rating: r.rating, label: `${r.season} ${r.event}`, season: r.season });
  }
  // Break the line across seasons without races so retirements are not drawn as data.
  const segments: RatingPoint[][] = [];
  points.forEach((p, i) => {
    if (!i || p.season - points[i - 1].season > 1) segments.push([]);
    segments[segments.length - 1].push({ x: p.x, rating: p.rating, label: p.label });
  });
  return segments;
}
