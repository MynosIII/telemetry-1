export { POSITION_CHUNK_MS } from "@/lib/replay-constants";
import { MEMO_FINISHED, dateRange, num, openF1, str, time, type Row } from "@/lib/openf1";

export type ReplaySessionSummary = {
  key: number;
  meetingKey: number;
  name: string;
  type: string;
  meeting: string;
  country: string;
  countryCode: string;
  circuit: string;
  startsAt: string;
  endsAt: string;
  finished: boolean;
};

export type ReplayDriver = {
  number: number;
  acronym: string;
  name: string;
  team: string;
  color: string;
};

export type ReplayLap = {
  lap: number;
  /** Lap start, ms since epoch. */
  start: number | null;
  /** Seconds. */
  duration: number | null;
  sectors: [number | null, number | null, number | null];
  pitOut: boolean;
  speedTrap: number | null;
  /** Mini-sector status codes per sector (2048 yellow, 2049 green, 2051 purple, 2064 pit lane, 0 no data). */
  segments: [number[], number[], number[]];
};

export type ReplayStint = {
  driver: number;
  stint: number;
  compound: string;
  lapStart: number;
  lapEnd: number | null;
  ageAtStart: number;
};

export type ReplayWeather = {
  at: number;
  air: number | null;
  track: number | null;
  humidity: number | null;
  rain: boolean;
  wind: number | null;
};

export type ReplaySession = {
  session: ReplaySessionSummary;
  drivers: ReplayDriver[];
  laps: Record<number, ReplayLap[]>;
  stints: ReplayStint[];
  weather: ReplayWeather[];
};

export type LapTelemetry = {
  driver: number;
  lap: number;
  duration: number | null;
  /** The lap ended long enough ago that OpenF1 has every sample. */
  complete: boolean;
  /** Parallel arrays, one entry per car_data sample (~4 per second). */
  t: number[];
  d: number[];
  speed: number[];
  rpm: number[];
  gear: number[];
  throttle: number[];
  brake: number[];
  drs: number[];
  x: (number | null)[];
  y: (number | null)[];
};

const SESSION_NAMES: Record<string, string> = {
  Race: "Carrera",
  Qualifying: "Clasificación",
  Sprint: "Sprint",
  "Sprint Qualifying": "Clasificación sprint",
  "Sprint Shootout": "Clasificación sprint",
  "Practice 1": "Libres 1",
  "Practice 2": "Libres 2",
  "Practice 3": "Libres 3"
};

export function sessionLabel(name: string) {
  return SESSION_NAMES[name] ?? name;
}

/** A session counts as finished an hour after its scheduled end, when OpenF1 has the full record. */
function isFinished(endsAt: string) {
  const end = Date.parse(endsAt);
  return Number.isFinite(end) && Date.now() > end + 60 * 60_000;
}

function toSummary(row: Row, meetings: Map<number, Row>): ReplaySessionSummary | null {
  const key = num(row.session_key);
  if (key === null) return null;
  const meetingKey = num(row.meeting_key) ?? 0;
  const meeting = meetings.get(meetingKey);
  const endsAt = str(row.date_end);
  return {
    key,
    meetingKey,
    name: sessionLabel(str(row.session_name, "Sesión")),
    type: str(row.session_type),
    meeting: str(meeting?.meeting_name) || `GP de ${str(row.country_name)}`,
    country: str(row.country_name),
    countryCode: str(row.country_code),
    circuit: str(row.circuit_short_name),
    startsAt: str(row.date_start),
    endsAt,
    finished: isFinished(endsAt)
  };
}

export async function listSessions(year: number): Promise<ReplaySessionSummary[]> {
  const [sessions, meetings] = await Promise.all([
    openF1(`/sessions?year=${year}`, 10 * 60_000),
    openF1(`/meetings?year=${year}`, 10 * 60_000)
  ]);
  const byMeeting = new Map(meetings.map((meeting) => [num(meeting.meeting_key) ?? -1, meeting]));
  return sessions
    .map((row) => toSummary(row, byMeeting))
    .filter((session): session is ReplaySessionSummary => session !== null && Date.parse(session.startsAt) < Date.now())
    // Pre-season testing has no championship data worth replaying.
    .filter((session) => !/test/i.test(session.meeting))
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
}

export async function getSessionSummary(key: number): Promise<ReplaySessionSummary | null> {
  const [row] = await openF1(`/sessions?session_key=${key}`, 10 * 60_000);
  if (!row) return null;
  const meetingKey = num(row.meeting_key);
  const meetings = meetingKey === null ? [] : await openF1(`/meetings?meeting_key=${meetingKey}`, MEMO_FINISHED);
  return toSummary(row, new Map(meetings.map((meeting) => [num(meeting.meeting_key) ?? -1, meeting])));
}

function toDriver(row: Row): ReplayDriver | null {
  const number = num(row.driver_number);
  if (number === null) return null;
  const colour = str(row.team_colour).replace(/^#/, "");
  return {
    number,
    acronym: str(row.name_acronym, String(number)),
    name: str(row.full_name, str(row.broadcast_name, `Piloto ${number}`)),
    team: str(row.team_name, "—"),
    color: /^[0-9a-f]{6}$/i.test(colour) ? `#${colour}` : "#8a8a8a"
  };
}

function segmentList(value: unknown): number[] {
  return Array.isArray(value) ? value.map((item) => (typeof item === "number" ? item : 0)) : [];
}

function toLap(row: Row): ReplayLap | null {
  const lap = num(row.lap_number);
  if (lap === null) return null;
  return {
    lap,
    start: time(row.date_start),
    duration: num(row.lap_duration),
    sectors: [num(row.duration_sector_1), num(row.duration_sector_2), num(row.duration_sector_3)],
    pitOut: row.is_pit_out_lap === true,
    speedTrap: num(row.st_speed),
    segments: [segmentList(row.segments_sector_1), segmentList(row.segments_sector_2), segmentList(row.segments_sector_3)]
  };
}

export function groupLaps(rows: Row[]) {
  const laps: Record<number, ReplayLap[]> = {};
  for (const row of rows) {
    const driver = num(row.driver_number);
    const lap = toLap(row);
    if (driver === null || !lap) continue;
    (laps[driver] ??= []).push(lap);
  }
  for (const list of Object.values(laps)) list.sort((a, b) => a.lap - b.lap);
  return laps;
}

export function toStints(rows: Row[]): ReplayStint[] {
  return rows.flatMap((row) => {
    const driver = num(row.driver_number);
    const lapStart = num(row.lap_start);
    if (driver === null || lapStart === null) return [];
    return [{
      driver,
      stint: num(row.stint_number) ?? 1,
      compound: str(row.compound, "UNKNOWN").toUpperCase(),
      lapStart,
      lapEnd: num(row.lap_end),
      ageAtStart: num(row.tyre_age_at_start) ?? 0
    }];
  }).sort((a, b) => a.driver - b.driver || a.stint - b.stint);
}

export function toWeather(rows: Row[]): ReplayWeather[] {
  return rows.flatMap((row) => {
    const at = time(row.date);
    if (at === null) return [];
    return [{
      at,
      air: num(row.air_temperature),
      track: num(row.track_temperature),
      humidity: num(row.humidity),
      rain: (num(row.rainfall) ?? 0) > 0,
      wind: num(row.wind_speed)
    }];
  }).sort((a, b) => a.at - b.at);
}

export async function getReplaySession(key: number): Promise<ReplaySession | null> {
  const session = await getSessionSummary(key);
  if (!session) return null;
  const memoMs = session.finished ? MEMO_FINISHED : 5_000;
  const [driverRows, lapRows, stintRows, weatherRows] = await Promise.all([
    openF1(`/drivers?session_key=${key}`, memoMs),
    openF1(`/laps?session_key=${key}`, memoMs),
    openF1(`/stints?session_key=${key}`, memoMs),
    openF1(`/weather?session_key=${key}`, memoMs)
  ]);
  const seen = new Set<number>();
  const drivers = driverRows
    .map(toDriver)
    .filter((driver): driver is ReplayDriver => {
      if (!driver || seen.has(driver.number)) return false;
      seen.add(driver.number);
      return true;
    })
    .sort((a, b) => a.number - b.number);
  return { session, drivers, laps: groupLaps(lapRows), stints: toStints(stintRows), weather: toWeather(weatherRows) };
}

/** Index of the sample in `times` (sorted) closest to `target`. */
function nearest(times: number[], target: number) {
  let low = 0;
  let high = times.length - 1;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (times[middle] < target) low = middle + 1;
    else high = middle;
  }
  if (low > 0 && Math.abs(times[low - 1] - target) <= Math.abs(times[low] - target)) return low - 1;
  return low;
}

export async function getLapTelemetry(key: number, driver: number, lapNumber: number): Promise<LapTelemetry | null> {
  const lapRows = await openF1(`/laps?session_key=${key}&driver_number=${driver}`, MEMO_FINISHED);
  const laps = (groupLaps(lapRows)[driver] ?? []);
  const index = laps.findIndex((lap) => lap.lap === lapNumber);
  const lap = laps[index];
  if (!lap || lap.start === null) return null;
  const nextStart = laps[index + 1]?.start ?? null;
  const end = lap.duration !== null ? lap.start + lap.duration * 1000 : nextStart ?? lap.start + 150_000;
  const range = dateRange(lap.start - 250, end + 250);
  const [carRows, locationRows] = await Promise.all([
    openF1(`/car_data?session_key=${key}&driver_number=${driver}&${range}`),
    openF1(`/location?session_key=${key}&driver_number=${driver}&${range}`)
  ]);

  const samples = carRows
    .map((row) => ({ at: time(row.date), row }))
    .filter((sample): sample is { at: number; row: Row } => sample.at !== null && sample.at >= lap.start! - 250 && sample.at <= end + 250)
    .sort((a, b) => a.at - b.at);
  const locations = locationRows
    .map((row) => ({ at: time(row.date), x: num(row.x), y: num(row.y) }))
    .filter((sample): sample is { at: number; x: number; y: number } => sample.at !== null && sample.x !== null && sample.y !== null && !(sample.x === 0 && sample.y === 0))
    .sort((a, b) => a.at - b.at);
  const locationTimes = locations.map((sample) => sample.at);

  const telemetry: LapTelemetry = {
    driver, lap: lapNumber, duration: lap.duration, complete: end < Date.now() - 120_000,
    t: [], d: [], speed: [], rpm: [], gear: [], throttle: [], brake: [], drs: [], x: [], y: []
  };
  let distance = 0;
  samples.forEach(({ at, row }, i) => {
    const speed = num(row.speed) ?? 0;
    if (i > 0) {
      const previous = samples[i - 1];
      const dt = (at - previous.at) / 1000;
      distance += ((num(previous.row.speed) ?? 0) + speed) / 2 / 3.6 * dt;
    }
    const location = locations.length ? locations[nearest(locationTimes, at)] : null;
    const close = location && Math.abs(location.at - at) < 1500;
    telemetry.t.push(Math.round(at - lap.start!) / 1000);
    telemetry.d.push(Math.round(distance));
    telemetry.speed.push(speed);
    telemetry.rpm.push(num(row.rpm) ?? 0);
    telemetry.gear.push(num(row.n_gear) ?? 0);
    telemetry.throttle.push(Math.min(100, Math.max(0, num(row.throttle) ?? 0)));
    telemetry.brake.push((num(row.brake) ?? 0) > 0 ? 100 : 0);
    telemetry.drs.push(num(row.drs) ?? 0);
    telemetry.x.push(close ? location.x : null);
    telemetry.y.push(close ? location.y : null);
  });
  return telemetry;
}

export type ReplayIntervalPoint = [at: number, gap: number | string | null, interval: number | string | null];

export type ReplayTimeline = {
  /** Per driver, [ms, position] changes in time order. */
  positions: Record<number, [number, number][]>;
  intervals: Record<number, ReplayIntervalPoint[]>;
  pits: { driver: number; at: number; lap: number | null; duration: number | null }[];
  raceControl: { at: number; category: string; flag: string | null; message: string; driver: number | null; lap: number | null }[];
  /** Team radio clips, in time order. */
  radios: { at: number; driver: number; url: string }[];
  track: { x: number; y: number }[];
  finished: boolean;
};

/** Car positions for a window: per driver, parallel arrays of ms offsets from `from` and x/y. */
export type ReplayPositionsChunk = {
  from: number;
  to: number;
  cars: Record<number, { t: number[]; x: number[]; y: number[] }>;
};

/** One driver's car_data for a window: parallel arrays, `t` in ms from `from`. */
export type CarDataChunk = {
  from: number;
  to: number;
  driver: number;
  t: number[];
  speed: number[];
  rpm: number[];
  gear: number[];
  throttle: number[];
  brake: number[];
  drs: number[];
};

const INTERVAL_STEP_MS = 8_000;
const POSITION_STEP_MS = 450;

function gapValue(value: unknown): number | string | null {
  if (typeof value === "string") return value;
  return num(value);
}

/** Track outline from the location samples of the session's fastest clean lap. */
async function trackOutline(key: number, lapRows: Row[]) {
  const best = lapRows
    .map((row) => ({ driver: num(row.driver_number), start: time(row.date_start), duration: num(row.lap_duration), pitOut: row.is_pit_out_lap === true }))
    .filter((lap) => lap.driver !== null && lap.start !== null && lap.duration !== null && !lap.pitOut)
    .sort((a, b) => (a.duration as number) - (b.duration as number))[0];
  if (!best) return [];
  const rows = await openF1(`/location?session_key=${key}&driver_number=${best.driver}&${dateRange(best.start as number, (best.start as number) + (best.duration as number) * 1000)}`, MEMO_FINISHED);
  const points = rows
    .map((row) => ({ at: time(row.date), x: num(row.x), y: num(row.y) }))
    .filter((point): point is { at: number; x: number; y: number } => point.at !== null && point.x !== null && point.y !== null && !(point.x === 0 && point.y === 0))
    .sort((a, b) => a.at - b.at)
    .map(({ x, y }) => ({ x, y }));
  return points.length > 1 ? [...points, points[0]] : points;
}

export async function getReplayTimeline(key: number): Promise<ReplayTimeline | null> {
  const session = await getSessionSummary(key);
  if (!session) return null;
  const memoMs = session.finished ? MEMO_FINISHED : 5_000;
  const [positionRows, intervalRows, pitRows, controlRows, lapRows, radioRows] = await Promise.all([
    openF1(`/position?session_key=${key}`, memoMs),
    openF1(`/intervals?session_key=${key}`, memoMs).catch(() => []),
    openF1(`/pit?session_key=${key}`, memoMs).catch(() => []),
    openF1(`/race_control?session_key=${key}`, memoMs).catch(() => []),
    openF1(`/laps?session_key=${key}`, memoMs),
    openF1(`/team_radio?session_key=${key}`, memoMs).catch(() => [])
  ]);

  const positions: ReplayTimeline["positions"] = {};
  for (const row of positionRows) {
    const driver = num(row.driver_number);
    const at = time(row.date);
    const position = num(row.position);
    if (driver === null || at === null || position === null) continue;
    (positions[driver] ??= []).push([at, position]);
  }
  for (const list of Object.values(positions)) list.sort((a, b) => a[0] - b[0]);

  // Intervals arrive every few seconds per driver; one point every 8 s is plenty for a tower.
  const intervals: ReplayTimeline["intervals"] = {};
  const sortedIntervals = intervalRows
    .map((row) => ({ driver: num(row.driver_number), at: time(row.date), row }))
    .filter((item): item is { driver: number; at: number; row: Row } => item.driver !== null && item.at !== null)
    .sort((a, b) => a.at - b.at);
  for (const { driver, at, row } of sortedIntervals) {
    const list = (intervals[driver] ??= []);
    const last = list.at(-1);
    const point: ReplayIntervalPoint = [at, gapValue(row.gap_to_leader), gapValue(row.interval)];
    // One point per 8-second bucket: the latest reading in the bucket wins.
    if (last && Math.floor(at / INTERVAL_STEP_MS) === Math.floor(last[0] / INTERVAL_STEP_MS)) list[list.length - 1] = point;
    else list.push(point);
  }

  const pits = pitRows.flatMap((row) => {
    const driver = num(row.driver_number);
    const at = time(row.date);
    return driver === null || at === null ? [] : [{ driver, at, lap: num(row.lap_number), duration: num(row.pit_duration) }];
  }).sort((a, b) => a.at - b.at);

  const raceControl = controlRows.flatMap((row) => {
    const at = time(row.date);
    return at === null ? [] : [{
      at,
      category: str(row.category, "Other"),
      flag: str(row.flag) || null,
      message: str(row.message),
      driver: num(row.driver_number),
      lap: num(row.lap_number)
    }];
  }).sort((a, b) => a.at - b.at);

  const radios = radioRows.flatMap((row) => {
    const driver = num(row.driver_number);
    const at = time(row.date);
    const url = str(row.recording_url);
    return driver === null || at === null || !/^https?:\/\//.test(url) ? [] : [{ at, driver, url }];
  }).sort((a, b) => a.at - b.at);

  const track = await trackOutline(key, lapRows).catch(() => []);
  return { positions, intervals, pits, raceControl, radios, track, finished: session.finished };
}

export async function getReplayPositions(key: number, from: number, to: number): Promise<ReplayPositionsChunk> {
  const rows = await openF1(`/location?session_key=${key}&${dateRange(from, to)}`);
  const byDriver = new Map<number, { at: number; x: number; y: number }[]>();
  for (const row of rows) {
    const driver = num(row.driver_number);
    const at = time(row.date);
    const x = num(row.x);
    const y = num(row.y);
    if (driver === null || at === null || x === null || y === null || (x === 0 && y === 0) || at < from || at > to) continue;
    const list = byDriver.get(driver) ?? [];
    list.push({ at, x, y });
    byDriver.set(driver, list);
  }
  const cars: ReplayPositionsChunk["cars"] = {};
  for (const [driver, list] of byDriver) {
    list.sort((a, b) => a.at - b.at);
    const car = { t: [] as number[], x: [] as number[], y: [] as number[] };
    let last = -Infinity;
    for (const sample of list) {
      if (sample.at - last < POSITION_STEP_MS) continue;
      last = sample.at;
      car.t.push(sample.at - from);
      car.x.push(Math.round(sample.x));
      car.y.push(Math.round(sample.y));
    }
    cars[driver] = car;
  }
  return { from, to, cars };
}

export async function getCarDataChunk(key: number, driver: number, from: number, to: number): Promise<CarDataChunk> {
  const rows = await openF1(`/car_data?session_key=${key}&driver_number=${driver}&${dateRange(from, to)}`);
  const samples = rows
    .map((row) => ({ at: time(row.date), row }))
    .filter((sample): sample is { at: number; row: Row } => sample.at !== null && sample.at >= from && sample.at < to)
    .sort((a, b) => a.at - b.at);
  const chunk: CarDataChunk = { from, to, driver, t: [], speed: [], rpm: [], gear: [], throttle: [], brake: [], drs: [] };
  for (const { at, row } of samples) {
    chunk.t.push(at - from);
    chunk.speed.push(num(row.speed) ?? 0);
    chunk.rpm.push(num(row.rpm) ?? 0);
    chunk.gear.push(num(row.n_gear) ?? 0);
    chunk.throttle.push(Math.min(100, Math.max(0, num(row.throttle) ?? 0)));
    chunk.brake.push((num(row.brake) ?? 0) > 0 ? 100 : 0);
    chunk.drs.push(num(row.drs) ?? 0);
  }
  return chunk;
}

/** Every car's inputs for a window, about one sample a second: parallel arrays, `t` in ms from `from`. */
export type FieldInputsChunk = {
  from: number;
  to: number;
  cars: Record<number, { t: number[]; speed: number[]; gear: number[]; throttle: number[]; brake: number[] }>;
};

const INPUT_STEP_MS = 900;

export async function getFieldInputs(key: number, from: number, to: number): Promise<FieldInputsChunk> {
  const rows = await openF1(`/car_data?session_key=${key}&${dateRange(from, to)}`);
  const byDriver = new Map<number, { at: number; row: Row }[]>();
  for (const row of rows) {
    const driver = num(row.driver_number);
    const at = time(row.date);
    if (driver === null || at === null || at < from || at >= to) continue;
    const list = byDriver.get(driver) ?? [];
    list.push({ at, row });
    byDriver.set(driver, list);
  }
  const cars: FieldInputsChunk["cars"] = {};
  for (const [driver, list] of byDriver) {
    list.sort((a, b) => a.at - b.at);
    const car = { t: [] as number[], speed: [] as number[], gear: [] as number[], throttle: [] as number[], brake: [] as number[] };
    let last = -Infinity;
    for (const { at, row } of list) {
      if (at - last < INPUT_STEP_MS) continue;
      last = at;
      car.t.push(at - from);
      car.speed.push(num(row.speed) ?? 0);
      car.gear.push(num(row.n_gear) ?? 0);
      car.throttle.push(Math.min(100, Math.max(0, num(row.throttle) ?? 0)));
      car.brake.push((num(row.brake) ?? 0) > 0 ? 1 : 0);
    }
    cars[driver] = car;
  }
  return { from, to, cars };
}
