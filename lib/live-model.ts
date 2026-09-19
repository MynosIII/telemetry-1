import baseline from "./live-model-baseline.json";

const API_ROOT = "https://api.jolpi.ca/ergast/f1";
const PAGE_SIZE = 100;
// A faster online update lets the current season overtake the historical prior
// after a meaningful run of races without discarding the 1950–2025 baseline.
const ELO_K = 40;
const REFRESH_SECONDS = 60 * 60 * 24 * 8;
const SESSION_REFRESH_SECONDS = 15 * 60;
const ROOKIE_RATING = 1500;
export const LIVE_MODEL_CACHE_TAG = "f1-live-model-2026";
export const PROBABILITY_CACHE_TAG = "f1-probability-session-2026";

type RawObject = Record<string, any>;
type CircuitEffect = { season: number; effect: number; fitted: boolean };
type BaselineDriver = {
  name: string;
  rating: number;
  lastSeason: number;
  circuitEffects: Record<string, CircuitEffect>;
};

const modelBaseline = baseline as {
  meta: {
    model: string;
    throughSeason: number;
    historicalEvents: number;
    historicalObservations: number;
  };
  drivers: Record<string, BaselineDriver>;
};

export type LiveDriverUpdate = {
  driverId: string;
  name: string;
  team: string;
  baselineRating: number;
  liveRating: number;
  change: number;
  races: number;
  usedRookieFallback: boolean;
};

export type LivePrediction = {
  driverId: string;
  name: string;
  team: string;
  probability: number;
  score: number;
  liveElo: number;
  formAdjustment: number;
  teamAdjustment: number;
  circuitAdjustment: number;
  qualifyingAdjustment: number;
  qualifyingPosition: number | null;
  usedRookieFallback: boolean;
};

export type LiveModelSnapshot = {
  status: "ready" | "unavailable";
  season: number;
  updatedAt: string;
  refreshSeconds: number;
  historicalBase: {
    model: string;
    throughSeason: number;
    events: number;
    observations: number;
  };
  coverage: {
    sourceRows: number;
    uniqueRows: number;
    duplicateRows: number;
    completedRaces: number;
    scheduledRaces: number;
    rejectedRaces: number;
    missingBaselineDrivers: string[];
    latestRace: { round: number; name: string; date: string } | null;
  };
  nextRace: {
    round: number;
    name: string;
    date: string;
    circuitId: string;
    circuit: string;
    country: string;
    qualifyingDate: string | null;
  } | null;
  probabilityRefresh: {
    mode: "session" | "post-race";
    seconds: number;
    qualifyingIntegrated: boolean;
  };
  prediction: LivePrediction[];
  driverUpdates: LiveDriverUpdate[];
  methodology: {
    label: string;
    caveat: string;
    inputs: string[];
  };
  error?: string;
};

type RaceEntry = {
  driverId: string;
  name: string;
  team: string;
  position: number;
  grid: number | null;
  status: string;
};

type CompleteRace = {
  round: number;
  name: string;
  date: string;
  circuitId: string;
  circuit: string;
  country: string;
  results: RaceEntry[];
};

type ActiveDriver = { driverId: string; name: string; team: string };
type ScheduledRace = {
  round: number;
  name: string;
  date: string;
  time: string;
  circuitId: string;
  circuit: string;
  country: string;
  qualifyingDate: string | null;
  qualifyingTime: string | null;
  sprintQualifyingDate: string | null;
};

async function fetchJson(path: string) {
  const response = await fetch(`${API_ROOT}/${path}`, {
    next: { revalidate: REFRESH_SECONDS, tags: [LIVE_MODEL_CACHE_TAG] }
  });
  if (!response.ok) throw new Error(`Jolpica respondió ${response.status}`);
  return response.json() as Promise<RawObject>;
}

function fullName(driver: RawObject) {
  return [driver?.givenName, driver?.familyName].filter(Boolean).join(" ");
}

async function fetchAllResultPages() {
  const first = await fetchJson(`current/results.json?limit=${PAGE_SIZE}&offset=0`);
  const total = Number(first?.MRData?.total ?? 0);
  const offsets: number[] = [];
  for (let offset = PAGE_SIZE; offset < total; offset += PAGE_SIZE) offsets.push(offset);
  const rest = await Promise.all(
    offsets.map((offset) => fetchJson(`current/results.json?limit=${PAGE_SIZE}&offset=${offset}`))
  );
  return { pages: [first, ...rest], total };
}

function mergeAndValidateRaces(pages: RawObject[]) {
  const byRound = new Map<number, Omit<CompleteRace, "results"> & { entries: Map<string, RaceEntry> }>();
  let sourceRows = 0;
  let duplicates = 0;

  for (const page of pages) {
    const races = page?.MRData?.RaceTable?.Races ?? [];
    for (const rawRace of races) {
      const round = Number(rawRace.round);
      if (!byRound.has(round)) {
        byRound.set(round, {
          round,
          name: rawRace.raceName,
          date: rawRace.date,
          circuitId: rawRace.Circuit?.circuitId ?? "",
          circuit: rawRace.Circuit?.circuitName ?? "",
          country: rawRace.Circuit?.Location?.country ?? "",
          entries: new Map()
        });
      }
      const race = byRound.get(round)!;
      for (const result of rawRace.Results ?? []) {
        sourceRows += 1;
        const driverId = result.Driver?.driverId;
        if (!driverId) continue;
        if (race.entries.has(driverId)) duplicates += 1;
        race.entries.set(driverId, {
          driverId,
          name: fullName(result.Driver),
          team: result.Constructor?.name ?? "Sin equipo",
          position: Number(result.position),
          grid: Number.isFinite(Number(result.grid)) ? Number(result.grid) : null,
          status: result.status ?? ""
        });
      }
    }
  }

  const completed: CompleteRace[] = [];
  let rejected = 0;
  for (const race of [...byRound.values()].sort((a, b) => a.round - b.round)) {
    const results = [...race.entries.values()].sort((a, b) => a.position - b.position);
    const positions = new Set(results.map((entry) => entry.position));
    const isComplete = results.length >= 10 && positions.size === results.length && positions.has(1);
    if (!isComplete) {
      rejected += 1;
      continue;
    }
    completed.push({
      round: race.round,
      name: race.name,
      date: race.date,
      circuitId: race.circuitId,
      circuit: race.circuit,
      country: race.country,
      results
    });
  }

  return {
    completed,
    sourceRows,
    uniqueRows: [...byRound.values()].reduce((sum, race) => sum + race.entries.size, 0),
    duplicates,
    rejected
  };
}

function parseActiveDrivers(raw: RawObject): ActiveDriver[] {
  const lists = raw?.MRData?.StandingsTable?.StandingsLists ?? [];
  const standings = lists[0]?.DriverStandings ?? [];
  return standings.map((entry: RawObject) => ({
    driverId: entry.Driver.driverId,
    name: fullName(entry.Driver),
    team: entry.Constructors?.[0]?.name ?? "Sin equipo"
  }));
}

function parseSchedule(raw: RawObject) {
  return (raw?.MRData?.RaceTable?.Races ?? []).map((race: RawObject): ScheduledRace => ({
    round: Number(race.round),
    name: race.raceName,
    date: race.date,
    time: race.time ?? "12:00:00Z",
    circuitId: race.Circuit?.circuitId ?? "",
    circuit: race.Circuit?.circuitName ?? "",
    country: race.Circuit?.Location?.country ?? "",
    qualifyingDate: race.Qualifying?.date ?? null,
    qualifyingTime: race.Qualifying?.time ?? null,
    sprintQualifyingDate: race.SprintQualifying?.date ?? null
  }));
}

function isProbabilitySessionWindow(race: ScheduledRace | null) {
  if (!race) return false;
  const firstSessionDate = race.sprintQualifyingDate ?? race.qualifyingDate ?? race.date;
  const startsAt = Date.parse(`${firstSessionDate}T00:00:00Z`);
  const raceStartsAt = Date.parse(`${race.date}T${race.time}`);
  const endsAt = raceStartsAt + 6 * 60 * 60 * 1000;
  const now = Date.now();
  return now >= startsAt && now <= endsAt;
}

async function fetchQualifyingPositions(round: number, active: boolean) {
  if (!active) return new Map<string, number>();
  const response = await fetch(`${API_ROOT}/current/${round}/qualifying.json`, {
    next: { revalidate: SESSION_REFRESH_SECONDS, tags: [PROBABILITY_CACHE_TAG] }
  });
  if (!response.ok) return new Map<string, number>();
  const data = await response.json() as RawObject;
  const race = data?.MRData?.RaceTable?.Races?.[0];
  const entries = race?.QualifyingResults ?? [];
  const positions = new Map<string, number>();
  for (const entry of entries) {
    const driverId = entry.Driver?.driverId;
    const position = Number(entry.position);
    if (driverId && Number.isFinite(position)) positions.set(driverId, position);
  }
  return positions.size >= 10 ? positions : new Map<string, number>();
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0.5;
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function emptySnapshot(message: string): LiveModelSnapshot {
  return {
    status: "unavailable",
    season: 2026,
    updatedAt: new Date().toISOString(),
    refreshSeconds: REFRESH_SECONDS,
    historicalBase: {
      model: modelBaseline.meta.model,
      throughSeason: modelBaseline.meta.throughSeason,
      events: modelBaseline.meta.historicalEvents,
      observations: modelBaseline.meta.historicalObservations
    },
    coverage: {
      sourceRows: 0,
      uniqueRows: 0,
      duplicateRows: 0,
      completedRaces: 0,
      scheduledRaces: 0,
      rejectedRaces: 0,
      missingBaselineDrivers: [],
      latestRace: null
    },
    nextRace: null,
    probabilityRefresh: {
      mode: "post-race",
      seconds: REFRESH_SECONDS,
      qualifyingIntegrated: false
    },
    prediction: [],
    driverUpdates: [],
    methodology: {
      label: "Modelo experimental no disponible",
      caveat: "No se reemplazan datos faltantes por valores inventados.",
      inputs: []
    },
    error: message
  };
}

export async function getLiveModelSnapshot(): Promise<LiveModelSnapshot> {
  try {
    const [{ pages }, scheduleRaw, standingsRaw] = await Promise.all([
      fetchAllResultPages(),
      fetchJson("current.json?limit=100"),
      fetchJson("current/driverStandings.json?limit=100")
    ]);
    const audit = mergeAndValidateRaces(pages);
    const schedule = parseSchedule(scheduleRaw);
    const activeDrivers = parseActiveDrivers(standingsRaw);
    const ratings = new Map<string, number>();
    const initialRatings = new Map<string, number>();
    const names = new Map<string, string>();
    const teams = new Map<string, string>();
    const raceCounts = new Map<string, number>();
    const recentDriverForm = new Map<string, number[]>();
    const recentTeamForm = new Map<string, number[]>();
    const missingBaseline = new Set<string>();

    const ensureDriver = (driver: ActiveDriver | RaceEntry) => {
      names.set(driver.driverId, driver.name);
      teams.set(driver.driverId, driver.team);
      if (!ratings.has(driver.driverId)) {
        const base = modelBaseline.drivers[driver.driverId]?.rating ?? ROOKIE_RATING;
        ratings.set(driver.driverId, base);
        initialRatings.set(driver.driverId, base);
        if (!modelBaseline.drivers[driver.driverId]) missingBaseline.add(driver.name);
      }
    };

    activeDrivers.forEach(ensureDriver);
    for (const race of audit.completed) {
      race.results.forEach(ensureDriver);
      const before = new Map(race.results.map((driver) => [driver.driverId, ratings.get(driver.driverId)!]));
      const deltas = new Map<string, number>();

      for (const driver of race.results) {
        const comparisons = race.results.filter((other) => other.driverId !== driver.driverId);
        const scoreError = comparisons.reduce((sum, other) => {
          const actual = driver.position < other.position ? 1 : 0;
          const expected = 1 / (1 + 10 ** ((before.get(other.driverId)! - before.get(driver.driverId)!) / 400));
          return sum + actual - expected;
        }, 0);
        deltas.set(driver.driverId, ELO_K * (scoreError / comparisons.length));
      }

      for (const driver of race.results) {
        ratings.set(driver.driverId, before.get(driver.driverId)! + deltas.get(driver.driverId)!);
        raceCounts.set(driver.driverId, (raceCounts.get(driver.driverId) ?? 0) + 1);
        const normalized = (race.results.length - driver.position) / Math.max(1, race.results.length - 1);
        const driverForm = [...(recentDriverForm.get(driver.driverId) ?? []), normalized].slice(-5);
        const teamForm = [...(recentTeamForm.get(driver.team) ?? []), normalized].slice(-10);
        recentDriverForm.set(driver.driverId, driverForm);
        recentTeamForm.set(driver.team, teamForm);
        teams.set(driver.driverId, driver.team);
      }
    }

    const nextRace = schedule.find((race: { round: number }) => !audit.completed.some((done) => done.round === race.round)) ?? null;
    const sessionWindow = isProbabilitySessionWindow(nextRace);
    const qualifyingPositions = nextRace
      ? await fetchQualifyingPositions(nextRace.round, sessionWindow)
      : new Map<string, number>();
    const qualifyingFieldSize = qualifyingPositions.size;
    const predictionScores = activeDrivers.map((driver) => {
      ensureDriver(driver);
      const liveElo = ratings.get(driver.driverId)!;
      const driverForm = average(recentDriverForm.get(driver.driverId) ?? []);
      const teamForm = average(recentTeamForm.get(driver.team) ?? []);
      const effect = nextRace
        ? modelBaseline.drivers[driver.driverId]?.circuitEffects?.[nextRace.circuitId]?.effect ?? 0
        : 0;
      const formAdjustment = (driverForm - 0.5) * 120;
      const teamAdjustment = (teamForm - 0.5) * 480;
      const circuitAdjustment = effect * 400;
      const qualifyingPosition = qualifyingPositions.get(driver.driverId) ?? null;
      const qualifyingAdjustment = qualifyingPosition === null
        ? 0
        : ((qualifyingFieldSize + 1) / 2 - qualifyingPosition) * 7;
      return {
        driverId: driver.driverId,
        name: driver.name,
        team: driver.team,
        score: liveElo + formAdjustment + teamAdjustment + circuitAdjustment + qualifyingAdjustment,
        liveElo,
        formAdjustment,
        teamAdjustment,
        circuitAdjustment,
        qualifyingAdjustment,
        qualifyingPosition,
        usedRookieFallback: !modelBaseline.drivers[driver.driverId]
      };
    });

    const softmaxScale = 90;
    const maxScore = Math.max(...predictionScores.map((driver) => driver.score));
    const weights = predictionScores.map((driver) => Math.exp((driver.score - maxScore) / softmaxScale));
    const weightTotal = weights.reduce((sum, value) => sum + value, 0);
    const prediction = predictionScores
      .map((driver, index) => ({
        ...driver,
        probability: round((weights[index] / weightTotal) * 100, 1),
        score: round(driver.score),
        liveElo: round(driver.liveElo),
        formAdjustment: round(driver.formAdjustment),
        teamAdjustment: round(driver.teamAdjustment),
        circuitAdjustment: round(driver.circuitAdjustment),
        qualifyingAdjustment: round(driver.qualifyingAdjustment)
      }))
      .sort((a, b) => b.probability - a.probability);

    const driverUpdates = [...ratings.entries()]
      .map(([driverId, liveRating]) => ({
        driverId,
        name: names.get(driverId) ?? driverId,
        team: teams.get(driverId) ?? "Sin equipo",
        baselineRating: round(initialRatings.get(driverId) ?? ROOKIE_RATING),
        liveRating: round(liveRating),
        change: round(liveRating - (initialRatings.get(driverId) ?? ROOKIE_RATING)),
        races: raceCounts.get(driverId) ?? 0,
        usedRookieFallback: !modelBaseline.drivers[driverId]
      }))
      .sort((a, b) => b.liveRating - a.liveRating);

    const latestRace = audit.completed.at(-1) ?? null;
    return {
      status: "ready",
      season: 2026,
      updatedAt: latestRace
        ? new Date(`${latestRace.date}T23:00:00Z`).toISOString()
        : new Date().toISOString(),
      refreshSeconds: REFRESH_SECONDS,
      historicalBase: {
        model: modelBaseline.meta.model,
        throughSeason: modelBaseline.meta.throughSeason,
        events: modelBaseline.meta.historicalEvents,
        observations: modelBaseline.meta.historicalObservations
      },
      coverage: {
        sourceRows: audit.sourceRows,
        uniqueRows: audit.uniqueRows,
        duplicateRows: audit.duplicates,
        completedRaces: audit.completed.length,
        scheduledRaces: schedule.length,
        rejectedRaces: audit.rejected,
        missingBaselineDrivers: [...missingBaseline],
        latestRace: latestRace ? { round: latestRace.round, name: latestRace.name, date: latestRace.date } : null
      },
      nextRace,
      probabilityRefresh: {
        mode: sessionWindow ? "session" : "post-race",
        seconds: sessionWindow ? SESSION_REFRESH_SECONDS : REFRESH_SECONDS,
        qualifyingIntegrated: qualifyingPositions.size >= 10
      },
      prediction,
      driverUpdates,
      methodology: {
        label: "Predicción experimental · no son cuotas",
        caveat: qualifyingPositions.size >= 10
          ? "Integra la clasificación publicada; no incluye clima, sanciones posteriores ni ritmo de carrera en vivo."
          : "Todavía no incluye clasificación, parrilla, clima, sanciones ni ritmo de prácticas del próximo fin de semana.",
        inputs: [
          "ELO histórico v7.6 cerrado en 2025",
          "Resultados 2026 completos y validados de Jolpica",
          "Forma reciente del piloto y del constructor",
          "Afinidad histórica con la topología del próximo circuito",
          ...(qualifyingPositions.size >= 10 ? ["Posición de clasificación publicada por Jolpica"] : [])
        ]
      }
    };
  } catch (error) {
    return emptySnapshot(error instanceof Error ? error.message : "No se pudo leer la fuente en vivo");
  }
}
