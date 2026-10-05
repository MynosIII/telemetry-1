import photoIndex from "./driver-photos.json";

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
