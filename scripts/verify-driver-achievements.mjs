import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = async file => JSON.parse(await readFile(`public/history/${file}`, 'utf8'));
const index = await read('index.json');
const data = await read('driver-achievements.json');
const drivers = index.entities.filter(e => e.category === 'drivers');
assert.equal(Object.keys(data.drivers).length, drivers.length);
assert.equal(data.meta.events, index.meta.events);
assert.equal(data.meta.through, index.meta.lastSeason);
for (const driver of drivers) {
  const extra = data.drivers[driver.id];
  assert.ok(extra, driver.id);
  assert.equal(extra.starts.length, driver.stats.starts, `${driver.id}: starts`);
  assert.equal(new Set(extra.starts.map(r => `${r.season}-${r.round}`)).size, extra.starts.length);
  assert.ok(extra.grandSlams.length <= driver.stats.wins, driver.id);
  assert.ok(extra.driverOfTheDay.length <= extra.votesCovered, driver.id);
  for (const race of [...extra.starts, ...extra.grandSlams, ...extra.driverOfTheDay]) {
    assert.ok(race.season >= 1950 && race.season <= data.meta.through && race.round > 0);
  }
  assert.ok(extra.driverOfTheDay.every(r => r.season >= 2016));
}
const bySource = source => data.drivers[drivers.find(d => d.sourceId === source).id];
assert.equal(bySource('jim-clark').grandSlams.length, 8);
assert.equal(bySource('lewis-hamilton').grandSlams.length, 6);
assert.equal(bySource('kimi-antonelli').grandSlams.length, 0);
console.log(`Verified achievements for ${drivers.length} drivers through ${data.meta.through}.`);
