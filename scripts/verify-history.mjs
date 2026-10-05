import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public/history");
const read = async name => JSON.parse(await readFile(path.join(root, name), "utf8"));
const { entities, meta } = await read("index.json");
const keys = new Set(entities.map(e => `${e.category}/${e.id}`));
assert.equal(keys.size, entities.length, "Entity IDs must be unique");
let models = 0;
for (const entity of entities) {
  const key = `${entity.category}/${entity.id}`;
  const detail = await read(`${key}.json`);
  assert.deepEqual(detail.stats, entity.stats, `${key}: index/detail disagreement`);
  assert.ok(detail.firstSeason >= meta.firstSeason && detail.lastSeason <= meta.lastSeason, `${key}: cutoff`);
  assert.ok(detail.stats.starts <= detail.stats.entries, `${key}: starts exceed entries`);
  assert.ok(detail.stats.wins <= detail.stats.podiums, `${key}: wins exceed podiums`);
  for (const metric of ["entries", "starts", "wins", "podiums", "poles", "fastestLaps", "retirements", "laps"]) {
    assert.equal(detail.seasons.reduce((sum, season) => sum + season[metric], 0), detail.stats[metric], `${key}: season sum for ${metric}`);
  }
  for (const group of detail.relations) for (const target of group.items) {
    assert.ok(keys.has(`${group.category}/${target.id}`), `${key}: broken relation`);
  }
  if (detail.model) {
    models++;
    assert.equal(detail.ratingHistory.length, detail.model.races, `${key}: model coverage`);
    if (detail.model.model.observedWins !== null) assert.ok(Math.abs(detail.model.model.observedWins - detail.model.model.expectedWins - detail.model.model.winsAboveExpected) < 0.021, `${key}: expected/observed win reconciliation`);
    assert.ok(detail.ratingHistory.every(r => r.expectedCarWin === null || r.expectedCarWin >= 0 && r.expectedCarWin <= 1), `${key}: car probability range`);
  }
  if (detail.raceResults) {
    assert.equal(new Set(detail.raceResults.map(r => `${r.season}/${r.round}`)).size, detail.stats.races, `${key}: result coverage`);
    assert.ok(detail.raceResults.every(r => r.season <= meta.lastSeason), `${key}: future result`);
  }
}
// Independent, well established historical checks protect against changes to
// shared-car aggregation or driver/constructor identity mapping.
const senna = await read("drivers/senna.json");
assert.equal(senna.stats.starts, 161);
assert.equal(senna.stats.wins, 41);
assert.equal(senna.stats.podiums, 80);
assert.deepEqual(senna.titleSeasons, [1988, 1990, 1991]);
const fangio = await read("drivers/fangio.json");
assert.equal(fangio.stats.wins, 24);
assert.equal(fangio.model.model.observedWins, 23, "Shared wins must retain fractional model credit");
assert.equal(fangio.titleSeasons.length, 5);
assert.equal((await read("constructors/ferrari.json")).titleSeasons.length, 16);
assert.equal((await read("constructors/mclaren.json")).titleSeasons.length, 10);
assert.equal((await read("engines/honda.json")).stats.wins, 89);
assert.ok(meta.events > meta.modelEvents, "Results and model must retain distinct coverage");
console.log(`Verified ${entities.length} entities, ${models} model profiles, season totals, source cutoffs, race coverage, and every cross-link.`);
