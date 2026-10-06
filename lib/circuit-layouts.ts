import layoutYears from "./circuit-layouts.json";

/*
 * Drawings of every historic circuit layout, keyed by F1DB layout id (monza-7, spa-francorchamps-4).
 * Files: public/history/circuit-layouts/<id>.svg, from the f1-circuits-svg project via F1-Telemetry-Games.
 * lib/circuit-layouts.json lists the seasons each layout was raced; regenerate it with scripts/circuit-layout-years.mjs.
 */
const years = layoutYears as Record<string, number[]>;

export const LAYOUT_CREDIT = { label: "f1-circuits-svg · CC BY 4.0", url: "https://github.com/julesr0y/f1-circuits-svg" };

export const layoutDrawing = (layoutId: string | null | undefined) => layoutId && years[layoutId] ? `/history/circuit-layouts/${layoutId}.svg` : null;

/** "1957–1959, 1962–1971" */
export function layoutSeasons(layoutId: string) {
  const ranges: [number, number][] = [];
  for (const year of years[layoutId] ?? []) {
    const last = ranges.at(-1);
    if (last && year === last[1] + 1) last[1] = year; else ranges.push([year, year]);
  }
  return ranges.map(([from, to]) => from === to ? `${from}` : `${from}–${to}`).join(", ");
}
