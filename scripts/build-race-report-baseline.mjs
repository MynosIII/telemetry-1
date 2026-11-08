// Builds lib/race-report-baseline.json, the historical reference the post-race report needs:
//  1. How many places a driver usually gains or loses from a given starting slot (2014–2025).
//  2. Career totals up to 2025 (starts, wins, podiums, points) to spot milestones and records.
// Run after the archive changes: npm run build:race-report
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.join(process.cwd(), "public/history");
const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const readFolder = async (folder) => Promise.all((await readdir(path.join(root, folder))).filter(f => f.endsWith(".json")).map(f => readJson(path.join(root, folder, f))));

const FROM = 2014;
const TO = 2025;
const BACK_SLOTS = 8;

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * Each classified finisher gets a "start among finishers": their grid slot once the cars that
 * retired are removed. A driver who started tenth with three retirements ahead starts seventh.
 * Rows carry that start, how many cars were classified and where the driver finished.
 */
function finisherRows(races) {
  const rows = [];
  for (const race of races) {
    const classified = (race.sessions?.race ?? []).filter(r => Number.isInteger(r.position));
    const slot = (r) => Number.isInteger(r.gridPosition) && r.gridPosition > 0 ? r.gridPosition : 99; // pit lane last
    const order = [...classified].sort((a, b) => slot(a) - slot(b) || a.position - b.position);
    order.forEach((r, i) => rows.push({ year: race.year, start: i + 1, field: order.length, finish: r.position, grid: r.gridPosition }));
  }
  return rows;
}

/** Median places gained by the last, second-to-last… starter among finishers. Up front the median is zero. */
function backShift(rows) {
  const buckets = Array.from({ length: BACK_SLOTS }, () => []);
  for (const r of rows) {
    const fromBack = r.field - r.start;
    if (fromBack < BACK_SLOTS) buckets[fromBack].push(r.finish - r.start);
  }
  return buckets.map(b => b.length ? median(b) : 0);
}

const expected = (shift, start, field) => Math.max(1, start + (shift[field - start] ?? 0));
const mae = (rows, predict) => rows.reduce((sum, r) => sum + Math.abs(predict(r) - r.finish), 0) / rows.length;

const raceFiles = (await readFolder("races")).filter(r => r.year >= FROM && r.year <= TO);
const rows = finisherRows(raceFiles);
const shift = backShift(rows);

// Out-of-sample check: fit on 2014–2023, score on 2024–2025.
const train = rows.filter(r => r.year <= 2023);
const test = rows.filter(r => r.year > 2023);
const trainShift = backShift(train);
const validation = {
  testRows: test.length,
  maeModel: +mae(test, r => expected(trainShift, r.start, r.field)).toFixed(3),
  maeStartAmongFinishers: +mae(test, r => r.start).toFixed(3),
  maeRawGrid: +mae(test.filter(r => Number.isInteger(r.grid) && r.grid > 0), r => r.grid).toFixed(3)
};

// ---------- career totals ----------
const drivers = {};
for (const d of await readFolder("drivers")) {
  if (!d.stats?.starts || (d.lastSeason ?? 0) < 2010) continue;
  drivers[d.id] = {
    name: d.name,
    starts: d.stats.starts,
    wins: d.stats.wins,
    podiums: d.stats.podiums,
    points: d.officialPoints ?? 0,
    pointsFinishes: (d.raceResults ?? []).filter(r => (r.points ?? 0) > 0).length,
    birth: d.biography?.dateOfBirth ?? null
  };
}
const constructors = {};
for (const c of await readFolder("constructors")) {
  if (!c.stats?.starts || (c.lastSeason ?? 0) < 2010) continue;
  constructors[c.id] = { name: c.name, wins: c.stats.wins, podiums: c.stats.podiums, races: c.stats.races };
}

// Top-10 all-time tables, to say when someone climbs past another name or breaks the record.
const records = await readJson(path.join(root, "records.json"));
const table = (id) => records.scopes.todas.flatMap(s => s.records).find(r => r.id === id);
const leaderboard = (id) => table(id).rows.map(r => ({ id: r.href.split("/").pop(), name: r.name, value: Number(String(r.value).replace(/\./g, "").replace(",", ".")) }));
const furthestBack = table("victoria-desde-atras").rows[0];

const output = {
  generatedFrom: `public/history (${FROM}–${TO})`,
  gridExpectation: { from: FROM, to: TO, races: raceFiles.length, finishers: rows.length, shiftFromBack: shift, validation },
  drivers,
  constructors,
  leaderboards: {
    wins: leaderboard("victorias-total"),
    podiums: leaderboard("podios-total"),
    starts: leaderboard("largadas"),
    points: leaderboard("puntos")
  },
  furthestBackWin: { grid: Number(furthestBack.value.replace("P", "")), name: furthestBack.name, detail: furthestBack.detail }
};

await writeFile(path.join(process.cwd(), "lib/race-report-baseline.json"), JSON.stringify(output));
console.log(`Grid expectation from ${raceFiles.length} races, ${rows.length} finishers. Shift from the back: ${shift.join(", ")}`);
console.log("Validation (mean absolute error, places):", validation);
console.log(`${Object.keys(drivers).length} drivers, ${Object.keys(constructors).length} constructors.`);
