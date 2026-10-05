import type { ArchiveMedia, CarSummary } from "./championship-history";
import carPhotoIndex from "./car-photos.json";
import teamLogoIndex from "./team-logos.json";

/*
 * Photo and logo indexes, keyed by archive id.
 *
 * lib/car-photos.json maps a car model id (the last part of /historia/autos/<id>)
 * to a photo. The value is either a URL string or an object with attribution:
 *   "mclaren-mp4-4": "/history/car-photos/mclaren-mp4-4.jpg"
 *   "ferrari-312t": { "url": "https://…", "author": "…", "license": "CC BY 2.0", "source": "https://…" }
 * Local files go in public/history/car-photos/.
 *
 * lib/team-logos.json maps a constructor id (the last part of /historia/constructors/<id>)
 * to a logo URL, for example "minardi": "/history/logos/minardi.svg".
 * Teams without an entry get a name badge in their livery colour.
 */
type PhotoEntry = string | (Partial<ArchiveMedia> & { url: string });
const carPhotos = carPhotoIndex as Record<string, PhotoEntry>;
const teamLogos = teamLogoIndex as Record<string, string>;

export function carPhoto(car: Pick<CarSummary, "id" | "photo">): ArchiveMedia | null {
  const entry = carPhotos[car.id];
  if (!entry) return car.photo;
  return typeof entry === "string" ? { url: entry, source: entry, author: "", license: "" } : { source: entry.url, author: "", license: "", ...entry };
}

export const teamLogo = (constructorId: string): string | null => teamLogos[constructorId] ?? null;
