const API_ROOT = "https://api.jolpi.ca/ergast/f1";
/** Jolpica serves lap-by-lap positions from 1996 onward. */
export const FIRST_LAP_CHART_SEASON = 1996;
const PAGE = 100;
// Past races never change, so a month-long cache keeps the API calls to one batch per race.
const REVALIDATE = 30 * 86400;

type Timing = { driverId?: string; position?: string };
type LapPage = { MRData?: { total?: string; RaceTable?: { Races?: { Laps?: { number?: string; Timings?: Timing[] }[] }[] } } };

export type LapPositions = { laps: number; drivers: Map<string, (number | null)[]> };

async function page(year: number, round: number, offset: number): Promise<LapPage> {
  const response = await fetch(`${API_ROOT}/${year}/${round}/laps/?limit=${PAGE}&offset=${offset}`, { next: { revalidate: REVALIDATE }, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Jolpica laps ${response.status}`);
  return response.json();
}

/** Folds paginated Jolpica lap rows into one position array per driver (index 0 is lap 1). */
export function toPositions(pages: LapPage[]): LapPositions | null {
  const byLap = new Map<number, Timing[]>();
  for (const p of pages) for (const race of p.MRData?.RaceTable?.Races ?? []) for (const lap of race.Laps ?? []) {
    const number = Number(lap.number);
    // A lap can be split across two pages; merge its timings.
    if (Number.isFinite(number)) byLap.set(number, [...(byLap.get(number) ?? []), ...(lap.Timings ?? [])]);
  }
  const laps = Math.max(0, ...byLap.keys());
  if (!laps) return null;
  const drivers = new Map<string, (number | null)[]>();
  for (const [number, timings] of byLap) for (const t of timings) {
    const position = Number(t.position);
    if (!t.driverId || !Number.isFinite(position)) continue;
    if (!drivers.has(t.driverId)) drivers.set(t.driverId, Array(laps).fill(null));
    drivers.get(t.driverId)![number - 1] = position;
  }
  return { laps, drivers };
}

export async function getLapPositions(year: number, round: number): Promise<LapPositions | null> {
  if (year < FIRST_LAP_CHART_SEASON) return null;
  try {
    const first = await page(year, round, 0);
    const total = Number(first.MRData?.total ?? 0);
    const pages = [first];
    // Sequential batches of three stay under Jolpica's burst limit of four requests per second.
    for (let offset = PAGE; offset < total; offset += PAGE * 3) {
      if (offset > PAGE) await new Promise(resolve => setTimeout(resolve, 1000));
      const batch = [offset, offset + PAGE, offset + PAGE * 2].filter(o => o < total);
      pages.push(...await Promise.all(batch.map(o => page(year, round, o))));
    }
    return toPositions(pages);
  } catch {
    return null;
  }
}

/** Consecutive lap ranges a driver spent in first place, as [from, to] pairs. */
export function leadStints(positions: (number | null)[]) {
  const stints: [number, number][] = [];
  positions.forEach((p, i) => {
    if (p !== 1) return;
    const last = stints.at(-1);
    if (last && last[1] === i) last[1] = i + 1;
    else stints.push([i + 1, i + 1]);
  });
  return stints;
}
