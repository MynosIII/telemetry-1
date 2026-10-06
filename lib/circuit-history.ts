import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
export type CircuitRace = {
  year: number; round: number; date: string; name: string; href: string; layoutId: string | null;
  length: number | null; laps: number | null; distance: number | null;
  pole: CircuitDriver | null; poleTime: string | null; poleSeconds: number | null; poleFormat: "lap" | "four-laps" | "sprint";
  winners: CircuitDriver[]; winnerTime: string | null; fastest: CircuitDriver[]; fastestTime: string | null;
  weather: {scope:"utc-day";temperature:number;rain:number;peakRain:number;condition:"dry"|"rain"|"heavy";hours:number;gridLatitude:number;gridLongitude:number}|null;
};
export type LayoutTopology = {turnCount:number|null;turnsPerKm:number|null;longestStraight:number|null;chicanes:number|null;esses:number|null;complexity:number|null;straightExposure:number|null;totalTurningPerKm:number|null;year:number;round:number;quality:string;source:string;imageTitle:string};
export type CircuitDriver = { id: string; name: string; href: string | null };
export const getCircuitResults = cache(async (): Promise<{ meta: { through: number }; topology:Record<string,LayoutTopology>; venues: Record<string,{placeName:string;type:string;direction:string;latitude:number;longitude:number;previousNames?:string[]}>; circuits: Record<string,CircuitRace[]> }> => JSON.parse(await readFile(path.join(process.cwd(),"public/history/circuit-results.json"),"utf8")));
