import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

export type RecordRow = { place: number; name: string; href: string | null; country: string | null; value: string; detail: string | null; detailHref: string | null };
export type RecordTable = { id: string; title: string; note: string | null; rows: RecordRow[]; more: number };
export type RecordSection = { id: string; title: string; records: RecordTable[] };
export type RecordBook = { meta: { firstSeason: number; lastSeason: number; lastRaceDate: string; decades: number[] }; scopes: Record<string, RecordSection[]> };

/** Built by scripts/build-records.mjs from the archive and the v7.6 model. */
export const getRecordBook = cache(async (): Promise<RecordBook> => JSON.parse(await readFile(path.join(process.cwd(), "public/history/records.json"), "utf8")));
