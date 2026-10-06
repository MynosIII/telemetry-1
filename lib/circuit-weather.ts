import "server-only";

export type WeatherData = {
  timezone: string;
  current: Record<string, number | null> & { time: number; interval: number };
  hourly: Record<string, (number | null)[]> & { time: number[] };
  daily: Record<string, (number | null)[]> & { time: number[] };
};
export async function getCircuitWeather(latitude?: number, longitude?: number): Promise<WeatherData | null> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const query = new URLSearchParams({
    latitude: String(latitude), longitude: String(longitude), timezone: "auto", timeformat: "unixtime", forecast_days: "7",
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
    hourly: "temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,uv_index",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset",
  });
  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`, { next: { revalidate: 600 }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    const data = await response.json() as WeatherData;
    if (!data.timezone || !Number.isFinite(data.current?.time) || !Array.isArray(data.hourly?.time) || !Array.isArray(data.daily?.time)) return null;
    return data;
  } catch { return null; }
}
