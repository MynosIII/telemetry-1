import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

export type ArchiveRef = { id: string; name: string; href: string | null };
export type SessionRow = {
  position: number | string | null; number: number | string | null;
  driver: ArchiveRef; constructor: ArchiveRef; engine: ArchiveRef | null; tyre: ArchiveRef | null;
  laps: number | null; time: string | null; gap: string | null; interval: string | null;
  points: number | null; q1: string | null; q2: string | null; q3: string | null;
  gridPosition: number | string | null; reasonRetired: string | null; sharedCar: boolean | null;
  lap: number | null; pitStops: number | null; timePenalty: string | null;
};
export type StandingRow = { position: number | string | null; entity: ArchiveRef; engine: ArchiveRef | null; points: number };
export type ModelRow = {
  driver: ArchiveRef; constructor: ArchiveRef; xw: number | null; xp: number | null;
  expectedPosition: number | null; observedWin: number | null; eloBefore: number | null; eloAfter: number | null;
  raceDelta: number | null; qualifyingDelta: number | null; totalDelta: number | null;
  expectedPerformance: number | null; performanceResidual: number | null; carWin: number | null;
  carSuitability: number | null; driverContribution: number | null; carContribution: number | null;
  teamContribution: number | null; neutralXw: number | null; confidence: number | null;
  quality: string | null; eligible: number | boolean | null; carModel: string | null; carIdentity: string | null;
  marginAdjustment: number | null; weatherSource: string | null; wetFraction: number | null;
  airTemperature: number | null; trackTemperature: number | null; windSpeed: number | null; shapeQuality: string | null;
};
export type ArchiveMedia = { url: string; source: string; author: string; license: string; caption?: string };
export type HistoricRace = {
  id: string; year: number; round: number; href: string; name: string; eventName: string; date: string;
  circuit: ArchiveRef; grandPrix: ArchiveRef;
  facts: { officialName: string | null; courseLength: number | null; laps: number | null; distance: number | null; circuitType: string | null; circuitLayoutId: string | null; turns: number | null; direction: string | null; qualifyingFormat: string | null };
  podium: SessionRow[]; pole: SessionRow | null; fastest: SessionRow[]; narrative: string[];
  editorial: { text: string; url: string } | null;
  sessions: Record<"qualifying" | "grid" | "race" | "fastestLaps" | "sprintQualifying" | "sprint", SessionRow[]>;
  standings: { drivers: StandingRow[]; constructors: StandingRow[] }; model: ModelRow[];
  modelExport: string | null; poster?: ArchiveMedia;
  pitStops: { driver: ArchiveRef; stop: number; lap: number; time: string | null; duration: string | null }[];
  sources: { wikipedia: string; f1db: string; statsf1: string; model: string };
};
export type SeasonRace = Pick<HistoricRace, "id" | "year" | "round" | "href" | "name" | "eventName" | "date" | "circuit"> & {
  podium: { position: number; driver: ArchiveRef; constructor: ArchiveRef }[];
  pole: ArchiveRef | null; fastest: ArchiveRef[]; modelCount: number;
  driverStandings: StandingRow[]; constructorStandings: StandingRow[];
};
export type BalanceCell = { position: number | string | null; points?: number; grid?: number | string | null; fastest?: boolean; constructor: ArchiveRef; engine?: ArchiveRef | null; shared?: boolean; retired?: string | null; time?: string | null };
export type Balance = Record<string, Record<string, BalanceCell[]>>;
export type StatDimension = "drivers" | "constructors" | "engines" | "nations";
export type StatMetric = "wins" | "poles" | "fastestLaps" | "podiums" | "lapsLed" | "kmLed" | "laps" | "km";
export type StatRow = { entity: ArchiveRef; value: number };
export type SeasonStat = { source: string; retrieved?: string; dimensions: Record<StatDimension, StatRow[]> };
export type Entrant = { entrant: string; driver: ArchiveRef; constructor: ArchiveRef; engine: ArchiveRef | null; engineModel: string | null; engineModelName: string | null; tyre: ArchiveRef | null; chassis: (string | number)[]; cars: ArchiveRef[]; rounds: string; bestFinish: number | null; bestGrid: number | null };
export type SeasonModel = { driver: ArchiveRef; events: number; observedWins: number; expectedWins: number; meanXp: number; firstElo: number | null; lastElo: number | null; history: { round: number; elo: number | null; xw: number | null; carWin: number | null; xp: number | null }[] };
export type Championship = {
  year: number; races: SeasonRace[]; narrative: string[]; editorial: { text: string; url: string } | null;
  scoring: { text: string; url: string }; driverStandings: StandingRow[]; constructorStandings: StandingRow[];
  driverResults: Balance; qualifyingResults: Balance; gridResults: Balance; entrants: Entrant[]; model: SeasonModel[];
  stats: Partial<Record<StatMetric, SeasonStat>>; statCoverage: { missingDriverLaps: number; note: string };
  cars: ArchiveRef[]; changes?: { drivers: ArchiveRef[]; constructors: ArchiveRef[]; circuits: ArchiveRef[] };
  sources: { wikipedia: string; f1dbRevision: string; model: string; resultsThrough: string };
};
export type CarSummary = { id: string; name: string; constructor: ArchiveRef; seasons: number[]; engines: ArchiveRef[]; photo: ArchiveMedia | null; href: string };
export type HistoricCar = CarSummary & {
  drivers: ArchiveRef[]; entries: { year: number; driver: ArchiveRef; entrant: string; rounds: string; engine: ArchiveRef | null; engineModel: string | null; tyre: ArchiveRef | null; multipleModels: boolean }[];
  wikipedia: string; source: string; identification: string;
};

async function snapshot<T>(file: Promise<string>): Promise<T | undefined> {
  try { return JSON.parse(await file); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined; throw error; }
}
export const getChampionship = cache(async (year: string) => /^\d{4}$/.test(year) ? snapshot<Championship>(readFile(path.join(process.cwd(), "public/history/championships", `${year}.json`), "utf8")) : undefined);
export const getHistoricRace = cache(async (year: string, round: string) => /^\d{4}$/.test(year) && /^\d{1,2}$/.test(round) && Number(round) > 0 ? snapshot<HistoricRace>(readFile(path.join(process.cwd(), "public/history/races", `${year}-${Number(round)}.json`), "utf8")) : undefined);
export const getHistoricCar = cache(async (id: string) => /^[a-z0-9_-]+$/.test(id) ? snapshot<HistoricCar>(readFile(path.join(process.cwd(), "public/history/cars", `${id}.json`), "utf8")) : undefined);
export const getCarCatalogue = cache(async (): Promise<{ cars: CarSummary[]; source: string; cutoff: number }> => JSON.parse(await readFile(path.join(process.cwd(), "public/history/cars.json"), "utf8")));
