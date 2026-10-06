import type { ReplayStint, ReplayWeather } from "@/lib/replay";

export const COMPOUNDS: Record<string, { label: string; letter: string; color: string }> = {
  SOFT: { label: "Blando", letter: "S", color: "#e8002d" },
  MEDIUM: { label: "Medio", letter: "M", color: "#ffd12e" },
  HARD: { label: "Duro", letter: "H", color: "#ececec" },
  INTERMEDIATE: { label: "Intermedio", letter: "I", color: "#43b02a" },
  WET: { label: "Lluvia", letter: "W", color: "#2f7fd0" }
};

export function compoundInfo(compound: string | null | undefined) {
  return COMPOUNDS[compound ?? ""] ?? { label: "Sin dato", letter: "?", color: "#777" };
}

/** The stint a driver was on during a lap, and how many laps the tyres had at that point. */
export function tyreOnLap(stints: ReplayStint[], driver: number, lap: number) {
  const stint = stints.find((item) => item.driver === driver && lap >= item.lapStart && (item.lapEnd === null || lap <= item.lapEnd));
  if (!stint) return null;
  return { compound: stint.compound, age: stint.ageAtStart + lap - stint.lapStart + 1 };
}

/** The last weather reading at or before `at`. */
export function weatherAt(weather: ReplayWeather[], at: number) {
  let found: ReplayWeather | null = null;
  for (const reading of weather) {
    if (reading.at > at) break;
    found = reading;
  }
  return found ?? weather[0] ?? null;
}

/** Whether it rained at any reading between two instants (plus the reading in force at the start). */
export function rainedBetween(weather: ReplayWeather[], from: number, to: number) {
  if (weatherAt(weather, from)?.rain) return true;
  return weather.some((reading) => reading.at >= from && reading.at <= to && reading.rain);
}
