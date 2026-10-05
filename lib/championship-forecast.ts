import type { F1HomeData, Standing } from "./types";

const POLYMARKET_EVENT_URL = "https://polymarket.com/event/2026-f1-drivers-champion";
const POLYMARKET_API_URL = "https://gamma-api.polymarket.com/events/slug/2026-f1-drivers-champion";
const SIMULATIONS = 10_000;
const RACE_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
const SPRINT_POINTS = [8, 7, 6, 5, 4, 3, 2, 1];

type RawMarket = {
  question?: string;
  slug?: string;
  outcomePrices?: string | number[];
  active?: boolean;
  closed?: boolean;
};

type RawEvent = {
  title?: string;
  volume?: number | string;
  updatedAt?: string;
  markets?: RawMarket[];
};

export type ForecastDriver = {
  driverId?: string;
  name: string;
  team?: string;
  probability: number;
  currentPoints?: number;
  projectedPoints?: number;
  image?: string;
  href?: string;
};

export type MarketForecast = {
  available: boolean;
  entries: ForecastDriver[];
  eventUrl: string;
  volume?: number;
  updatedAt?: string;
};

export type ModelForecast = {
  entries: ForecastDriver[];
  nextRaces: {
    round: string;
    name: string;
    favorite: string;
    probability: number;
  }[];
  simulations: number;
  remainingRaces: number;
};

function surname(value: string) {
  return value.trim().toLocaleLowerCase("es").split(/\s+/).at(-1) ?? "";
}

function findStanding(name: string, standings: Standing[]) {
  const familyName = surname(name);
  return standings.find((standing) => surname(standing.name) === familyName);
}

function yesPrice(value: RawMarket["outcomePrices"]) {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    const price = Number(parsed?.[0]);
    return Number.isFinite(price) ? Math.min(1, Math.max(0, price)) : undefined;
  } catch {
    return undefined;
  }
}

export async function getPolymarketChampionForecast(
  standings: Standing[] = []
): Promise<MarketForecast> {
  try {
    const response = await fetch(POLYMARKET_API_URL, { next: { revalidate: 300 } });
    if (!response.ok) throw new Error(`Polymarket request failed: ${response.status}`);
    const event = await response.json() as RawEvent;
    const entries = (event.markets ?? [])
      .filter((market) => market.active !== false && market.closed !== true)
      .flatMap<ForecastDriver>((market) => {
        const match = market.question?.match(/^Will (.+) be the \d{4} F1 Drivers' Champion\?$/i);
        const probability = yesPrice(market.outcomePrices);
        if (!match || probability === undefined) return [];
        const name = match[1];
        const standing = findStanding(name, standings);
        return [{
          driverId: standing?.driverId,
          name,
          team: standing?.team,
          image: standing?.image,
          probability: probability * 100,
          href: standing ? `/pilotos/${standing.driverId}` : undefined
        }];
      })
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 6);

    return {
      available: entries.length > 0,
      entries,
      eventUrl: POLYMARKET_EVENT_URL,
      volume: Number.isFinite(Number(event.volume)) ? Number(event.volume) : undefined,
      updatedAt: event.updatedAt
    };
  } catch {
    return { available: false, entries: [], eventUrl: POLYMARKET_EVENT_URL };
  }
}

export function enrichMarketForecast(forecast: MarketForecast, standings: Standing[]): MarketForecast {
  return {
    ...forecast,
    entries: forecast.entries.map((entry) => {
      const standing = findStanding(entry.name, standings);
      if (!standing) return entry;
      return {
        ...entry,
        driverId: standing.driverId,
        team: standing.team,
        image: standing.image,
        href: `/pilotos/${standing.driverId}`
      };
    })
  };
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

export function simulateChampionship(data: F1HomeData): ModelForecast {
  const remaining = data.schedule.filter((race) => race.state !== "finished");
  const completedRaces = Math.max(1, data.schedule.length - remaining.length);
  const recentRaceCount = Math.max(1, data.races.length);
  const drivers = data.standings.map((standing) => {
    const points = Number(standing.points) || 0;
    const wins = Number(standing.wins) || 0;
    const recentPoints = data.races.reduce((total, race) => {
      const result = race.results.find((driver) => driver.driverId === standing.driverId);
      return total + (Number(result?.points) || 0);
    }, 0) / recentRaceCount;
    const pointsPerRace = points / completedRaces;
    const winValue = wins / completedRaces * 25;
    const strength = Math.max(.25, pointsPerRace * .72 + winValue * .18 + recentPoints * .1);
    return { standing, points, wins, strength };
  });

  const championCounts = new Map<string, number>();
  const projectedPointTotals = new Map<string, number>();
  const raceWinnerCounts = remaining.map(() => new Map<string, number>());
  const seed = data.standings.map((standing) => `${standing.driverId}:${standing.points}`).join("|")
    + remaining.map((race) => race.round).join("|");
  const random = mulberry32(seedFrom(seed));

  for (let simulation = 0; simulation < SIMULATIONS; simulation += 1) {
    const totals = new Map(drivers.map((driver) => [driver.standing.driverId, driver.points]));
    const wins = new Map(drivers.map((driver) => [driver.standing.driverId, driver.wins]));

    remaining.forEach((race, raceIndex) => {
      const order = drivers
        .map((driver) => ({
          id: driver.standing.driverId,
          performance: Math.log(driver.strength) + gumbel(random) * .82
        }))
        .sort((a, b) => b.performance - a.performance);

      const winnerId = order[0].id;
      raceWinnerCounts[raceIndex].set(winnerId, (raceWinnerCounts[raceIndex].get(winnerId) ?? 0) + 1);
      wins.set(winnerId, (wins.get(winnerId) ?? 0) + 1);
      order.slice(0, RACE_POINTS.length).forEach((driver, index) => {
        totals.set(driver.id, (totals.get(driver.id) ?? 0) + RACE_POINTS[index]);
      });

      if (race.sessions.some((session) => session.key === "sprint")) {
        const sprintOrder = drivers
          .map((driver) => ({
            id: driver.standing.driverId,
            performance: Math.log(driver.strength) + gumbel(random) * .9
          }))
          .sort((a, b) => b.performance - a.performance);
        sprintOrder.slice(0, SPRINT_POINTS.length).forEach((driver, index) => {
          totals.set(driver.id, (totals.get(driver.id) ?? 0) + SPRINT_POINTS[index]);
        });
      }
    });

    const champion = drivers
      .map((driver) => ({
        id: driver.standing.driverId,
        points: totals.get(driver.standing.driverId) ?? 0,
        wins: wins.get(driver.standing.driverId) ?? 0
      }))
      .sort((a, b) => b.points - a.points || b.wins - a.wins)[0];
    championCounts.set(champion.id, (championCounts.get(champion.id) ?? 0) + 1);
    totals.forEach((points, driverId) => {
      projectedPointTotals.set(driverId, (projectedPointTotals.get(driverId) ?? 0) + points);
    });
  }

  const entries = drivers
    .map(({ standing, points }) => ({
      driverId: standing.driverId,
      name: standing.name,
      team: standing.team,
      image: standing.image,
      probability: (championCounts.get(standing.driverId) ?? 0) / SIMULATIONS * 100,
      currentPoints: points,
      projectedPoints: Math.round((projectedPointTotals.get(standing.driverId) ?? 0) / SIMULATIONS),
      href: `/pilotos/${standing.driverId}`
    }))
    .sort((a, b) => b.probability - a.probability || (b.projectedPoints ?? 0) - (a.projectedPoints ?? 0))
    .slice(0, 6);

  const nextRaces = remaining.slice(0, 4).map((race, index) => {
    const [favoriteId, wins] = [...raceWinnerCounts[index].entries()]
      .sort((a, b) => b[1] - a[1])[0] ?? ["", 0];
    const favorite = data.standings.find((standing) => standing.driverId === favoriteId)?.name ?? "Sin favorito";
    return {
      round: race.round,
      name: race.name,
      favorite,
      probability: wins / SIMULATIONS * 100
    };
  });

  return { entries, nextRaces, simulations: SIMULATIONS, remainingRaces: remaining.length };
}
