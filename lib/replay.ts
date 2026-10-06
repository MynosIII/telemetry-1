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
};

export type ReplaySession = {
  session: ReplaySessionSummary;
  drivers: ReplayDriver[];
  laps: Record<number, ReplayLap[]>;
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

function toLap(row: Row): ReplayLap | null {
  const lap = num(row.lap_number);
  if (lap === null) return null;
  return {
    lap,
    start: time(row.date_start),
    duration: num(row.lap_duration),
    sectors: [num(row.duration_sector_1), num(row.duration_sector_2), num(row.duration_sector_3)],
    pitOut: row.is_pit_out_lap === true,
    speedTrap: num(row.st_speed)
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

export async function getReplaySession(key: number): Promise<ReplaySession | null> {
  const session = await getSessionSummary(key);
  if (!session) return null;
  const memoMs = session.finished ? MEMO_FINISHED : 5_000;
  const [driverRows, lapRows] = await Promise.all([
    openF1(`/drivers?session_key=${key}`, memoMs),
    openF1(`/laps?session_key=${key}`, memoMs)
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
  return { session, drivers, laps: groupLaps(lapRows) };
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
