// Writes lib/circuit-layouts.json: the seasons each historic circuit layout was raced, from public/history/races.
// Layout drawings live in public/history/circuit-layouts/<layout id>.svg.
import { readdir, readFile, writeFile } from "node:fs/promises";

const dir = "public/history/races";
const drawings = new Set((await readdir("public/history/circuit-layouts")).map(f => f.replace(/\.svg$/, "")));
const years = {};
for (const file of await readdir(dir)) {
  const race = JSON.parse(await readFile(`${dir}/${file}`, "utf8"));
  const id = race.facts?.circuitLayoutId;
  if (!id || !drawings.has(id)) continue;
  (years[id] ??= new Set()).add(race.year);
}
const out = Object.fromEntries(Object.keys(years).sort().map(id => [id, [...years[id]].sort((a, b) => a - b)]));
await writeFile("lib/circuit-layouts.json", `${JSON.stringify(out)}\n`);
console.log(`${Object.keys(out).length} layouts with drawings, ${drawings.size} drawings`);
