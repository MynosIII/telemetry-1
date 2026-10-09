import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const data=read('public/history/grand-prix-editions.json');
const articles=read('data/grand-prix-articles.json');
const venues=read('data/grand-prix-venues.json');
const photos=read('data/grand-prix-venue-photos.json');
const files=fs.readdirSync('public/history/grands-prix').filter(f=>f.endsWith('.json'));
const seen=new Set();let historical=0;
assert.equal(Object.keys(articles).length,files.length);
for(const file of files){const entity=read('public/history/grands-prix/'+file);const event=data.grandsPrix[entity.id];assert.ok(event,entity.id);assert.ok(articles[entity.id].chapters.length>=2);assert.ok(articles[entity.id].sources.length);assert.equal(event.world.length,entity.stats.races,`${entity.id}: every archived edition must appear once`);
 for(const race of event.world){assert.ok(!seen.has(race.href),`Duplicate World Championship race ${race.href}`);seen.add(race.href);assert.ok(race.year>=1950&&race.year<=2025);assert.ok(venues[race.circuit.id]);assert.ok(fs.existsSync(`public/history/races/${race.year}-${race.round}.json`));assert.ok(race.winners.length);}
 for(const row of event.historical){historical++;assert.ok(row.year<=2025);assert.ok(row.winners&&!/Not held|cancelled|replaced with|no winner/i.test(row.winners));assert.ok(row.report.startsWith('https://'));if(row.venueId)assert.ok(venues[row.venueId]);assert.equal(row.modelCount,undefined);assert.equal(row.model,undefined);if(!row.designation)assert.ok(!event.world.some(r=>r.year===row.year),`${entity.id}: World Championship year mislabeled as external`);}
}
assert.equal(seen.size,read('public/history/weekends.json').races.length);
const italy=data.grandsPrix.italy;
for(const[year,place]of [[1921,'Montichiari'],[1937,'Livorno'],[1947,'Milan'],[1948,'Turin']])assert.equal(italy.historical.find(r=>r.year===year)?.location,place);
assert.equal(italy.world.find(r=>r.year===1980)?.circuit.id,'imola');
assert.equal(data.grandsPrix.france.historical[0].year,1906);
assert.equal(data.grandsPrix.australia.historical[0].year,1928);
assert.equal(data.grandsPrix.spain.historical[0].year,1913);
assert.equal(data.grandsPrix.indianapolis.historical[0].year,1911);
assert.ok(data.grandsPrix.europe.historical.some(r=>r.designation));
assert.equal(data.grandsPrix['sao-paulo'].historical.length,0,'Renamed Brazilian World Championship races are not external events');
assert.ok(data.grandsPrix.japan.historical.every(r=>r.raceClass),'Japanese antecedents need their original category');
for(const venue of Object.values(venues)){assert.ok(!/no winner|replaced with|not held/i.test(venue.name));if(venue.latitude!==null){assert.ok(Math.abs(venue.latitude)<=90&&Math.abs(venue.longitude)<=180);assert.ok(venue.source.startsWith('https://'));}if(venue.circuitId)assert.ok(fs.existsSync(`public/history/circuits/${venue.circuitId}.json`));}
for(const[id,images]of Object.entries(photos)){assert.ok(venues[id]);for(const image of images){assert.ok(image.author&&image.caption&&image.alt);assert.match(image.license,/CC BY|Public domain|CC0/i);assert.match(image.page,/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);assert.ok(!/Vanguard|athletics_track/i.test(image.page),'Unrelated images must not illustrate a racing venue');}}
console.log(`Verified ${files.length} Grand Prix articles, ${seen.size} World Championship races, ${historical} separate historical records, ${Object.keys(photos).length} illustrated historical venues.`);
