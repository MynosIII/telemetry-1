import type { ArchiveMedia, HistoricRace } from "./championship-history";
import posterIndex from "./race-posters.json";
import posterFiles from "./race-poster-files.json";

/*
 * Promotional poster for each Grand Prix, keyed by race id (<year>-<round>, as in /historia/carreras/<year>/<round>).
 * Drop public/history/race-posters/1988-1.jpg (or .png/.webp); the README there lists every id.
 * For another name or a remote image, add an entry to lib/race-posters.json:
 *   "1988-1": "/history/race-posters/brasil-88.webp"
 *   "1988-1": { "url": "https://…", "source": "https://commons.wikimedia.org/wiki/File:…", "author": "…", "license": "CC BY-SA 4.0", "caption": "…" }
 * Order: JSON entry, local file, the archive's licensed poster.
 */
type PosterEntry = string | (Partial<ArchiveMedia> & { url: string });
const entries = posterIndex as Record<string, PosterEntry>;
const files = new Map((posterFiles as string[]).map(name => [name.replace(/\.\w+$/, ""), name]));

export function racePoster(race: Pick<HistoricRace, "id" | "poster">): ArchiveMedia | null {
  const entry = entries[race.id];
  if (entry) return typeof entry === "string" ? { url: entry, source: "", author: "", license: "" } : { source: "", author: "", license: "", ...entry };
  const file = files.get(race.id);
  if (file) return { url: `/history/race-posters/${file}`, source: "", author: "", license: "" };
  return race.poster ?? null;
}
