import photoIndex from "./driver-photos.json";
import faceIndex from "./driver-faces.json";

/*
 * Driver portraits, keyed by archive driver id (the last part of /pilotos/<id>).
 * Moved from F1-Telemetry-Games/shared/driver_images.json: local files live in
 * public/drivers/photos/<id>.<ext>, the rest point at Wikimedia Commons.
 * Add or replace a portrait by editing lib/driver-photos.json.
 */
const photos = photoIndex as Record<string, { name: string; url: string }>;

export const driverPhoto = (driverId: string): string | null => photos[driverId]?.url ?? null;

/** Name → portrait, for code that only knows a driver's display name. */
export const driverPhotosByName: Record<string, string> = Object.fromEntries(Object.values(photos).map(p => [p.name, p.url]));

/*
 * Square crops centred on the face (public/drivers/faces, made by
 * scripts/driver-faces.py) for avatars and other small round or square
 * portraits. Drivers whose photo is hosted elsewhere fall back to it.
 */
const faces = faceIndex as Record<string, string>;
const faceByPhoto: Record<string, string> = Object.fromEntries(Object.entries(faces).flatMap(([id, face]) => photos[id] ? [[photos[id].url, face]] : []));

export const driverFace = (driverId: string): string | null => faces[driverId] ?? driverPhoto(driverId);

/** Face crop for a portrait URL already in hand; returns the URL itself when there is none. */
export const faceForPhoto = <T extends string | null | undefined>(url: T): T | string => (url && faceByPhoto[url]) || url;
