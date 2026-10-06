import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
export type DriverAchievements = { code?: string; number?: number; starts: { season: number; round: number }[]; grandSlams: { season: number; round: number }[]; driverOfTheDay: { season: number; round: number }[]; votesCovered: number };
export const getDriverAchievements = cache(async (): Promise<{ meta: { through: number }; drivers: Record<string, DriverAchievements> }> => JSON.parse(await readFile(path.join(process.cwd(), "public/history/driver-achievements.json"), "utf8")));
