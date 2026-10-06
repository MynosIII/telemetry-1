import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSessionSummary } from "@/lib/replay";
export { RADAR_STEP_MS } from "@/lib/replay-constants";

const JOLPICA = process.env.JOLPICA_BASE_URL ?? "https://api.jolpi.ca/ergast/f1";
const GIBS_WMS = process.env.GIBS_WMS_URL ?? "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi";
const PRECIPITATION_LAYERS = ["IMERG_Precipitation_Rate", "IMERG_Precipitation_Rate_30min"];
const BASE_LAYERS = "BlueMarble_ShadedRelief_Bathymetry";
const OVERLAY_LAYERS = "Coastlines_15m";
/** Half the side of the square shown, in degrees (about 330 km across). */
const SPAN = 1.5;

type Json = Record<string, any>;

function normalise(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Circuit coordinates: Jolpica's calendar for the season, else the archive's venues by name. */
export async function circuitLocation(key: number): Promise<{ lat: number; lon: number } | null> {
  const session = await getSessionSummary(key);
  if (!session) return null;
  const year = new Date(session.startsAt).getUTCFullYear();
  try {
    const response = await fetch(`${JOLPICA}/${year}.json?limit=40`, { next: { revalidate: 86_400 }, signal: AbortSignal.timeout(8000) });
    if (response.ok) {
      const races: Json[] = (await response.json())?.MRData?.RaceTable?.Races ?? [];
      const day = Date.parse(session.startsAt);
      const race = races.find((item) => Math.abs(Date.parse(`${item.date}T12:00:00Z`) - day) < 4 * 86_400_000);
      const lat = Number(race?.Circuit?.Location?.lat);
      const lon = Number(race?.Circuit?.Location?.long);
      if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
    }
  } catch {
    // Fall through to the archive.
  }
  try {
    const archive = JSON.parse(await readFile(path.join(process.cwd(), "public/history/circuit-results.json"), "utf8")) as { venues: Record<string, { placeName: string; latitude: number; longitude: number }> };
    const name = normalise(session.circuit);
    const venue = name ? Object.values(archive.venues).find((item) => {
      const place = normalise(item.placeName);
      return place.includes(name) || name.includes(place);
    }) : undefined;
    return venue ? { lat: venue.latitude, lon: venue.longitude } : null;
  } catch {
    return null;
  }
}

/**
 * Ground radar from RainViewer for the last two hours, where IMERG has not arrived yet:
 * the frame closest to `at`, as a transparent overlay.
 */
export async function recentRadarImage(lat: number, lon: number, at: number): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch("https://api.rainviewer.com/public/weather-maps.json", { next: { revalidate: 300 }, signal: AbortSignal.timeout(7000) });
    if (!response.ok) return null;
    const maps = (await response.json()) as { host?: string; radar?: { past?: { time: number; path: string }[] } };
    const frames = maps.radar?.past ?? [];
    if (!maps.host || !frames.length) return null;
    const frame = frames.reduce((best, item) => (Math.abs(item.time * 1000 - at) < Math.abs(best.time * 1000 - at) ? item : best));
    if (Math.abs(frame.time * 1000 - at) > 20 * 60_000) return null;
    const image = await fetch(`${maps.host}${frame.path}/512/8/${lat.toFixed(4)}/${lon.toFixed(4)}/2/1_1.png`, { signal: AbortSignal.timeout(8000) });
    return image.ok && (image.headers.get("content-type") ?? "").startsWith("image/") ? await image.arrayBuffer() : null;
  } catch {
    return null;
  }
}

/** A satellite precipitation map around the circuit for the 30-minute period starting at `at`. */
export async function radarImage(lat: number, lon: number, at: number): Promise<ArrayBuffer | null> {
  const bbox = [lon - SPAN, lat - SPAN, lon + SPAN, lat + SPAN].map((value) => value.toFixed(3)).join(",");
  for (const layer of PRECIPITATION_LAYERS) {
    const query = new URLSearchParams({
      SERVICE: "WMS", REQUEST: "GetMap", VERSION: "1.1.1", STYLES: "", SRS: "EPSG:4326", BBOX: bbox,
      WIDTH: "480", HEIGHT: "480", FORMAT: "image/png", TRANSPARENT: "FALSE",
      LAYERS: `${BASE_LAYERS},${layer},${OVERLAY_LAYERS}`,
      TIME: new Date(at).toISOString().replace(/\.\d{3}Z$/, "Z")
    });
    try {
      const response = await fetch(`${GIBS_WMS}?${query}`, { signal: AbortSignal.timeout(12_000) });
      if (response.ok && (response.headers.get("content-type") ?? "").startsWith("image/")) return await response.arrayBuffer();
    } catch {
      // Try the next layer name.
    }
  }
  return null;
}
