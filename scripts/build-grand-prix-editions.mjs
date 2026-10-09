import fs from 'node:fs';

// Historical facts and their citations are curated in the snapshot. Regenerate only
// the World Championship side when the existing race dossiers/model are refreshed.
const file='public/history/grand-prix-editions.json';
const data=JSON.parse(fs.readFileSync(file,'utf8'));
const circuits=JSON.parse(fs.readFileSync('public/history/circuit-results.json','utf8'));
const byRace=new Map(Object.values(circuits.circuits).flat().map(r=>[r.href,r]));
for(const event of Object.values(data.grandsPrix))event.world=[];
for(const fileName of fs.readdirSync('public/history/races').filter(f=>f.endsWith('.json'))){
  const race=JSON.parse(fs.readFileSync('public/history/races/'+fileName,'utf8'));
  if(race.year>data.meta.through)continue;
  const event=data.grandsPrix[race.grandPrix.id];
  if(!event)throw Error(`No Grand Prix article for ${race.grandPrix.id}`);
  const circuit=byRace.get(race.href);
  const constructors=[...new Map(race.sessions.race.filter(r=>r.position===1).map(r=>[r.constructor.id,r.constructor])).values()];
  event.world.push({
    year:race.year,round:race.round,date:race.date,href:race.href,circuit:race.circuit,
    winners:circuit?.winners??race.podium.filter(r=>r.position===1).map(r=>r.driver),constructors,
    pole:circuit?.pole??race.pole?.driver??null,poleTime:circuit?.poleTime??null,
    fastest:circuit?.fastest??race.fastest.map(r=>r.driver),winnerTime:circuit?.winnerTime??null,
    distance:race.facts.distance,modelCount:race.model.length,summary:race.narrative.slice(0,2)
  });
}
for(const event of Object.values(data.grandsPrix))event.world.sort((a,b)=>a.year-b.year||a.round-b.round);
fs.writeFileSync(file,JSON.stringify(data)+'\n');
console.log(`Rebuilt ${Object.values(data.grandsPrix).reduce((sum,event)=>sum+event.world.length,0)} World Championship editions through ${data.meta.through}; historical records preserved.`);
