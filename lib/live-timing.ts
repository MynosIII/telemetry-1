const OPENF1_ROOT = "https://api.openf1.org/v1";
const SNAPSHOT_CACHE_MS = 10_000;

let lastSuccessfulSnapshot: LiveTimingSnapshot | null = null;
let lastSuccessfulAt = 0;

type JsonRecord = Record<string, unknown>;

export type LiveTimingMode = "live" | "replay" | "waiting" | "unavailable";

export type LiveTimingDriver = {
  driverNumber: number;
  acronym: string;
  name: string;
  team: string;
  teamColor: string | null;
  position: number | null;
  gap: string | number | null;
  interval: string | number | null;
  lastLap: number | null;
  bestLap: number | null;
  lapNumber: number | null;
  compound: string | null;
  tyreAge: number | null;
  pits: number;
  speed: number | null;
  throttle: number | null;
  brake: number | null;
  gear: number | null;
  rpm: number | null;
  drs: number | null;
  x: number | null;
  y: number | null;
  z: number | null;
};

export type LiveTrackPoint = { x: number; y: number };

export type LiveTimingSnapshot = {
  mode: LiveTimingMode;
  configured: boolean;
  updatedAt: string;
  session: {
    key: number;
    name: string;
    type: string;
    circuit: string;
    location: string;
    country: string;
    startsAt: string;
    endsAt: string;
    active: boolean;
  } | null;
  weather: {
    airTemperature: number | null;
    trackTemperature: number | null;
    humidity: number | null;
    rainfall: number | null;
    windSpeed: number | null;
  } | null;
  track: {
    points: LiveTrackPoint[];
  };
  drivers: LiveTimingDriver[];
  messages: Array<{
    date: string;
    category: string;
    message: string;
    flag: string | null;
  }>;
  notice: string;
};

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function latestByDriver(records: JsonRecord[]) {
  const latest = new Map<number, JsonRecord>();
  for (const record of records) {
    const number = asNumber(record.driver_number);
    if (number === null) continue;
    const previous = latest.get(number);
    const currentDate = Date.parse(asString(record.date));
    const previousDate = previous ? Date.parse(asString(previous.date)) : Number.NEGATIVE_INFINITY;
    if (!previous || !Number.isFinite(previousDate) || currentDate >= previousDate) latest.set(number, record);
  }
  return latest;
}

function groupByDriver(records: JsonRecord[]) {
  const grouped = new Map<number, JsonRecord[]>();
  for (const record of records) {
    const number = asNumber(record.driver_number);
    if (number === null) continue;
    const bucket = grouped.get(number) ?? [];
    bucket.push(record);
    grouped.set(number, bucket);
  }
  return grouped;
}

function sampleTrack(records: JsonRecord[], maximum = 260): LiveTrackPoint[] {
  const valid = records.flatMap<LiveTrackPoint>((record) => {
    const x = asNumber(record.x);
    const y = asNumber(record.y);
    return x === null || y === null ? [] : [{ x, y }];
  });
  if (valid.length <= maximum) return valid;
  const step = Math.ceil(valid.length / maximum);
  return valid.filter((_, index) => index % step === 0 || index === valid.length - 1);
}

function latestTimestamp(records: JsonRecord[]) {
  return records.reduce((latest, record) => {
    const timestamp = Date.parse(asString(record.date, asString(record.date_start)));
    return Number.isFinite(timestamp) ? Math.max(latest, timestamp) : latest;
  }, Number.NEGATIVE_INFINITY);
}

async function openF1<T>(path: string, token?: string): Promise<T> {
  const response = await fetch(`${OPENF1_ROOT}${path}`, {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    signal: AbortSignal.timeout(12_000)
  });
  if (!response.ok) throw new Error(`OpenF1 ${response.status}`);
  return response.json() as Promise<T>;
}

function emptySnapshot(notice: string): LiveTimingSnapshot {
  return {
    mode: "unavailable",
    configured: Boolean(process.env.OPENF1_API_TOKEN),
    updatedAt: new Date().toISOString(),
    session: null,
    weather: null,
    track: { points: [] },
    drivers: [],
    messages: [],
    notice
  };
}

export async function getLiveTimingSnapshot(): Promise<LiveTimingSnapshot> {
  const requestedAt = Date.now();
  if (lastSuccessfulSnapshot && requestedAt - lastSuccessfulAt < SNAPSHOT_CACHE_MS) {
    return lastSuccessfulSnapshot;
  }
  const token = process.env.OPENF1_API_TOKEN?.trim();
  const configured = Boolean(token);

  try {
    const sessions = await openF1<JsonRecord[]>("/sessions?session_key=latest", token);
    const rawSession = sessions.at(-1);
    if (!rawSession) return emptySnapshot("OpenF1 todavía no publicó una sesión para mostrar.");

    const key = asNumber(rawSession.session_key);
    if (key === null) return emptySnapshot("La sesión más reciente no tiene un identificador válido.");

    const startsAt = asString(rawSession.date_start);
    const endsAt = asString(rawSession.date_end);
    const now = Date.now();
    const start = Date.parse(startsAt);
    const end = Date.parse(endsAt);
    const active = Number.isFinite(start) && Number.isFinite(end) && now >= start - 15 * 60_000 && now <= end + 45 * 60_000;

    const driverRecords = await openF1<JsonRecord[]>(`/drivers?session_key=${key}`, token).catch(() => []);

    const session = {
      key,
      name: asString(rawSession.session_name, "Sesión"),
      type: asString(rawSession.session_type, "Sesión"),
      circuit: asString(rawSession.circuit_short_name, "Circuito"),
      location: asString(rawSession.location),
      country: asString(rawSession.country_name),
      startsAt,
      endsAt,
      active
    };

    if (active && !configured) {
      const drivers = driverRecords
        .map((driver): LiveTimingDriver | null => {
          const driverNumber = asNumber(driver.driver_number);
          if (driverNumber === null) return null;
          return {
            driverNumber,
            acronym: asString(driver.name_acronym, String(driverNumber)),
            name: asString(driver.full_name, asString(driver.broadcast_name, `Piloto ${driverNumber}`)),
            team: asString(driver.team_name, "—"),
            teamColor: asString(driver.team_colour) || null,
            position: null,
            gap: null,
            interval: null,
            lastLap: null,
            bestLap: null,
            lapNumber: null,
            compound: null,
            tyreAge: null,
            pits: 0,
            speed: null,
            throttle: null,
            brake: null,
            gear: null,
            rpm: null,
            drs: null,
            x: null,
            y: null,
            z: null
          };
        })
        .filter((driver): driver is LiveTimingDriver => driver !== null)
        .sort((a, b) => a.driverNumber - b.driverNumber);

      return {
        mode: "waiting",
        configured,
        updatedAt: new Date().toISOString(),
        session,
        weather: null,
        track: { points: [] },
        drivers,
        messages: [],
        notice: active
          ? "La sesión está activa, pero los datos de timing requieren la credencial de OpenF1."
          : "Fuera de sesión. El panel detectará automáticamente el próximo fin de semana."
      };
    }

    const paths = [
      `/position?session_key=${key}`,
      `/intervals?session_key=${key}`,
      `/laps?session_key=${key}`,
      `/stints?session_key=${key}`,
      `/pit?session_key=${key}`,
      `/weather?session_key=${key}`,
      `/race_control?session_key=${key}`
    ];
    const responses = await Promise.allSettled(paths.map((path) => openF1<JsonRecord[]>(path, token)));
    let [positions, intervals, laps, stints, pits, weatherRecords, controlRecords] = responses.map((result) =>
      result.status === "fulfilled" ? result.value : []
    );
    if (!positions.length) positions = await openF1<JsonRecord[]>(paths[0], token).catch(() => []);
    if (!intervals.length) intervals = await openF1<JsonRecord[]>(paths[1], token).catch(() => []);
    if (!laps.length) laps = await openF1<JsonRecord[]>(paths[2], token).catch(() => []);
    if (!weatherRecords.length) weatherRecords = await openF1<JsonRecord[]>(paths[5], token).catch(() => []);

    const observedTime = Math.max(latestTimestamp(positions), latestTimestamp(intervals), latestTimestamp(laps));
    const fallbackTime = Number.isFinite(end) ? end - 5 * 60_000 : now;
    const referenceTime = active ? now : Number.isFinite(observedTime) ? observedTime : fallbackTime;
    const telemetryFrom = new Date(referenceTime - 15_000).toISOString();
    const telemetryTo = new Date(referenceTime + 1_000).toISOString();
    const traceDriver = driverRecords
      .map((driver) => asNumber(driver.driver_number))
      .find((driverNumber): driverNumber is number => driverNumber !== null);
    const traceLap = traceDriver === undefined
      ? undefined
      : laps
          .filter((lap) => asNumber(lap.driver_number) === traceDriver && asNumber(lap.lap_duration) !== null)
          .filter((lap) => Number.isFinite(Date.parse(asString(lap.date_start))))
          .sort((a, b) => Date.parse(asString(a.date_start)) - Date.parse(asString(b.date_start)))
          .at(-1);
    const fallbackTraceStart = !active && Number.isFinite(start)
      ? start + 10 * 60_000
      : referenceTime - 10 * 60_000;
    const traceStartMs = traceLap ? Date.parse(asString(traceLap.date_start)) : fallbackTraceStart;
    const traceDurationMs = traceLap ? (asNumber(traceLap.lap_duration) ?? 120) * 1_000 : 3 * 60_000;
    const traceFrom = new Date(traceStartMs).toISOString();
    const traceTo = new Date(traceStartMs + traceDurationMs + 3_000).toISOString();
    const telemetryPaths = [
      `/car_data?session_key=${key}&date%3E=${encodeURIComponent(telemetryFrom)}&date%3C=${encodeURIComponent(telemetryTo)}`,
      `/location?session_key=${key}&date%3E=${encodeURIComponent(telemetryFrom)}&date%3C=${encodeURIComponent(telemetryTo)}`,
      traceDriver === undefined
        ? ""
        : `/location?session_key=${key}&driver_number=${traceDriver}&date%3E=${encodeURIComponent(traceFrom)}&date%3C=${encodeURIComponent(traceTo)}`
    ];
    const telemetryResponses = await Promise.allSettled(telemetryPaths.map((path) => path ? openF1<JsonRecord[]>(path, token) : Promise.resolve([])));
    let [carRecords, locationRecords, trackRecords] = telemetryResponses.map((result) =>
      result.status === "fulfilled" ? result.value : []
    );
    if (!carRecords.length) carRecords = await openF1<JsonRecord[]>(telemetryPaths[0], token).catch(() => []);
    if (!locationRecords.length) locationRecords = await openF1<JsonRecord[]>(telemetryPaths[1], token).catch(() => []);
    if (!trackRecords.length && telemetryPaths[2]) trackRecords = await openF1<JsonRecord[]>(telemetryPaths[2], token).catch(() => []);

    const positionByDriver = latestByDriver(positions);
    const intervalByDriver = latestByDriver(intervals);
    const lapsByDriver = groupByDriver(laps);
    const stintByDriver = latestByDriver(stints);
    const pitsByDriver = groupByDriver(pits);
    const carByDriver = latestByDriver(carRecords);
    const locationByDriver = latestByDriver(locationRecords);
    const previousSnapshot = lastSuccessfulSnapshot?.session?.key === key
      ? lastSuccessfulSnapshot
      : null;
    const previousByDriver = new Map(previousSnapshot?.drivers.map((driver) => [driver.driverNumber, driver]) ?? []);

    const drivers = driverRecords
      .map((driver): LiveTimingDriver | null => {
        const driverNumber = asNumber(driver.driver_number);
        if (driverNumber === null) return null;
        const driverLaps = lapsByDriver.get(driverNumber) ?? [];
        const completedLaps = driverLaps.filter((lap) => asNumber(lap.lap_duration) !== null);
        const latestLapRecord = driverLaps.reduce<JsonRecord | null>((latest, lap) => {
          if (!latest) return lap;
          return (asNumber(lap.lap_number) ?? -1) >= (asNumber(latest.lap_number) ?? -1) ? lap : latest;
        }, null);
        const bestLap = completedLaps.reduce<number | null>((best, lap) => {
          const duration = asNumber(lap.lap_duration);
          if (duration === null) return best;
          return best === null || duration < best ? duration : best;
        }, null);
        const lapNumber = latestLapRecord ? asNumber(latestLapRecord.lap_number) : null;
        const stint = stintByDriver.get(driverNumber);
        const tyreStart = stint ? asNumber(stint.tyre_age_at_start) ?? 0 : null;
        const stintStartLap = stint ? asNumber(stint.lap_start) : null;
        const tyreAge = tyreStart !== null && stintStartLap !== null && lapNumber !== null
          ? Math.max(0, tyreStart + lapNumber - stintStartLap)
          : null;
        const position = positionByDriver.get(driverNumber);
        const interval = intervalByDriver.get(driverNumber);
        const car = carByDriver.get(driverNumber);
        const location = locationByDriver.get(driverNumber);
        const previous = previousByDriver.get(driverNumber);

        return {
          driverNumber,
          acronym: asString(driver.name_acronym, String(driverNumber)),
          name: asString(driver.full_name, asString(driver.broadcast_name, `Piloto ${driverNumber}`)),
          team: asString(driver.team_name, "—"),
          teamColor: asString(driver.team_colour) || null,
          position: position ? asNumber(position.position) : null,
          gap: interval?.gap_to_leader as string | number | null ?? null,
          interval: interval?.interval as string | number | null ?? null,
          lastLap: latestLapRecord ? asNumber(latestLapRecord.lap_duration) : null,
          bestLap,
          lapNumber,
          compound: stint ? asString(stint.compound) || null : null,
          tyreAge,
          pits: pitsByDriver.get(driverNumber)?.length ?? 0,
          speed: car ? asNumber(car.speed) : previous?.speed ?? null,
          throttle: car ? asNumber(car.throttle) : previous?.throttle ?? null,
          brake: car ? asNumber(car.brake) : previous?.brake ?? null,
          gear: car ? asNumber(car.n_gear) : previous?.gear ?? null,
          rpm: car ? asNumber(car.rpm) : previous?.rpm ?? null,
          drs: car ? asNumber(car.drs) : previous?.drs ?? null,
          x: location ? asNumber(location.x) : previous?.x ?? null,
          y: location ? asNumber(location.y) : previous?.y ?? null,
          z: location ? asNumber(location.z) : previous?.z ?? null
        };
      })
      .filter((driver): driver is LiveTimingDriver => driver !== null)
      .sort((a, b) => (a.position ?? 999) - (b.position ?? 999));

    const latestWeather = weatherRecords.at(-1);
    const weather = latestWeather
      ? {
          airTemperature: asNumber(latestWeather.air_temperature),
          trackTemperature: asNumber(latestWeather.track_temperature),
          humidity: asNumber(latestWeather.humidity),
          rainfall: asNumber(latestWeather.rainfall),
          windSpeed: asNumber(latestWeather.wind_speed)
        }
      : previousSnapshot?.weather ?? null;

    const messages = controlRecords.length ? controlRecords
      .slice(-8)
      .reverse()
      .map((record) => ({
        date: asString(record.date),
        category: asString(record.category, "CONTROL"),
        message: asString(record.message, "Actualización de dirección de carrera"),
        flag: asString(record.flag) || null
      })) : previousSnapshot?.messages ?? [];

    const hasTiming = positions.length > 0 || laps.length > 0 || intervals.length > 0 || carRecords.length > 0;
    if (!hasTiming && previousSnapshot) return previousSnapshot;
    const previousTrack = previousSnapshot?.track.points ?? [];
    const snapshot: LiveTimingSnapshot = {
      mode: active && hasTiming ? "live" : hasTiming ? "replay" : "waiting",
      configured,
      updatedAt: new Date().toISOString(),
      session,
      weather,
      track: { points: trackRecords.length ? sampleTrack(trackRecords) : previousTrack },
      drivers,
      messages,
      notice: active && hasTiming
        ? "Timing en directo. Los datos se actualizan automáticamente."
        : hasTiming
          ? "Última sesión disponible. El modo directo se activa cuando comienza la siguiente."
          : "Esperando la primera señal de timing de la sesión."
    };
    if (hasTiming) {
      lastSuccessfulSnapshot = snapshot;
      lastSuccessfulAt = requestedAt;
    }
    return snapshot;
  } catch {
    return lastSuccessfulSnapshot ?? emptySnapshot("No se pudo contactar a OpenF1. El panel volverá a intentarlo automáticamente.");
  }
}
