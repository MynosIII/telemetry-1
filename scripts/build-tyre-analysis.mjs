import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.join(process.cwd(), 'public/history');
const index = JSON.parse(await readFile(path.join(root, 'index.json'), 'utf8'));
const tyres = index.entities.filter(e => e.category === 'tyres');
const noStart = new Set(['DNS', 'DNQ', 'DNPQ', 'EX', 'DNP']);
const empty = () => ({ races: 0, wins: 0 });
const analysis = Object.fromEntries(tyres.map(t => [t.id, {
  id: t.id, bestFinish: null, bestGrid: null, officialPoles: 0,
  first: null, last: null, seasons: [], modes: { multi: empty(), sole: empty(), unknown: empty() }
}]));
for (const file of await readdir(path.join(root, 'races'))) {
  const race = JSON.parse(await readFile(path.join(root, 'races', file), 'utf8'));
  const rows = race.sessions.race;
  const starters = rows.filter(r => !noStart.has(String(r.position)));
  const providers = new Set(starters.flatMap(r => r.tyre ? [r.tyre.id] : []));
  const unknown = starters.some(r => !r.tyre);
  const mode = providers.size > 1 ? 'multi' : providers.size === 1 && !unknown ? 'sole' : 'unknown';
  for (const id of new Set(rows.flatMap(r => r.tyre ? [r.tyre.id] : []))) {
    const tyre = analysis[id];
    if (!tyre) throw new Error(`Unknown tyre ${id}`);
    const own = rows.filter(r => r.tyre?.id === id);
    // One car can have several credited drivers in historical shared drives.
    const wins = new Set(own.filter(r => r.position === 1).map(r => `${r.constructor.id}/${r.number}`)).size;
    const ownMode = own.some(r => !noStart.has(String(r.position))) ? mode : 'unknown';
    tyre.modes[ownMode].races++;
    tyre.modes[ownMode].wins += wins;
    let season = tyre.seasons.find(s => s.year === race.year);
    if (!season) tyre.seasons.push(season = { year: race.year, races: 0, wins: 0, multi: empty(), sole: empty(), unknown: empty() });
    season.races++; season.wins += wins; season[ownMode].races++; season[ownMode].wins += wins;
    const event = { year: race.year, round: race.round, date: race.date, name: race.eventName, href: race.href };
    if (!tyre.first || event.date < tyre.first.date) tyre.first = event;
    if (!tyre.last || event.date > tyre.last.date) tyre.last = event;
    for (const r of own) {
      if (typeof r.position === 'number') tyre.bestFinish = Math.min(tyre.bestFinish ?? Infinity, r.position);
      if (typeof r.gridPosition === 'number' && r.gridPosition > 0 && !r.sharedCar) tyre.bestGrid = Math.min(tyre.bestGrid ?? Infinity, r.gridPosition);
    }
    if (race.pole?.tyre?.id === id) tyre.officialPoles++;
  }
}
for (const t of Object.values(analysis)) t.seasons.sort((a, b) => a.year - b.year);
await writeFile(path.join(root, 'tyre-analysis.json'), JSON.stringify({
  resultsThrough: index.meta.lastRaceDate,
  f1dbRevision: index.meta.f1dbRevision,
  methodology: 'Race classification records; DNS/DNQ/DNPQ/EX/DNP excluded when identifying competing suppliers. Multiple known starting suppliers: multi; one known and no unknown suppliers: sole; otherwise unknown. A supplier without a recorded start has unknown comparison mode. Event counts include recorded entrants. Shared winning cars count once.',
  tyres: analysis
}));
console.log(`Built ${tyres.length} tyre supplier analyses from the published race dossiers.`);
