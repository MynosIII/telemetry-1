import "server-only";

type RainViewerFrame = { time: number; path: string };
type RainViewerResponse = {
  host?: string;
  radar?: { past?: RainViewerFrame[] };
};

export type WeatherRadarImage = {
  url: string;
  observedAt: string;
};

export async function getWeatherRadarImage(latitude?: number, longitude?: number): Promise<WeatherRadarImage | null> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  try {
    const response = await fetch("https://api.rainviewer.com/public/weather-maps.json", {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(7000)
    });
    if (!response.ok) return null;
    const payload = await response.json() as RainViewerResponse;
    const frame = payload.radar?.past?.at(-1);
    if (!payload.host || !frame) return null;
    return {
      url: `${payload.host}${frame.path}/512/7/${latitude!.toFixed(4)}/${longitude!.toFixed(4)}/2/1_1.png`,
      observedAt: new Date(frame.time * 1000).toISOString()
    };
  } catch {
    return null;
  }
}
