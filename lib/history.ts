import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import type { TelemetryProfile } from "./types";

import { historyCategories } from "./history-labels";
export { historyCategories } from "./history-labels";
export type HistoryCategory = keyof typeof historyCategories;
export type HistoryStats = {
  entries: number; races: number; starts: number; wins: number; podiums: number;
  poles: number; fastestLaps: number; retirements: number; laps: number; drivers: number; seasons: number;
};
export type HistorySummary = {
  id: string; sourceId: string; category: HistoryCategory; name: string; fullName: string;
  country?: string; firstSeason: number; lastSeason: number; stats: HistoryStats;
  titleSeasons: number[]; href: string;
};
export type HistorySeason = HistoryStats & { season: number; position?: string | number; points?: number; champion: boolean };
export type HistoryEntity = HistorySummary & {
  biography: { fullName?: string; dateOfBirth?: string; dateOfDeath?: string; placeOfBirth?: string; length?: number; turns?: number; type?: string; direction?: string; layouts?: { id: string; length: number; turns: number }[] };
  narrative: string[];
  editorialSources: string[];
  editorialReviewedAt?: string;
  raceResults?: { season: number; round: number; date: string; event: string; circuitId: string; constructorId: string; engineId?: string; tyreId?: string; position: number | null; status: string; grid: number | null; laps: number | null; retired?: string; points: number; shared: boolean; fastest: boolean }[];
  milestones: { label: string; season: number; event: string; date?: string }[];
  seasons: HistorySeason[];
  seasonStandings: { season: number; position: string | number; points: number }[];
  officialPoints: number | null;
  model: (TelemetryProfile & { teammates?: { id: string; name: string; races: number; finishWins: number; qualifyingWins: number; averageRatingEdge: number }[] }) | null;
  ratingHistory: { season: number; round: number; event: string; rating: number; expectedCarWin: number | null }[];
  sources: { statsf1: string; wikipedia: string; wikipediaTitle: string };
  relations: { category: HistoryCategory; items: { id: string; name: string; href: string; races: number; wins: number; firstSeason: number; lastSeason: number }[] }[];
  engineSpecs?: Record<string, string | number | null>[];
};
export type HistoryIndex = {
  meta: { firstSeason: number; lastSeason: number; lastRaceDate: string; events: number; generatedAt: string; f1dbRevision: string | null; model: string; modelEvents: number; categories: Record<HistoryCategory, { label: string; count: number }> };
  entities: HistorySummary[];
};

export const getHistoryIndex = cache(async (): Promise<HistoryIndex> =>
  JSON.parse(await readFile(path.join(process.cwd(), "public/history/index.json"), "utf8"))
);

export const getHistoryEntity = cache(async (category: string, id: string): Promise<HistoryEntity | undefined> => {
  // Both segments come from routes; validate before accessing the filesystem.
  if (!Object.hasOwn(historyCategories, category) || !/^[a-z0-9_-]+$/.test(id)) return undefined;
  const folders = {
    drivers: path.join(process.cwd(), "public/history/drivers"),
    constructors: path.join(process.cwd(), "public/history/constructors"),
    engines: path.join(process.cwd(), "public/history/engines"),
    circuits: path.join(process.cwd(), "public/history/circuits"),
    nations: path.join(process.cwd(), "public/history/nations"),
    tyres: path.join(process.cwd(), "public/history/tyres"),
    "grands-prix": path.join(process.cwd(), "public/history/grands-prix"),
    seasons: path.join(process.cwd(), "public/history/seasons")
  };
  try {
    return JSON.parse(await readFile(path.join(folders[category as HistoryCategory], `${id}.json`), "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
});
