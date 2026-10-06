import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const read=async file=>JSON.parse(await readFile(file,'utf8'));
const index=await read('public/history/index.json');
const data=await read('public/history/circuit-results.json');
const stories=await read('data/circuit-stories.json');
const articles=await read('data/circuit-articles.json');
const photos=await read('data/circuit-photos.json');
const circuits=index.entities.filter(e=>e.category==='circuits');
const seen=new Set();
for(const circuit of circuits){
 const rows=data.circuits[circuit.id];assert.equal(rows.length,circuit.stats.races,circuit.id);
 assert.ok(stories[circuit.id]?.origin&&stories[circuit.id]?.history&&stories[circuit.id]?.revision,circuit.id);
 assert.ok(stories[circuit.id].source.startsWith('https://en.wikipedia.org/wiki/'));
 assert.ok(data.venues[circuit.id].placeName);
 const article=articles[circuit.id];assert.ok(article?.character&&article?.legacy,circuit.id);
 const editorialSources=article.additionalSources??[];assert.equal(new Set(editorialSources.map(s=>s.url)).size,editorialSources.length,`${circuit.id}: duplicate sources`);
 const layouts=[...new Set(rows.map(r=>r.layoutId))];
 assert.deepEqual(Object.keys(article.layouts).sort(),[...layouts].sort(),`${circuit.id}: editorial layout IDs`);
 for(const id of layouts)assert.ok(article.layouts[id].title&&article.layouts[id].text,`${id}: layout history`);
 for(const photo of photos[circuit.id]??[]){assert.ok(photo.author&&photo.caption&&photo.alt&&photo.license);assert.ok(/^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(photo.url));assert.ok(photo.page.startsWith('https://commons.wikimedia.org/'));assert.ok(/^(CC BY|CC0|Public domain)/i.test(photo.license));if(photo.license.startsWith('CC BY'))assert.ok(photo.licenseUrl);}
 for(const row of rows){
  const key=`${row.year}-${row.round}`;assert.ok(!seen.has(key),key);seen.add(key);
  assert.equal(row.href,`/historia/carreras/${row.year}/${row.round}`);
  if(row.poleSeconds!==null)assert.ok(Number.isFinite(row.poleSeconds)&&row.poleSeconds>0,key);
  if(row.poleFormat==='sprint'){assert.equal(row.poleSeconds,null);assert.equal(row.year,2021);}
  if(row.weather){assert.equal(row.weather.scope,'utc-day');assert.equal(row.weather.hours,24);assert.ok(Number.isFinite(row.weather.temperature));assert.ok(row.weather.rain>=0);assert.equal(row.weather.condition,row.weather.peakRain>=5?'heavy':row.weather.rain>0.1?'rain':'dry');}
 }
}
assert.equal(seen.size,index.meta.events);
const argentina=data.circuits['buenos-aires'];assert.equal(argentina.length,20);
const long=argentina.find(r=>r.year===1974);
assert.equal(long.pole.id,'peterson');assert.equal(long.poleTime,'1:50.780');assert.equal(long.length,5.968);
const short=argentina.find(r=>r.year===1998);
assert.equal(short.pole.id,'coulthard');assert.equal(short.poleTime,'1:25.852');assert.notEqual(short.layoutId,long.layoutId);
const sprint=data.circuits.silverstone.find(r=>r.year===2021);
assert.equal(sprint.pole.id,'max_verstappen');assert.equal(sprint.poleFormat,'sprint');
const penalty=data.circuits['spa-francorchamps'].find(r=>r.year===2022);
assert.equal(penalty.pole.id,'sainz');assert.equal(penalty.poleTime,'1:44.297');
assert.equal(data.circuits.indianapolis.filter(r=>r.poleFormat==='four-laps').length,11);
assert.notEqual(data.topology['kyalami-1'].imageTitle,data.topology['kyalami-2'].imageTitle);
assert.equal(data.topology['kyalami-1'].year,1985);
assert.equal(data.topology['kyalami-2'].year,1993);
for(const id of ['kyalami-1','kyalami-2'])assert.ok(data.circuits.kyalami.filter(r=>r.layoutId===id).every(r=>r.weather));
assert.equal(Object.keys(articles.monza.layouts).length,7);
assert.match(articles.monza.layouts['monza-2'].text,/10 km/);
assert.match(articles.monza.layouts['monza-6'].text,/Roggia/);
assert.match(articles.monza.layouts['monza-7'].text,/2000/);
console.log(`Verified ${circuits.length} circuit histories, ${seen.size} races, layout separation, sprint poles and grid penalties.`);
