import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';

const json = async file => JSON.parse(await readFile(`public/history/${file}`, 'utf8'));
const analysis = await json('tyre-analysis.json');
const logos = JSON.parse(await readFile('lib/tyre-logos.json', 'utf8'));
const logoSources = JSON.parse(await readFile('data/tyre-logo-sources.json', 'utf8'));
assert.equal(Object.keys(analysis.tyres).length, 9);
const hrefs = new Set((await json('weekends.json')).races.map(r => r.href));
for (const [id, tyre] of Object.entries(analysis.tyres)) {
  assert.ok(logos[id]?.url.startsWith('/history/tyre-logos/'), `${id}: missing local brand logo`);
  assert.equal(logos[id].source, logoSources[id]?.source, `${id}: missing logo provenance`);
  await access(`public${logos[id].url}`);
  const entity = await json(`tyres/${id}.json`);
  const sum = key => tyre.seasons.reduce((n, s) => n + s[key], 0);
  assert.equal(sum('races'), entity.stats.races, `${id}: event coverage`);
  assert.equal(sum('wins'), entity.stats.wins, `${id}: shared winning cars`);
  assert.equal(Object.values(tyre.modes).reduce((n,s) => n+s.races, 0), entity.stats.races);
  assert.equal(Object.values(tyre.modes).reduce((n,s) => n+s.wins, 0), entity.stats.wins);
  for (const count of Object.values(tyre.modes)) assert(count.wins <= count.races);
  assert(hrefs.has(tyre.first.href) && hrefs.has(tyre.last.href));
}
assert.equal(analysis.tyres.pirelli.seasons.find(s => s.year === 2025).sole.races, 24);
assert.equal(analysis.tyres.pirelli.seasons.find(s => s.year === 2025).sole.wins, 24);
// Michelin entrants did not start at Indianapolis 2005; Bridgestone supplied
// the starters. Do not classify that as a sole-provider race for Michelin.
assert.equal(analysis.tyres.michelin.seasons.find(s => s.year === 2005).unknown.races, 1);
assert.equal(analysis.tyres.michelin.seasons.find(s => s.year === 2005).sole.races, 0);
assert.equal(analysis.tyres.bridgestone.seasons.find(s => s.year === 2005).sole.races, 1);
// Fangio and Fagioli shared the 1951 French winner: one winning Pirelli car.
const france = await json('races/1951-4.json');
assert.equal(france.sessions.race.filter(r => r.position === 1).length, 2);
assert.equal(new Set(france.sessions.race.filter(r => r.position === 1).map(r => `${r.constructor.id}/${r.number}`)).size, 1);
assert.equal(analysis.tyres.pirelli.seasons.find(s => s.year === 1951).wins, 7);
assert.equal(analysis.tyres.avon.modes.sole.races, 0);
console.log('Verified nine tyre histories, shared wins, event coverage, sole-provider denominators and 2005 Indianapolis non-starts.');
