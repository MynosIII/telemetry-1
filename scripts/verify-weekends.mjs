import assert from "node:assert/strict";
import { readFile, access, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.join(process.cwd(), "public/history");
const json = async file => JSON.parse(await readFile(path.join(root, file), "utf8"));
const archive = await json("index.json"), manifest = await json("weekends.json"), catalogue = await json("cars.json");
const schema = await json("model-schema.json");
const hrefs = new Set([...archive.entities.map(e => e.href), ...manifest.races.map(r => r.href), ...catalogue.cars.map(c => c.href)]);
function references(value, context) {
  if (Array.isArray(value)) return value.forEach(v => references(v, context));
  if (!value || typeof value !== "object") return;
  if (value.href?.startsWith("/") && !value.href.startsWith("/history/")) assert(hrefs.has(value.href), `${context}: unknown ${value.href}`);
  Object.values(value).forEach(v => references(v, context));
}
let modelObservations = 0, raceCount = 0;
const actual = new Map();
for (const entry of manifest.races) {
  const race = await json(`races/${entry.id}.json`);
  assert.equal(race.href, `/historia/carreras/${race.year}/${race.round}`);
  references(race, entry.id); actual.set(entry.id, race);
  modelObservations += race.model.length; raceCount++;
  if (race.model.length) {
    await access(path.join(process.cwd(), "public", race.modelExport));
    const csv = await readFile(path.join(process.cwd(), "public", race.modelExport), "utf8");
    assert.deepEqual(csv.split("\n", 1)[0].trim().split(","), schema.columns, `${entry.id}: full original model columns`);
    assert.equal(csv.trim().split("\n").length - 1, race.model.length, `${entry.id}: model observations`);
    race.model.forEach(row => {
      for (const key of ["xw", "xp", "carWin"]) if (row[key] != null) assert(row[key] >= 0 && row[key] <= 1, `${entry.id}: ${key} out of bounds`);
    });
  }
}
assert.equal(raceCount, 1149); assert.equal(modelObservations, 25317);
for (const info of manifest.seasons) {
  const season = await json(`championships/${info.year}.json`);
  references(season, info.year);
  assert.equal(season.races.length, info.races);
  assert.equal(new Set(season.races.map(r => r.round)).size, season.races.length);
  season.races.forEach(r => {
    const race = actual.get(r.id); assert(race);
    for (const key of ["driverResults", "qualifyingResults", "gridResults"]) {
      const session = key === "driverResults" ? "race" : key === "qualifyingResults" ? "qualifying" : "grid";
      const cells = Object.values(season[key]).flatMap(driver => driver[String(r.round)] ?? []);
      assert.equal(cells.length, race.sessions[session].length, `${r.id}: ${session} matrix completeness`);
    }
  });
  for (const metric of ["wins", "poles", "fastestLaps", "podiums", "laps", "km"]) {
    const stats = season.stats[metric]; assert(stats);
    Object.values(stats.dimensions).forEach(rows => assert(rows.every(r => Number.isFinite(r.value) && r.value >= 0)));
    const constructors = stats.dimensions.constructors.reduce((sum, row) => sum + row.value, 0);
    const engines = stats.dimensions.engines.reduce((sum, row) => sum + row.value, 0);
    assert(Math.abs(constructors - engines) < 0.1, `${info.year}: ${metric} equipment deduplication`);
  }
}
const season1951 = await json("championships/1951.json");
assert.equal(season1951.stats.wins.dimensions.drivers.reduce((s, r) => s + r.value, 0), 9);
assert.equal(season1951.stats.wins.dimensions.constructors.reduce((s, r) => s + r.value, 0), 8);
assert.equal(season1951.stats.lapsLed.dimensions.drivers.find(r => r.entity.id === "fangio").value, 180);
assert.equal(season1951.stats.kmLed, undefined);
const season1975 = await json("championships/1975.json");
assert.equal(season1975.driverStandings.find(r => r.position === 1).points, 64.5);
assert.equal(season1975.constructorStandings.find(r => r.position === 1).points, 72.5);
assert.equal(actual.get("1975-11").podium[0].driver.id, "reutemann");
assert.equal(actual.get("1975-11").pole.driver.id, "lauda");
assert.equal(actual.get("2021-10").pole.driver.id, "max_verstappen");
assert(actual.get("2025-2").sessions.sprint.length > 0);
assert(actual.get("1950-4").poster.source.includes("SNL_SPOR_236"));
for (const car of catalogue.cars) {
  const detail = await json(`cars/${car.id}.json`); references(detail, car.id);
  assert(detail.entries.length && detail.seasons.length);
  assert(detail.entries.every(e => detail.seasons.includes(e.year)));
}
assert.equal((await readdir(path.join(root, "cars"))).filter(f => f.endsWith(".json")).length, catalogue.cars.length);
console.log(`Verified ${manifest.seasons.length} championships, ${raceCount} race dossiers, ${modelObservations} observations, ${catalogue.cars.length} chassis and all internal links. Shared wins, historical points, sprint poles and full CSV exports passed.`);
