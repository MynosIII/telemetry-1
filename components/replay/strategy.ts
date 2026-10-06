import type { ReplayLap, ReplaySession, ReplayTimeline } from "@/lib/replay";

export const DEFAULT_PIT_LOSS = 22;
/** Under a safety car the field is slow, so a stop costs roughly half as much. */
export const NEUTRALISED_FACTOR = 0.55;
const DRY = new Set(["SOFT", "MEDIUM", "HARD"]);
const COMPOUNDS = new Set([...DRY, "INTERMEDIATE", "WET"]);

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

/** Compounds a driver has run up to and including `lap`; stints OpenF1 could not identify are left out. */
export function compoundsUsed(data: ReplaySession, driver: number, lap: number) {
  return [...new Set(data.stints
    .filter((stint) => stint.driver === driver && stint.lapStart <= lap && COMPOUNDS.has(stint.compound))
    .map((stint) => stint.compound))];
}

/**
 * A dry race can't be finished on the starting tyres: every car must stop at least once and
 * run two dry compounds, unless intermediates or wets came out.
 */
export function owesStop(compounds: string[], stops: number) {
  if (compounds.some((compound) => !DRY.has(compound))) return false;
  return stops === 0 || compounds.length < 2;
}

/** Average of the last three representative laps completed by `at` (no in-, out- or first laps, no traffic outliers). */
export function recentPace(laps: ReplayLap[], at: number, pitLaps: Set<number>) {
  const done = laps.filter((lap) => lap.lap > 1 && !lap.pitOut && !pitLaps.has(lap.lap) && lap.duration !== null && lap.start !== null && lap.start + lap.duration * 1000 <= at);
  const recent = done.slice(-6).map((lap) => lap.duration as number);
  const typical = median(recent);
  if (typical === null) return null;
  const clean = recent.filter((value) => value < typical * 1.04).slice(-3);
  return clean.length >= 2 ? clean.reduce((sum, value) => sum + value, 0) / clean.length : null;
}

/** Seconds behind the leader; lapped cars count a lap per lap down. */
export function gapSeconds(gap: number | string | null, leaderLap: number | null) {
  if (gap === null || gap === "") return 0;
  if (typeof gap === "number") return gap;
  const laps = Number(gap.match(/(\d+)/)?.[1] ?? 1);
  return laps * (leaderLap ?? 90);
}

export type ProjectionInput = {
  driver: number;
  position: number;
  gap: number;
  compounds: string[];
  stops: number;
  /** Seconds per lap over the last few laps. */
  pace: number | null;
  inPit: boolean;
};

export type ProjectionRow = ProjectionInput & {
  owes: boolean;
  /** Where the car would rejoin if it stopped now, everyone else staying out. */
  rejoin: number;
  ahead: { driver: number; margin: number } | null;
  behind: { driver: number; margin: number } | null;
  /** Position once every car that still owes a stop has made it. */
  theoretical: number;
  /**
   * The car behind on fresher tyres that decides when to stop: `margin` is how far ahead of it
   * this car would rejoin now (negative when it already comes out behind), `gain` what it takes per lap.
   */
  threat: { driver: number; margin: number; gain: number; laps: number | null } | null;
  /** Stopping within a couple of laps keeps it ahead of that car. */
  shouldStop: boolean;
};

/** Laps of warning before a faster car on new tyres would take the place through the stops. */
const STOP_WINDOW_LAPS = 2;
/** Smaller pace differences are noise. */
const MIN_GAIN = 0.15;

export function projectStops(rows: ProjectionInput[], loss: number, mandatory = true): ProjectionRow[] {
  const withOwes = rows.map((row) => ({ ...row, owes: mandatory && !row.inPit && owesStop(row.compounds, row.stops) }));
  const theoreticalOrder = [...withOwes].sort((a, b) => (a.gap + (a.owes ? loss : 0)) - (b.gap + (b.owes ? loss : 0)));
  return withOwes.map((row) => {
    const after = row.gap + loss;
    const others = withOwes.filter((other) => other.driver !== row.driver);
    const front = others.filter((other) => other.gap <= after).sort((a, b) => b.gap - a.gap)[0];
    const back = others.filter((other) => other.gap > after).sort((a, b) => a.gap - b.gap)[0];

    // Cars behind that have already stopped more often are on fresher tyres; the ones lapping
    // faster eat into the margin this car would have after its own stop.
    let threat: ProjectionRow["threat"] = null;
    if (row.owes && row.pace !== null) {
      const chasers = others
        .filter((other) => other.gap > row.gap && other.stops > row.stops && !other.inPit && other.pace !== null && row.pace! - other.pace! >= MIN_GAIN)
        .map((other) => {
          const margin = other.gap - after;
          const gain = row.pace! - other.pace!;
          return { driver: other.driver, margin, gain, laps: margin >= 0 ? margin / gain : null };
        })
        // Only cars close enough for the stop to matter.
        .filter((item) => item.margin > -loss / 2);
      threat = chasers.filter((item) => item.laps !== null).sort((a, b) => (a.laps as number) - (b.laps as number))[0]
        ?? chasers.sort((a, b) => b.margin - a.margin)[0]
        ?? null;
    }
    return {
      ...row,
      rejoin: 1 + others.filter((other) => other.gap <= after).length,
      ahead: front ? { driver: front.driver, margin: after - front.gap } : null,
      behind: back ? { driver: back.driver, margin: back.gap - after } : null,
      theoretical: theoreticalOrder.findIndex((other) => other.driver === row.driver) + 1,
      threat,
      shouldStop: Boolean(threat && threat.laps !== null && threat.laps <= STOP_WINDOW_LAPS)
    };
  });
}
