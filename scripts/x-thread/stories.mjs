/**
 * Data stories for the X threads: each one returns the article (lead, sections, sources, a chart)
 * and the tweets, written only from the archive and the v7.6 model. Nothing here is invented:
 * every sentence is filled from a number in public/history or lib/elo-ratings.json.
 */
import fs from 'node:fs';
import { translate } from '../../lib/dictionary.ts';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://telemetry-one.com').replace(/\/$/, '');
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const races = () => fs.readdirSync('public/history/races').map(f => f.replace('.json', ''));
const race = id => read(`public/history/races/${id}.json`);
const driver = id => fs.existsSync(`public/history/drivers/${id}.json`) ? read(`public/history/drivers/${id}.json`) : null;
const ratings = () => read('lib/elo-ratings.json');

// ---------- formatting ----------
const num = (n, d = 0) => n.toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d });
export const pct = p => {
  const v = p * 100;
  return `${num(v, v < 10 && Math.round(v * 10) % 10 ? 1 : 0)}%`;
};
const ord = n => `${n}.º`;
const ordf = n => `${n}.ª`;
/** "la 3.ª victoria menos probable", or just "la victoria menos probable" for the first. */
const leastLikely = rank => rank === 1 ? 'la victoria menos probable' : `la ${ordf(rank)} victoria menos probable`;
/** "+44.100" → "44,1 s"; lap gaps ("+1 lap") stay as they are. */
const gapText = g => /^\+?[\d:.]+$/.test(g) ? `${g.replace('+', '').replace(/\.?0+$/, '').replace('.', ',')} s` : null;
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const longDate = iso => `${Number(iso.slice(8, 10))} de ${MONTHS[Number(iso.slice(5, 7)) - 1]} de ${iso.slice(0, 4)}`;
const list = items => items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`;
const gpName = r => translate(r.eventName, 'races');
const place = name => translate(name, 'countries');
const surname = name => name.split(' ').slice(1).join(' ') || name;
const slugify = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const numeric = p => typeof p === 'number';
const cmp = (a, b) => a.season - b.season || a.round - b.round;
const timesWord = n => n === 1 ? 'vez' : 'veces';
const winsWord = n => n === 1 ? 'victoria' : 'victorias';

/** Every win the model covers, from least to most likely. */
let oddsCache;
export function winnerOdds() {
  if (oddsCache) return oddsCache;
  const rows = [];
  for (const id of races()) {
    const r = race(id);
    const winner = r.sessions?.race?.find(x => x.position === 1);
    const m = winner && r.model?.find(x => x.driver.id === winner.driver.id);
    if (m?.xw != null) rows.push({ id, year: r.year, round: r.round, date: r.date, driverId: winner.driver.id, xw: m.xw });
  }
  return (oddsCache = rows.sort((a, b) => a.xw - b.xw));
}

/** The driver's wins up to a race, with the model's odds when it covers them. */
function careerWins(d) {
  const odds = new Map(winnerOdds().map(o => [`${o.year}-${o.round}`, o]));
  return d.raceResults.filter(x => x.position === 1).sort(cmp)
    .map(x => ({ ...x, xw: odds.get(`${x.season}-${x.round}`)?.xw ?? null }));
}

function champion(year) {
  for (const f of fs.readdirSync('public/history/drivers')) {
    const d = read(`public/history/drivers/${f}`);
    if (d.titleSeasons?.includes(year)) return d;
  }
  return null;
}

// ---------- charts (same look as the other article diagrams) ----------
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
function bars(title, subtitle, rows, source) {
  const height = 110 + rows.length * 40 + 30;
  const max = Math.max(...rows.map(r => r.value));
  const body = rows.map((r, i) => {
    const y = 98 + i * 40;
    const w = Math.max(3, 380 * r.value / max);
    return `<text x="286" y="${y + 15}" text-anchor="end" fill="${r.highlight ? '#eeeeee' : '#a6a6ad'}" font-size="15">${esc(r.label)}</text>`
      + `<rect x="300" y="${y}" width="${w.toFixed(1)}" height="22" rx="4" fill="${r.highlight ? '#ff3027' : '#6c6c74'}"/>`
      + `<text x="${(308 + w).toFixed(1)}" y="${y + 16}" fill="#eeeeee" font-size="14" font-weight="600">${esc(r.text)}</text>`;
  }).join('');
  return {
    height,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 ${height}" role="img" aria-labelledby="title desc">\n<title id="title">${esc(title)}</title><desc id="desc">${esc(subtitle)}. ${esc(source)}</desc>\n<rect width="760" height="${height}" fill="#18181c"/>\n<g font-family="Inter, Helvetica, Arial, sans-serif"><text x="32" y="44" fill="#eeeeee" font-size="18" font-weight="700">${esc(title.toUpperCase())}</text><text x="32" y="68" fill="#a6a6ad" font-size="13">${esc(subtitle)}</text>${body}<text x="32" y="${height - 18}" fill="#6c6c74" font-size="12">${esc(source)}</text></g>\n</svg>\n`
  };
}

function line(title, subtitle, points, marks, source) {
  const width = 760, height = 380, left = 64, right = 32, top = 96, bottom = 64;
  const xs = points.map((_, i) => i), ys = points.map(p => p.rating);
  const minY = Math.floor(Math.min(...ys) / 50) * 50, maxY = Math.ceil(Math.max(...ys) / 50) * 50;
  const X = i => left + (width - left - right) * i / Math.max(1, xs.length - 1);
  const Y = v => top + (height - top - bottom) * (1 - (v - minY) / (maxY - minY || 1));
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.rating).toFixed(1)}`).join('');
  const grid = [];
  for (let v = minY; v <= maxY; v += 50) grid.push(`<line x1="${left}" x2="${width - right}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="#2c2c33"/><text x="${left - 8}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end" fill="#6c6c74" font-size="12">${v}</text>`);
  const seasons = [];
  points.forEach((p, i) => { if (i === 0 || p.season !== points[i - 1].season) seasons.push([i, p.season]); });
  const step = Math.ceil(seasons.length / 8);
  const ticks = seasons.filter((_, i) => i % step === 0).map(([i, s]) => `<text x="${X(i).toFixed(1)}" y="${height - bottom + 22}" text-anchor="middle" fill="#6c6c74" font-size="12">${s}</text>`);
  const dots = marks.map(m => { const i = points.findIndex(p => p.season === m.season && p.round === m.round); return i < 0 ? '' : `<circle cx="${X(i).toFixed(1)}" cy="${Y(points[i].rating).toFixed(1)}" r="5" fill="#ff3027"/><text x="${X(i).toFixed(1)}" y="${(Y(points[i].rating) - 12).toFixed(1)}" text-anchor="middle" fill="#eeeeee" font-size="13">${esc(m.label)}</text>`; });
  return {
    height,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">\n<title id="title">${esc(title)}</title><desc id="desc">${esc(subtitle)}. ${esc(source)}</desc>\n<rect width="${width}" height="${height}" fill="#18181c"/>\n<g font-family="Inter, Helvetica, Arial, sans-serif"><text x="32" y="44" fill="#eeeeee" font-size="18" font-weight="700">${esc(title.toUpperCase())}</text><text x="32" y="68" fill="#a6a6ad" font-size="13">${esc(subtitle)}</text>${grid.join('')}<path d="${path}" fill="none" stroke="#ff3027" stroke-width="2.5"/>${dots.join('')}${ticks.join('')}<text x="32" y="${height - 14}" fill="#6c6c74" font-size="12">${esc(source)}</text></g>\n</svg>\n`
  };
}

const MODEL_NOTE = 'El modelo v7.6 de Telemetry One estima, para cada carrera, la probabilidad de victoria de cada piloto a partir de su rating y del rendimiento de su auto.';

// ---------- race story ----------
export function raceStory(id, { anniversary } = {}) {
  const r = race(id);
  const results = r.sessions.race;
  const [w, second, third] = [1, 2, 3].map(p => results.find(x => x.position === p));
  const model = [...r.model].sort((a, b) => b.xw - a.xw);
  const wm = model.find(m => m.driver.id === w.driver.id);
  const fav = model[0];
  const favResult = results.find(x => x.driver.id === fav.driver.id);
  const odds = winnerOdds();
  const rank = odds.findIndex(o => o.id === id) + 1;
  const d = driver(w.driver.id);
  const wins = d ? careerWins(d) : [];
  const nth = wins.findIndex(x => x.season === r.year && x.round === r.round) + 1;
  const gp = gpName(r);
  const title = `${gp} ${r.year}`;
  const starters = results.filter(x => x.gridPosition != null || numeric(x.position)).length;
  const finishers = results.filter(x => numeric(x.position)).length;
  const pole = results.find(x => x.gridPosition === 1);
  const champ = champion(r.year);
  const standing = r.standings?.drivers?.find(s => s.entity.id === w.driver.id);
  const leader = r.standings?.drivers?.[0];
  const ago = anniversary ? `Hace ${anniversary} años, el ${longDate(r.date)}` : `El ${longDate(r.date)}`;
  const firstWin = nth === 1;
  const gridText = w.gridPosition === 1 ? 'desde la pole position' : w.gridPosition ? `largando ${ord(w.gridPosition)}` : 'largando desde el fondo';

  // Section 1: the race.
  const p1 = [`${ago}, ${w.driver.name} ganó el ${gp}${gp.includes(place(r.circuit.name)) ? '' : ` en ${place(r.circuit.name)}`} con ${w.constructor.name}, ${gridText}.`];
  const gap = second?.gap && gapText(second.gap);
  if (second && third) p1.push(gap ? `${second.driver.name}, a ${gap}, y ${third.driver.name} completaron el podio.` : `${second.driver.name} y ${third.driver.name} completaron el podio.`);
  if (pole && pole.driver.id !== w.driver.id) p1.push(numeric(pole.position) ? `${pole.driver.name} había largado primero y terminó ${ord(pole.position)}.` : `${pole.driver.name} había largado primero y no terminó${pole.reasonRetired ? ` (${translate(pole.reasonRetired, 'statuses').toLowerCase()})` : ''}.`);
  p1.push(`De los ${starters} que largaron, ${finishers} llegaron clasificados.`);

  // Section 2: what the model expected.
  const top = model.slice(0, 3);
  const p2 = [
    `${MODEL_NOTE} Para esta carrera, a ${w.driver.name} le daba un ${pct(wm.xw)}.`,
    `El favorito era ${fav.driver.name} (${fav.constructor.name}), con ${pct(fav.xw)}${favResult ? numeric(favResult.position) ? `, y terminó ${ord(favResult.position)}` : ', y no terminó la carrera' : ''}. Los tres con más chances eran ${list(top.map(m => `${m.driver.name} (${pct(m.xw)})`))}.`
  ];
  const p2b = `Entre las ${num(odds.length)} victorias que cubre el modelo desde 1950, esta es ${leastLikely(rank)}. ${wm.xw < 0.05 ? 'Dicho de otra forma: si esa carrera se corriera cien veces con los mismos autos y pilotos, el modelo esperaría verlo ganar ' + (wm.xw * 100 < 1 ? 'menos de una' : `unas ${num(Math.round(wm.xw * 100))}`) + '.' : `Que el ganador tuviera menos de ${pct(Math.ceil(wm.xw * 10) / 10)} de chances no es raro en la F1, pero tampoco es la norma.`}`;

  // Section 3: the winner.
  const totalWins = d?.stats?.wins ?? wins.length;
  const p3 = [];
  if (d) {
    p3.push(firstWin
      ? `Fue la primera victoria de ${w.driver.name} en la Fórmula 1${totalWins > 1 ? `; terminó su carrera con ${totalWins} victorias` : ' y la única de su carrera'}.`
      : `Fue la ${ord(nth)} de las ${totalWins} victorias de ${w.driver.name} en la Fórmula 1.`);
    p3.push(`Corrió entre ${d.firstSeason} y ${d.lastSeason}${d.titleSeasons?.length ? ` y fue campeón en ${list(d.titleSeasons.map(String))}` : ''}.`);
  }
  p3.push(`Esa tarde su rating en el modelo pasó de ${num(wm.eloBefore)} a ${num(wm.eloAfter)} puntos (${wm.eloAfter >= wm.eloBefore ? '+' : ''}${num(wm.eloAfter - wm.eloBefore, 1)}).`);
  const e = ratings()[w.driver.id];
  if (e) p3.push(`Su pico fue de ${num(e.peakRating)} puntos en ${e.peakSeason}, y en el ranking histórico del modelo aparece ${ord(e.rank)}.`);
  const others = wins.filter(x => x.xw != null && !(x.season === r.year && x.round === r.round));
  if (others.length >= 2) {
    const likelier = others.filter(x => x.xw > wm.xw).length;
    p3.push(likelier === others.length ? `Ninguna de sus otras ${others.length} victorias fue tan improbable para el modelo.` : `De sus otras ${others.length} victorias, ${likelier} fueron más probables que esta.`);
  }

  // Section 4: the championship.
  const p4 = [];
  if (standing && leader) {
    p4.push(standing.position === 1
      ? `Con esa victoria, ${w.driver.name} quedó al frente del campeonato con ${num(standing.points)} puntos${r.standings.drivers[1] ? `, ${num(standing.points - r.standings.drivers[1].points)} más que ${r.standings.drivers[1].entity.name}` : ''}.`
      : `Con esa victoria, ${w.driver.name} quedó ${ord(standing.position)} en el campeonato con ${num(standing.points)} puntos; ${leader.entity.name} lideraba con ${num(leader.points)}.`);
  }
  if (champ) p4.push(champ.id === w.driver.id ? `Al final de ${r.year}, el título fue suyo.` : `Al final de ${r.year}, el título fue para ${champ.name}.`);
  p4.push(`La ficha de la carrera en el archivo tiene la clasificación completa, la grilla y las probabilidades del modelo para cada piloto.`);

  const chartRows = [...new Map([...top, wm].map(m => [m.driver.id, m])).values()].sort((a, b) => b.xw - a.xw)
    .map(m => ({ label: `${m.driver.name}${m.driver.id === w.driver.id ? ' (ganó)' : ''}`, value: m.xw, text: pct(m.xw), highlight: m.driver.id === w.driver.id }));
  const chart = bars(`${title}: chances de ganar`, 'Probabilidad de victoria según el modelo v7.6', chartRows, 'Fuente: modelo v7.6 y archivo de Telemetry One (F1DB).');

  const slug = slugify(`${anniversary ? `${anniversary}-anos` : 'victoria-improbable'}-${w.driver.name}-${gp.replace('Gran Premio de ', '').replace('Gran Premio ', '')}-${r.year}`);
  const headline = anniversary
    ? `${title}: ${surname(w.driver.name)} ganó hace ${anniversary} años con un ${pct(wm.xw)} de chances`
    : `${surname(w.driver.name)} en el ${title}: ganó con un ${pct(wm.xw)} de chances`;
  const url = `${SITE}/articulos/${slug}`;

  const tweets = [
    anniversary
      ? `Hace ${anniversary} años, ${w.driver.name} ganó el ${title}. Según nuestro modelo, tenía un ${pct(wm.xw)} de chances. El favorito era ${fav.driver.name}, con ${pct(fav.xw)}.\n\nHilo.`
      : `${w.driver.name} ganó el ${title} con un ${pct(wm.xw)} de chances según nuestro modelo. Es ${leastLikely(rank)} de las ${num(odds.length)} que cubre desde 1950.\n\nHilo.`,
    `${firstWin ? 'Era su primera victoria en la F1. ' : ''}Largó ${w.gridPosition ? ord(w.gridPosition) : 'desde el fondo'} con ${w.constructor.name}${gp.includes(place(r.circuit.name)) ? '' : ` en ${place(r.circuit.name)}`}.${second && third ? ` ${second.driver.name} y ${third.driver.name} completaron el podio.` : ''}${pole && pole.driver.id !== w.driver.id ? ` ${pole.driver.name}, desde la pole, ${numeric(pole.position) ? `terminó ${ord(pole.position)}` : 'no terminó'}.` : ''}`,
    `${fav.driver.name} llegaba como favorito, con ${pct(fav.xw)}${favResult ? numeric(favResult.position) ? `, y terminó ${ord(favResult.position)}` : ', y no terminó' : ''}. ${top.length > 1 ? `Detrás venían ${list(top.slice(1).map(m => `${m.driver.name} (${pct(m.xw)})`))}.` : ''}`,
    `El rating de ${surname(w.driver.name)} pasó de ${num(wm.eloBefore)} a ${num(wm.eloAfter)}.${firstWin ? (totalWins === 1 ? ' Fue la única victoria de su carrera.' : ` Terminó su carrera con ${totalWins} victorias.`) : ` Fue su victoria ${ord(nth)} de ${totalWins}.`}${e ? ` En el ranking histórico del modelo está ${ord(e.rank)}.` : ''}`,
    `${standing ? `Después de esa carrera quedó ${ord(standing.position)} en el campeonato.` : ''}${champ ? ` El título de ${r.year} fue para ${champ.id === w.driver.id ? 'él' : champ.name}.` : ''}`.trim(),
    `La carrera completa, las chances de cada piloto y el gráfico del modelo:\n${url}`
  ].filter(Boolean);

  return {
    slug,
    title: headline,
    description: `${w.driver.name} ganó el ${title} cuando el modelo v7.6 le daba un ${pct(wm.xw)} de chances. El favorito era ${fav.driver.name}. La carrera, los números y cómo siguió el campeonato.`,
    period: String(r.year),
    year: r.year,
    anniversary,
    tags: [w.driver.name, w.constructor.name, title, r.circuit.name, 'Modelo v7.6', 'Probabilidad de victoria'],
    lead: anniversary
      ? `Hace ${anniversary} años, ${w.driver.name} ganó el ${title}. Según el modelo v7.6 tenía un ${pct(wm.xw)} de chances: el favorito era ${fav.driver.name}, con ${pct(fav.xw)}. Qué pasó en la carrera y qué dicen los números.`
      : `De las ${num(odds.length)} victorias que cubre el modelo v7.6 desde 1950, la de ${w.driver.name} en el ${title} es ${leastLikely(rank).replace('la victoria', 'la').replace(' victoria', '')}: le daba un ${pct(wm.xw)} de chances. Qué pasó en la carrera y qué dicen los números.`,
    sections: [
      { id: 'carrera', title: 'La carrera', sourceIds: ['archivo', 'wikipedia'], paragraphs: [p1.join(' ')] },
      { id: 'modelo', title: 'Lo que esperaba el modelo', sourceIds: ['modelo', 'archivo'], paragraphs: [p2.join(' '), p2b], diagram: { ...chart, alt: `Barras con la probabilidad de victoria del modelo v7.6 en el ${title}: ${chartRows.map(c => `${c.label} ${c.text}`).join(', ')}.`, caption: `Probabilidad de victoria de los tres favoritos y del ganador, según el modelo v7.6.` } },
      { id: 'ganador', title: firstWin ? 'La primera de ' + surname(w.driver.name) : `${surname(w.driver.name)} en números`, sourceIds: ['archivo', 'modelo'], paragraphs: [p3.join(' ')] },
      { id: 'campeonato', title: 'Cómo siguió el campeonato', sourceIds: ['archivo', 'f1db'], paragraphs: [p4.join(' ')] }
    ],
    sources: [
      { id: 'archivo', title: `Telemetry One: ficha del ${title}`, url: `${SITE}${r.href}` },
      { id: 'modelo', title: 'Telemetry One: ranking y modelo v7.6', url: `${SITE}/ranking` },
      { id: 'f1db', title: 'F1DB: base de datos de resultados de Fórmula 1', url: 'https://github.com/f1db/f1db' },
      ...(r.sources?.wikipedia ? [{ id: 'wikipedia', title: `Wikipedia: ${r.name}`, url: r.sources.wikipedia }] : [])
    ],
    related: [
      { label: `${title} en el archivo`, href: r.href },
      { label: w.driver.name, href: w.driver.href },
      { label: `${w.constructor.name} en el archivo`, href: w.constructor.href },
      { label: `Temporada ${r.year}`, href: `/historia/seasons/${r.year}` }
    ],
    homePhoto: photo(w.driver.id, w.driver.name),
    tweets
  };
}

function photo(id, name) {
  const photos = read('lib/driver-photos.json');
  return photos[id]?.url ? { url: photos[id].url, alt: name } : undefined;
}

// ---------- driver story ----------
const teams = d => [...(d.relations?.find(r => r.category === 'constructors')?.items ?? [])].sort((a, b) => b.races - a.races);
export function driverStory(id) {
  const d = driver(id);
  const e = ratings()[id];
  const above = e.winsAboveExpected > 0;
  const wins = careerWins(d).filter(x => x.xw != null);
  const odds = Object.entries(ratings()).filter(([, r]) => r.observedWins >= 5).sort((a, b) => b[1].winsAboveExpected - a[1].winsAboveExpected);
  const position = odds.findIndex(([k]) => k === id) + 1;
  const fromEnd = odds.length - position + 1;
  const rankAbove = position === 1 ? 'el que más' : `el ${ord(position)} que más`;
  const rankBelow = fromEnd === 1 ? 'el que más' : `el ${ord(fromEnd)} que más`;
  const name = d.name;
  const sur = surname(name);
  const exp = num(e.expectedWins, 1);
  const hardest = [...wins].sort((a, b) => a.xw - b.xw).slice(0, 3);
  const raceTitle = x => `${translate(x.event, 'races')} ${x.season}`;

  // Races the model made him favourite for and he didn't win.
  const missed = [];
  for (const x of d.raceResults) {
    if (x.position === 1) continue;
    const f = `public/history/races/${x.season}-${x.round}.json`;
    if (!fs.existsSync(f)) continue;
    const r = read(f);
    const m = r.model?.find(mm => mm.driver.id === id);
    if (m?.xw != null) missed.push({ ...x, xw: m.xw, winner: r.sessions?.race?.find(rr => rr.position === 1)?.driver.name });
  }
  missed.sort((a, b) => b.xw - a.xw);
  const topMissed = missed.slice(0, 3);

  const s = d.stats;
  const p1 = [
    `${name} corrió en la Fórmula 1 entre ${d.firstSeason} y ${d.lastSeason}: ${s.starts} carreras, ${s.wins} ${winsWord(s.wins)}, ${s.podiums} podios y ${s.poles} poles${d.titleSeasons?.length ? `. Fue campeón ${d.titleSeasons.length === 1 ? `en ${d.titleSeasons[0]}` : `${d.titleSeasons.length} veces: ${list(d.titleSeasons.map(String))}`}` : ''}.`,
    `Los equipos con los que más corrió fueron ${list(teams(d).slice(0, 3).map(c => `${c.name} (${c.races} carreras)`))}.`
  ];
  const p2 = [
    `${MODEL_NOTE} Si se suman esas probabilidades carrera por carrera, el resultado es cuántas victorias se podían esperar de él con los autos que tuvo: ${exp}.`,
    above
      ? `Ganó ${e.observedWins}: ${num(e.winsAboveExpected, 1)} más de lo esperado. Entre los ${odds.length} pilotos con al menos cinco victorias, es ${rankAbove} ganó por encima de lo que daban sus autos.`
      : `Ganó ${e.observedWins}: ${num(-e.winsAboveExpected, 1)} menos de lo esperado. Entre los ${odds.length} pilotos con al menos cinco victorias, es ${rankBelow} quedó por debajo de lo que daban sus autos.`
  ];
  const p3 = above
    ? [`Las victorias que el modelo menos esperaba: ${list(hardest.map(x => `${raceTitle(x)} (${pct(x.xw)})`))}.`, topMissed.length ? `Del otro lado, las carreras en las que más chances tenía y no ganó: ${list(topMissed.map(x => `${raceTitle(x)} (${pct(x.xw)}${x.winner ? `, ganó ${x.winner}` : ''})`))}.` : '']
    : [`Las carreras en las que más chances tenía y no ganó: ${list(topMissed.map(x => `${raceTitle(x)} (${pct(x.xw)}${x.winner ? `, ganó ${x.winner}` : ''})`))}.`, hardest.length ? `Sus victorias más improbables para el modelo fueron ${list(hardest.map(x => `${raceTitle(x)} (${pct(x.xw)})`))}.` : ''];
  const p4 = [
    `Su rating llegó a un pico de ${num(e.peakRating)} puntos en ${e.peakSeason}. En el ranking histórico del modelo, que pondera el nivel sostenido a lo largo de la carrera, aparece ${ord(e.rank)}.`,
    above
      ? 'Ganar más de lo esperado no siempre es solo talento: también cuentan los compañeros, la confiabilidad y la suerte de los rivales. Pero una diferencia así, sostenida durante años, es difícil de explicar sin el piloto.'
      : 'Quedar por debajo de lo esperado tampoco es solo una cuestión del piloto: un compañero muy fuerte en el mismo auto se lleva parte de esas chances, y la confiabilidad pesa. El número dice dónde mirar, no por qué.'
  ];

  const history = d.ratingHistory ?? [];
  const peakPoint = history.reduce((a, b) => (b.rating > (a?.rating ?? -Infinity) ? b : a), null);
  const chart = line(`${name}: rating del modelo`, `Rating v7.6 carrera por carrera, ${d.firstSeason}-${d.lastSeason}`, history, peakPoint ? [{ season: peakPoint.season, round: peakPoint.round, label: `Pico: ${num(peakPoint.rating)}` }] : [], 'Fuente: modelo v7.6 de Telemetry One.');

  const slug = slugify(`${name}-victorias-${above ? 'por-encima' : 'por-debajo'}-de-lo-esperado`);
  const url = `${SITE}/articulos/${slug}`;
  const tweets = [
    above
      ? `${name} ganó ${e.observedWins} carreras en la F1. Con los autos que tuvo, nuestro modelo esperaba ${exp}. Son ${num(e.winsAboveExpected, 1)} victorias más de las que daban sus autos.\n\nHilo.`
      : `${name} ganó ${e.observedWins} carreras en la F1. Con los autos que tuvo, nuestro modelo esperaba ${exp}. Son ${num(-e.winsAboveExpected, 1)} victorias menos de las que daban sus autos.\n\nHilo.`,
    `Cómo se calcula: antes de cada carrera, el modelo le da a cada piloto una probabilidad de ganar según su rating y su auto. Sumando las de ${sur} en sus ${s.starts} carreras sale ${exp}.`,
    above
      ? `Entre los ${odds.length} pilotos con al menos cinco victorias, ${sur} es ${rankAbove} ganó por encima de lo esperado.`
      : `Entre los ${odds.length} pilotos con al menos cinco victorias, ${sur} es ${rankBelow} quedó por debajo de lo esperado.`,
    above && hardest.length
      ? `Sus victorias más improbables según el modelo: ${list(hardest.map(x => `${raceTitle(x)} (${pct(x.xw)})`))}.`
      : topMissed.length ? `Las que más se le escaparon: ${list(topMissed.map(x => `${raceTitle(x)}, con ${pct(x.xw)}`))}.` : '',
    `Su rating tocó el pico en ${e.peakSeason}, con ${num(e.peakRating)} puntos. En el ranking histórico del modelo está ${ord(e.rank)}.`,
    `El artículo, con la curva de su rating carrera por carrera:\n${url}`
  ].filter(Boolean).map(t => t.length > 280 ? t.slice(0, 277).replace(/[ ,;][^ ,;]*$/, '') + '.' : t);

  return {
    slug,
    title: above ? `${name}: ${e.observedWins} victorias donde sus autos daban para ${exp}` : `${name}: ${e.observedWins} victorias donde sus autos daban para ${exp}`,
    description: above
      ? `Sumando las chances de cada carrera, el modelo v7.6 esperaba ${exp} victorias de ${name}. Ganó ${e.observedWins}. Dónde está la diferencia.`
      : `Sumando las chances de cada carrera, el modelo v7.6 esperaba ${exp} victorias de ${name}. Ganó ${e.observedWins}. Dónde se le escaparon.`,
    period: `${d.firstSeason}-${d.lastSeason}`,
    year: d.firstSeason,
    above,
    tags: [name, 'Modelo v7.6', 'Victorias esperadas', ...teams(d).slice(0, 3).map(c => c.name)],
    lead: `${name} ganó ${e.observedWins} carreras de Fórmula 1. Si se suman las probabilidades de victoria que el modelo v7.6 le daba en cada una, con los autos que tuvo, el resultado es ${exp}. La diferencia ${above ? 'a favor' : 'en contra'} es de ${num(Math.abs(e.winsAboveExpected), 1)} victorias.`,
    sections: [
      { id: 'carrera', title: 'La carrera de ' + sur, sourceIds: ['archivo', 'f1db'], paragraphs: [p1.join(' ')] },
      { id: 'esperado', title: 'Lo que esperaba el modelo', sourceIds: ['modelo'], paragraphs: p2 },
      { id: 'carreras', title: above ? 'Las que no estaban en los papeles' : 'Las que se le escaparon', sourceIds: ['archivo', 'modelo'], paragraphs: [p3.filter(Boolean).join(' ')] },
      { id: 'pico', title: 'El pico', sourceIds: ['modelo', 'wikipedia'], paragraphs: p4, diagram: { ...chart, alt: `Línea con el rating del modelo v7.6 de ${name} entre ${d.firstSeason} y ${d.lastSeason}, con el pico de ${num(e.peakRating)} puntos en ${e.peakSeason}.`, caption: `Rating de ${name} en el modelo v7.6, carrera por carrera.` } }
    ],
    sources: [
      { id: 'archivo', title: `Telemetry One: ficha de ${name}`, url: `${SITE}${d.href}` },
      { id: 'modelo', title: 'Telemetry One: ranking y modelo v7.6', url: `${SITE}/ranking` },
      { id: 'f1db', title: 'F1DB: base de datos de resultados de Fórmula 1', url: 'https://github.com/f1db/f1db' },
      ...(d.sources?.wikipedia ? [{ id: 'wikipedia', title: `Wikipedia: ${name}`, url: d.sources.wikipedia }] : [])
    ].filter((src, i, all) => src.id !== 'wikipedia' || all.length),
    related: [
      { label: name, href: d.href },
      ...teams(d).slice(0, 2).map(c => ({ label: `${c.name} en el archivo`, href: c.href })),
      { label: 'Ranking del modelo v7.6', href: '/ranking' }
    ],
    homePhoto: photo(id, name),
    tweets
  };
}
