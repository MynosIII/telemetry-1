import "server-only";

import type { ScheduledRace, Standing } from "./types";

const JOLPICA_RESULTS = "https://api.jolpi.ca/ergast/f1/current/results.json?limit=2000";
const POLYMARKET_API = "https://gamma-api.polymarket.com/events/slug";
const SIMULATIONS = 20_000;

type JsonRecord = Record<string, any>;

export type SessionWeather = {
  key: string;
  label: string;
  startsAt: string;
  temperature: number;
  feelsLike: number;
  rainProbability: number;
  windSpeed: number;
  weatherCode: number;
  condition: string;
};

export type RacePredictionEntry = {
  driverId: string;
  name: string;
  team: string;
  image?: string;
  probability: number;
  form: string[];
};

export type RaceMarketForecast = {
  available: boolean;
  entries: RacePredictionEntry[];
  eventUrl?: string;
  volume?: number;
};

export type RaceWeekendData = {
  weather: {
    available: boolean;
    sessions: SessionWeather[];
    sourceUrl: string;
  };
  market: RaceMarketForecast;
  model: {
    simulations: number;
    entries: RacePredictionEntry[];
    recentRaces: number;
  };
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function weatherCondition(code: number) {
  if (code === 0) return "Despejado";
  if (code <= 3) return "Parcialmente nublado";
  if (code <= 48) return "Niebla";
  if (code <= 57) return "Llovizna";
  if (code <= 67) return "Lluvia";
  if (code <= 77) return "Precipitación";
  if (code <= 82) return "Chaparrones";
  if (code <= 86) return "Chaparrones";
  return "Tormentas";
}

async function getWeather(race: ScheduledRace): Promise<RaceWeekendData["weather"]> {
  const sourceUrl = "https://open-meteo.com/";
  if (!Number.isFinite(race.latitude) || !Number.isFinite(race.longitude) || !race.sessions.length) {
    return { available: false, sessions: [], sourceUrl };
  }

  const dates = race.sessions.map((session) => session.date).sort();
  const query = new URLSearchParams({
    latitude: String(race.latitude),
    longitude: String(race.longitude),
    hourly: "temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m",
    timezone: "UTC",
    start_date: dates[0],
    end_date: dates.at(-1) ?? dates[0]
  });

  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`, {
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(9000)
    });
    if (!response.ok) throw new Error(`Weather ${response.status}`);
    const payload = await response.json() as JsonRecord;
    const times: string[] = payload.hourly?.time ?? [];
    if (!times.length) return { available: false, sessions: [], sourceUrl };

    const sessions = race.sessions.map((session): SessionWeather | undefined => {
      const startsAt = `${session.date}T${session.time}`;
      const target = Date.parse(startsAt);
      let nearestIndex = -1;
      let nearestDistance = Number.POSITIVE_INFINITY;
      times.forEach((time, index) => {
        const distance = Math.abs(Date.parse(`${time}:00Z`) - target);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });
      if (nearestIndex < 0 || nearestDistance > 90 * 60_000) return undefined;
      const code = Number(payload.hourly.weather_code?.[nearestIndex]);
      return {
        key: session.key,
        label: session.label,
        startsAt,
        temperature: Number(payload.hourly.temperature_2m?.[nearestIndex]),
        feelsLike: Number(payload.hourly.apparent_temperature?.[nearestIndex]),
        rainProbability: Number(payload.hourly.precipitation_probability?.[nearestIndex]),
        windSpeed: Number(payload.hourly.wind_speed_10m?.[nearestIndex]),
        weatherCode: code,
        condition: weatherCondition(code)
      };
    }).filter((session): session is SessionWeather => Boolean(session));

    return { available: sessions.length > 0, sessions, sourceUrl };
  } catch {
    return { available: false, sessions: [], sourceUrl };
  }
}

function yesPrice(value: unknown) {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    const price = Number(Array.isArray(parsed) ? parsed[0] : undefined);
    return Number.isFinite(price) ? Math.min(1, Math.max(0, price)) : undefined;
  } catch {
    return undefined;
  }
}

function familyName(value: string) {
  return value.trim().toLowerCase().split(/\s+/).at(-1) ?? "";
}

function marketDriver(question: string) {
  return question.match(/^Will (.+?) (?:win|be the winner of)/i)?.[1]
    ?? question.match(/^Will (.+?) achieve .*?winner/i)?.[1];
}

function raceMarketEntries(event: JsonRecord, standings: Standing[]) {
  if (event.active === false || event.closed === true) return [];
  return (event.markets ?? []).flatMap((market: JsonRecord) => {
    if (market.active === false || market.closed === true) return [];
    const name = marketDriver(String(market.question ?? ""));
    const price = yesPrice(market.outcomePrices);
    if (!name || price === undefined) return [];
    const standing = standings.find((entry) => familyName(entry.name) === familyName(name));
    return [{
      driverId: standing?.driverId ?? slugify(name),
      name,
      team: standing?.team ?? "Fórmula 1",
      image: standing?.image,
      probability: price * 100,
      form: []
    } satisfies RacePredictionEntry];
  }).sort((a: RacePredictionEntry, b: RacePredictionEntry) => b.probability - a.probability).slice(0, 6);
}

function isWinnerEvent(event: JsonRecord, race: ScheduledRace) {
  const haystack = slugify(`${event.title ?? ""} ${event.slug ?? ""}`);
  const raceWords = slugify(race.name)
    .split("-")
    .filter((word) => word.length > 3 && !["grand", "prix"].includes(word));
  const matchesRace = raceWords.some((word) => haystack.includes(word))
    || haystack.includes(slugify(race.country));
  return matchesRace && /winner|ganador/.test(haystack);
}

function marketForecast(event: JsonRecord, entries: RacePredictionEntry[], fallbackSlug?: string): RaceMarketForecast {
  const slug = String(event.slug ?? fallbackSlug ?? "");
  return {
    available: true,
    entries,
    eventUrl: slug ? `https://polymarket.com/event/${slug}` : "https://polymarket.com/sports/f1",
    volume: Number.isFinite(Number(event.volume)) ? Number(event.volume) : undefined
  };
}

async function getRaceMarket(race: ScheduledRace, standings: Standing[]): Promise<RaceMarketForecast> {
  const countrySlug = slugify(race.country);
  const adjectivalCountry = countrySlug === "malaysia" ? "malaysian" : countrySlug;
  const baseRaceName = race.name.split(/\s+in\s+/i)[0];
  const searches = [...new Set([race.name, baseRaceName, `${race.country} Grand Prix`])];

  for (const query of searches) {
    try {
      const params = new URLSearchParams({ q: query, limit_per_type: "30" });
      const response = await fetch(`https://gamma-api.polymarket.com/public-search?${params}`, {
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(7000)
      });
      if (!response.ok) continue;
      const payload = await response.json() as JsonRecord;
      const events = (payload.events ?? []).filter((event: JsonRecord) => isWinnerEvent(event, race));
      for (const event of events) {
        const entries = raceMarketEntries(event, standings);
        if (entries.length) return marketForecast(event, entries);
      }
    } catch {
      // Continue with direct slug checks when search is temporarily unavailable.
    }
  }

  const slugs = [
    `f1-${slugify(race.name)}-winner-${race.date}`,
    `f1-${slugify(baseRaceName)}-winner-${race.date}`,
    `f1-${adjectivalCountry}-grand-prix-winner-${race.date}`,
    `f1-${countrySlug}-grand-prix-winner-${race.date}`
  ];

  for (const slug of [...new Set(slugs)]) {
    try {
      const response = await fetch(`${POLYMARKET_API}/${slug}`, {
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(7000)
      });
      if (!response.ok) continue;
      const event = await response.json() as JsonRecord;
      const entries = raceMarketEntries(event, standings);
      if (entries.length) return marketForecast(event, entries, slug);
    } catch {
      // A race market is optional and may not have been published yet.
    }
  }
  return { available: false, entries: [] };
}

function seedFrom(value: string) {
  let seed = 2166136261;
  for (const char of value) {
    seed ^= char.charCodeAt(0);
    seed = Math.imul(seed, 16777619);
  }
  return seed >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = seed + 0x6d2b79f5 | 0;
    let result = Math.imul(seed ^ seed >>> 15, 1 | seed);
    result = result + Math.imul(result ^ result >>> 7, 61 | result) ^ result;
    return ((result ^ result >>> 14) >>> 0) / 4294967296;
  };
}

function gumbel(random: () => number) {
  const sample = Math.min(.999999, Math.max(.000001, random()));
  return -Math.log(-Math.log(sample));
}

async function getRecentRaces(): Promise<JsonRecord[]> {
  try {
    const response = await fetch(JOLPICA_RESULTS, {
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(9000)
    });
    if (!response.ok) throw new Error(`Results ${response.status}`);
    const payload = await response.json() as JsonRecord;
    return (payload.MRData?.RaceTable?.Races ?? []).slice(-5).reverse();
  } catch {
    return [];
  }
}

function resultIsClassified(result: JsonRecord) {
  const status = String(result.status ?? "");
  return status === "Finished" || /^\+\d+ Lap/.test(status);
}

function simulateRace(race: ScheduledRace, standings: Standing[], races: JsonRecord[]) {
  const recentWeights = [1, .82, .68, .55, .45];
  const maxPoints = Math.max(1, ...standings.map((standing) => Number(standing.points) || 0));
  const maxWins = Math.max(1, ...standings.map((standing) => Number(standing.wins) || 0));
  const drivers = standings.map((standing) => {
    const form: string[] = [];
    let weightedForm = 0;
    let usedWeight = 0;
    let classified = 0;
    races.forEach((rawRace, index) => {
      const result = (rawRace.Results ?? []).find((entry: JsonRecord) => entry.Driver?.driverId === standing.driverId);
      if (!result) {
        form.push("—");
        return;
      }
      const position = Number(result.position);
      const positionScore = Number.isFinite(position) ? Math.max(0, 1 - (position - 1) / 21) : 0;
      const pointsScore = Math.min(1, (Number(result.points) || 0) / 25);
      const reliability = resultIsClassified(result);
      if (reliability) classified += 1;
      const weight = recentWeights[index] ?? .4;
      weightedForm += (positionScore * .65 + pointsScore * .35) * weight;
      usedWeight += weight;
      form.push(reliability ? `P${position}` : "DNF");
    });
    const recent = usedWeight ? weightedForm / usedWeight : 0;
    const season = (Number(standing.points) || 0) / maxPoints;
    const wins = (Number(standing.wins) || 0) / maxWins;
    const reliability = races.length ? classified / races.length : .5;
    const strength = Math.max(.04, recent * .55 + season * .27 + wins * .10 + reliability * .08);
    return { standing, strength, form };
  });

  const counts = new Map<string, number>();
  const seed = `${race.season}:${race.round}:` + drivers.map(({ standing, form }) => `${standing.driverId}:${standing.points}:${form.join(",")}`).join("|");
  const random = mulberry32(seedFrom(seed));
  for (let simulation = 0; simulation < SIMULATIONS; simulation += 1) {
    const winner = drivers.map((driver) => ({
      id: driver.standing.driverId,
      performance: Math.log(driver.strength) + gumbel(random) * .62
    })).sort((a, b) => b.performance - a.performance)[0];
    counts.set(winner.id, (counts.get(winner.id) ?? 0) + 1);
  }

  return drivers.map(({ standing, form }) => ({
    driverId: standing.driverId,
    name: standing.name,
    team: standing.team,
    image: standing.image,
    probability: (counts.get(standing.driverId) ?? 0) / SIMULATIONS * 100,
    form
  })).sort((a, b) => b.probability - a.probability).slice(0, 6);
}

/** The same next-race model the circuit page shows, without the weather and market requests. */
export async function getNextRaceModel(race: ScheduledRace, standings: Standing[]) {
  return simulateRace(race, standings, await getRecentRaces());
}

export async function getRaceWeekendData(race: ScheduledRace, standings: Standing[]): Promise<RaceWeekendData> {
  const [weather, market, recentRaces] = await Promise.all([
    getWeather(race),
    getRaceMarket(race, standings),
    getRecentRaces()
  ]);
  return {
    weather,
    market,
    model: {
      simulations: SIMULATIONS,
      entries: simulateRace(race, standings, recentRaces),
      recentRaces: recentRaces.length
    }
  };
}
