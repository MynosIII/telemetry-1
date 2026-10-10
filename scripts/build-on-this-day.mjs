import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const events = [];
const add = event => { if (/^\d{4}-\d{2}-\d{2}$/.test(event.date ?? '')) events.push(event); };
for (const file of readdirSync('public/history/drivers')) {
  const d = read(`public/history/drivers/${file}`);
  for (const [key, kind, title] of [['dateOfBirth', 'Nacimiento', `Nació ${d.name}`], ['dateOfDeath', 'Fallecimiento', `Murió ${d.name}`]]) {
    add({date:d.biography?.[key], kind, title, text:key === 'dateOfBirth' ? `El comienzo de la historia de ${d.name}. Explorá su trayectoria en el Campeonato Mundial.` : `Recordamos la trayectoria de ${d.name} en el automovilismo.`, href:d.href, source:d.sources?.wikipedia});
  }
}
for (const file of readdirSync('public/history/races')) {
  const r = read(`public/history/races/${file}`);
  if (!r.podium?.length) continue;
  add({date:r.date, kind:'Gran Premio', title:r.name, text:`${r.podium[0].driver.name} ganó en ${r.circuit.name}.`, href:r.href, source:r.sources.wikipedia});
}
// Coronations are editorial facts: never inferred from final championship standings.
add({date:'2000-10-08', kind:'Coronación', title:'Schumacher devuelve el título a Ferrari', text:'Michael Schumacher aseguró su tercer Mundial en Suzuka y el primero de un piloto de Ferrari desde 1979.', href:'/historia/carreras/2000/16', source:'https://www.formula1.com/en/latest/article/moments-in-time-the-japanese-grand-prix.5M4HpgAHNmMjn15iW7nAXO'});
add({date:'2022-10-09', kind:'Coronación', title:'Verstappen se convierte en bicampeón', text:'La victoria en Japón y la penalización a Charles Leclerc dejaron decidido el segundo campeonato de Max Verstappen.', href:'/historia/carreras/2022/18', source:'https://www.fia.com/news/f1-verstappen-wins-japan-seal-second-world-title-leclerc-receives-time-penalty'});
const calendar = {};
add({date:'1894-07-22', kind:'Historia', title:'París–Rouen: llegar primero no era ganar', text:'Le Petit Journal organizó un concurso de vehículos sin caballos. El premio no dependía únicamente del reloj.', href:'/articulos/paris-rouen-1894', source:'https://media.mercedes-benz.fr/retromobile-2014--mercedes-benz-celebre--120-ans-de-competition-automobile-/'});
for (const e of events.sort((a,b) => b.date.localeCompare(a.date))) (calendar[e.date.slice(5)] ??= []).push(e);
writeFileSync('public/history/on-this-day.json', JSON.stringify(calendar));
console.log(`${events.length} efemérides en ${Object.keys(calendar).length} días del calendario.`);
