import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
export type CircuitRace = {
  year: number; round: number; date: string; name: string; href: string; layoutId: string | null;
  length: number | null; laps: number | null; distance: number | null;
  pole: CircuitDriver | null; poleTime: string | null; poleSeconds: number | null; poleFormat: "lap" | "four-laps" | "sprint";
  winners: CircuitDriver[]; winnerTime: string | null; fastest: CircuitDriver[]; fastestTime: string | null;
};
export type CircuitDriver = { id: string; name: string; href: string | null };
export const getCircuitResults = cache(async (): Promise<{ meta: { through: number }; venues: Record<string,{placeName:string;type:string;direction:string;latitude:number;longitude:number;previousNames?:string[]}>; circuits: Record<string,CircuitRace[]> }> => JSON.parse(await readFile(path.join(process.cwd(),"public/history/circuit-results.json"),"utf8")));
