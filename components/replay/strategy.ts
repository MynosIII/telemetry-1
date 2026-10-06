import type { ReplayLap, ReplaySession, ReplayTimeline } from "@/lib/replay";

export const DEFAULT_PIT_LOSS = 22;
/** Under a safety car the field is slow, so a stop costs roughly half as much. */
export const NEUTRALISED_FACTOR = 0.55;
const DRY = new Set(["SOFT", "MEDIUM", "HARD"]);

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function cleanLapsNear(laps: ReplayLap[], around: number, skip: Set<number>) {
  return laps
    .filter((lap) => Math.abs(lap.lap - around) <= 5 && !skip.has(lap.lap) && !lap.pitOut && lap.duration !== null && lap.lap > 1)
    .map((lap) => lap.duration as number);
}

/**
 * Time a stop costs in this race: in-lap plus out-lap minus two normal laps around them,
 * the median over every stop completed before `at`. Falls back to a typical 22 s.
 */
export function estimatePitLoss(data: ReplaySession, timeline: ReplayTimeline, at: number) {
  const losses: number[] = [];
  for (const pit of timeline.pits) {
    if (pit.at > at || pit.lap === null) continue;
    const laps = data.laps[pit.driver] ?? [];
    const inLap = laps.find((lap) => lap.lap === pit.lap);
    const outLap = laps.find((lap) => lap.lap === (pit.lap as number) + 1);
    if (!inLap?.duration || !outLap?.duration || outLap.start === null || outLap.start + outLap.duration * 1000 > at) continue;
    const normal = median(cleanLapsNear(laps, pit.lap, new Set([pit.lap, pit.lap + 1])));
    if (normal === null) continue;
    const loss = inLap.duration + outLap.duration - normal * 2;
    // Stops under a safety car or with a long repair would skew the figure.
    if (loss > 12 && loss < 40) losses.push(loss);
  }
  const value = median(losses);
  return { seconds: value ?? DEFAULT_PIT_LOSS, samples: losses.length };
}

/** Compounds a driver has run up to and including `lap`. */
export function compoundsUsed(data: ReplaySession, driver: number, lap: number) {
  return [...new Set(data.stints.filter((stint) => stint.driver === driver && stint.lapStart <= lap).map((stint) => stint.compound))];
}

/** A dry race requires two different dry compounds unless intermediates or wets were used. */
export function owesStop(compounds: string[]) {
  if (!compounds.length || compounds.some((compound) => !DRY.has(compound))) return false;
  return compounds.length < 2;
}

/** Seconds behind the leader; lapped cars count a lap per lap down. */
export function gapSeconds(gap: number | string | null, leaderLap: number | null) {
  if (gap === null || gap === "") return 0;
  if (typeof gap === "number") return gap;
  const laps = Number(gap.match(/(\d+)/)?.[1] ?? 1);
  return laps * (leaderLap ?? 90);
}

export type ProjectionRow = {
  driver: number;
  position: number;
  gap: number;
  owes: boolean;
  compounds: string[];
  /** Where the car would rejoin if it stopped now, everyone else staying out. */
  rejoin: number;
  ahead: { driver: number; margin: number } | null;
  behind: { driver: number; margin: number } | null;
  /** Position once every car that still owes a stop has made it. */
  virtual: number;
};

export function projectStops(rows: { driver: number; position: number; gap: number; compounds: string[] }[], loss: number, mandatory = true): ProjectionRow[] {
  const withOwes = rows.map((row) => ({ ...row, owes: mandatory && owesStop(row.compounds) }));
  const virtualOrder = [...withOwes].sort((a, b) => (a.gap + (a.owes ? loss : 0)) - (b.gap + (b.owes ? loss : 0)));
  return withOwes.map((row) => {
    const after = row.gap + loss;
    const others = withOwes.filter((other) => other.driver !== row.driver);
    const front = others.filter((other) => other.gap <= after).sort((a, b) => b.gap - a.gap)[0];
    const back = others.filter((other) => other.gap > after).sort((a, b) => a.gap - b.gap)[0];
    return {
      ...row,
      rejoin: 1 + others.filter((other) => other.gap <= after).length,
      ahead: front ? { driver: front.driver, margin: after - front.gap } : null,
      behind: back ? { driver: back.driver, margin: back.gap - after } : null,
      virtual: virtualOrder.findIndex((other) => other.driver === row.driver) + 1
    };
  });
}
