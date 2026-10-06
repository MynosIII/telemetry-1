import type { ArchiveMedia, CarSummary } from "./championship-history";
import carPhotoIndex from "./car-photos.json";
import teamLogoIndex from "./team-logos.json";
import carPhotoFiles from "./car-photo-files.json";

/*
 * Every car and every team looks for an image file named after its archive id:
 *   public/history/car-photos/<model id>.jpg   e.g. mclaren-mp4-4.jpg  (/historia/autos/mclaren-mp4-4)
 *   public/history/logos/<constructor id>.png  e.g. racing-bulls.png   (/historia/constructors/racing-bulls)
 * public/history/car-photos/README.md and public/history/logos/README.md list every expected name.
 * A missing file falls back to the archive's licensed photo, then to a placeholder or name badge.
 *
 * To use another file name, format or a remote URL, add an entry to the JSON indexes instead:
 *   lib/car-photos.json  "mclaren-mp4-4": "/history/car-photos/mp4-4-senna.webp"
 *                        or { "url": "https://…", "author": "…", "license": "CC BY 2.0", "source": "https://…" }
 *   lib/team-logos.json  "minardi": "/history/logos/minardi.svg"
 */
type PhotoEntry = string | (Partial<ArchiveMedia> & { url: string });
const carPhotos = carPhotoIndex as Record<string, PhotoEntry>;
const teamLogos = teamLogoIndex as Record<string, string>;
// Written by scripts/car-photo-manifest.mjs before each build.
const carPhotoFileIds = new Set(carPhotoFiles as string[]);

/** Sources in the order to try, with the attribution each one needs (null for the owner's own files). */
export type CarImage = { sources: string[]; credits: (ArchiveMedia | null)[] };

export function carImage(car: Pick<CarSummary, "id" | "photo">): CarImage {
  const entry = carPhotos[car.id];
  const own = entry ? (typeof entry === "string" ? entry : entry.url) : carPhotoFileIds.has(car.id) ? `/history/car-photos/${car.id}.jpg` : null;
  const credit = entry && typeof entry !== "string" && entry.author ? { source: entry.url, license: "", author: "", ...entry } : null;
  return { sources: [...(own ? [own] : []), ...(car.photo ? [car.photo.url] : [])], credits: [...(own ? [credit] : []), ...(car.photo ? [car.photo] : [])] };
}

/** True when the owner has supplied a logo file for this id (not just the default path). */
export const hasTeamLogo = (id: string): boolean => Object.hasOwn(teamLogos, id);
export const teamLogo = (constructorId: string): string => teamLogos[constructorId] ?? `/history/logos/${constructorId}.png`;
