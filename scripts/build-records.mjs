// Builds public/history/records.json: all-time and per-decade records computed from the archive
// (driver results, race files, championship standings) and the v7.6 model. Nothing is typed by hand.
// Run after the archive changes: npm run build:records
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { translate } from "../lib/dictionary.ts";

const root = path.join(process.cwd(), "public/history");
const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const readFolder = async (folder) => Promise.all((await readdir(path.join(root, folder))).filter(f => f.endsWith(".json")).map(f => readJson(path.join(root, folder, f))));

const NO_START = new Set(["DNS", "DNQ", "DNPQ", "EX", "DNP"]);
const LIMIT = 10;
const MAX_ROWS = 15;
const MIN_STARTS_RATE = 25;

const index = await readJson(path.join(root, "index.json"));
const byCategory = (category) => new Map(index.entities.filter(e => e.category === category).map(e => [e.id, e]));
const constructors = byCategory("constructors");
const engines = byCategory("engines");
const nationsByName = new Map(index.entities.filter(e => e.category === "nations").map(e => [e.name, e]));

const [drivers, raceFiles, championships, constructorFiles] = await Promise.all([readFolder("drivers"), readFolder("races"), readFolder("championships"), readFolder("constructors")]);
const races = new Map(raceFiles.map(r => [`${r.year}-${r.round}`, r]));
const raceOrder = [...races.values()].sort((a, b) => a.date.localeCompare(b.date) || a.round - b.round);
const raceIndex = new Map(raceOrder.map((r, i) => [r.id, i]));
const lastRaceOfSeason = new Map();
for (const r of raceOrder) lastRaceOfSeason.set(r.year, r);
const isIndy = (race) => race.grandPrix?.id === "indianapolis" || /Indianapolis 500/i.test(race.eventName);

// ---------- formatting ----------
const num = (v, d = 0) => v.toLocaleString("es-AR", { maximumFractionDigits: d, minimumFractionDigits: d });
const pct = (v, d = 1) => `${num(v * 100, d)} %`;
const plural = (n, one, many) => `${num(n)} ${n === 1 ? one : many}`;
function age(birth, date) {
  const b = new Date(`${birth}T00:00:00Z`), d = new Date(`${date}T00:00:00Z`);
  let years = d.getUTCFullYear() - b.getUTCFullYear();
  let anniversary = new Date(Date.UTC(b.getUTCFullYear() + years, b.getUTCMonth(), b.getUTCDate()));
  if (anniversary > d) { years -= 1; anniversary = new Date(Date.UTC(b.getUTCFullYear() + years, b.getUTCMonth(), b.getUTCDate())); }
  const days = Math.round((d - anniversary) / 86400000);
  return { value: (d - b) / 86400000, label: `${years} años, ${plural(days, "día", "días")}` };
}
const place = (name) => translate(name, "countries");
const raceLabel = (race) => `${race.year} · ${place(race.grandPrix?.name ?? race.eventName)}`;
const raceRef = (race) => ({ detail: raceLabel(race), detailHref: race.href });
const span = (a, b) => a.year === b.year ? `${a.year}` : `${a.year}–${b.year}`;

// ---------- entities ----------
const driverRef = (d) => ({ name: d.name, href: d.href, country: d.country ?? null });
const constructorRef = (id) => { const c = constructors.get(id); return { name: c?.name ?? id, href: c?.href ?? null, country: c?.country ?? null }; };
const engineRef = (id) => { const e = engines.get(id); return { name: e?.name ?? id, href: e?.href ?? null, country: e?.country ?? null }; };
const nationRef = (name) => { const n = nationsByName.get(name); return { name: place(name), href: n?.href ?? null, country: name }; };

// One row per driver entry, joined to its race file.
const entries = [];
for (const d of drivers) {
  for (const r of d.raceResults ?? []) {
    const race = races.get(`${r.season}-${r.round}`);
    if (!race) continue;
    entries.push({ ...r, driver: d, race, started: !NO_START.has(r.status), classified: /^\d+$/.test(r.status), pole: race.pole?.driver?.id === d.id });
  }
}
// A driver who drove two cars in one race (1950s shared drives) counts once, with his best result.
const merged = new Map();
for (const e of entries) {
  const key = `${e.driver.id}|${e.race.id}`;
  const prev = merged.get(key);
  if (!prev) { merged.set(key, e); continue; }
  const better = (e.position ?? 99) < (prev.position ?? 99) ? e : prev;
  merged.set(key, { ...better, started: prev.started || e.started, classified: prev.classified || e.classified, fastest: prev.fastest || e.fastest, points: (prev.points ?? 0) + (e.points ?? 0) });
}
entries.length = 0;
entries.push(...merged.values());
entries.sort((a, b) => raceIndex.get(a.race.id) - raceIndex.get(b.race.id));

// ---------- ranking helper ----------
/** Ranks items (desc by default) with shared places; keeps ties at the cut up to MAX_ROWS. */
function rank(items, { asc = false, format = (x) => num(x.value) } = {}) {
  const sorted = items.filter(x => x.value != null && Number.isFinite(x.value) && (asc || x.value > 0)).sort((a, b) => asc ? a.value - b.value : b.value - a.value);
  const rows = [];
  let more = 0, place = 0;
  sorted.forEach((x, i) => {
    if (i === 0 || sorted[i - 1].value !== x.value) place = i + 1;
    if (place > LIMIT) return;
    if (rows.length >= MAX_ROWS) { more += 1; return; }
    rows.push({ place, name: x.ref.name, href: x.ref.href, country: x.ref.country, value: format(x), detail: x.detail ?? null, detailHref: x.detailHref ?? null });
  });
  return { rows, more };
}
const record = (id, title, items, options = {}) => ({ id, title, note: options.note ?? null, ...rank(items, options) });
const nonEmpty = (records) => records.filter(r => r.rows.length);

function groupBy(list, key) {
  const map = new Map();
  for (const item of list) { const k = key(item); if (!map.has(k)) map.set(k, []); map.get(k).push(item); }
  return map;
}
/** Longest run of consecutive items satisfying `ok`, with its first and last race. */
function longestStreak(list, ok) {
  let best = { length: 0 }, current = null;
  for (const item of list) {
    if (ok(item)) { current = current ? { ...current, length: current.length + 1, last: item } : { length: 1, first: item, last: item }; if (current.length > best.length) best = current; }
    else current = null;
  }
  return best;
}
const streakDetail = (s) => ({ detail: s.first.race.id === s.last.race.id ? raceLabel(s.first.race) : `${raceLabel(s.first.race)} → ${raceLabel(s.last.race)}` });

// ---------- sections ----------
function driverSections(scopeEntries, scopeSeasons) {
  const perDriver = groupBy(scopeEntries, e => e.driver.id);
  const drv = [...perDriver.values()].map(list => {
    const d = list[0].driver;
    const starts = list.filter(e => e.started);
    const wins = starts.filter(e => e.position === 1);
    const podiums = starts.filter(e => e.position >= 1 && e.position <= 3);
    const poles = list.filter(e => e.pole);
    const fastest = starts.filter(e => e.fastest);
    const titles = (d.titleSeasons ?? []).filter(y => scopeSeasons.has(y));
    const points = (d.seasonStandings ?? []).filter(s => scopeSeasons.has(s.season)).reduce((s, x) => s + (x.points ?? 0), 0);
    return { d, list, starts, wins, podiums, poles, fastest, titles, points };
  });
  const by = (fn, detailFn) => drv.map(x => ({ ref: driverRef(x.d), value: fn(x), ...(detailFn ? detailFn(x) : {}) }));
  const seasonsOf = (x) => [...new Set(x.list.map(e => e.season))];
  const yearsSpan = (x) => x.starts.length ? { detail: span(x.starts[0].race, x.starts.at(-1).race) } : {};

  // Per driver-season tallies.
  const driverSeasons = [];
  for (const x of drv) for (const [season, list] of groupBy(x.starts, e => e.season)) {
    driverSeasons.push({ x, season, starts: list.length, wins: list.filter(e => e.position === 1).length, poles: x.poles.filter(e => e.season === season).length, podiums: list.filter(e => e.position >= 1 && e.position <= 3).length, fastest: list.filter(e => e.fastest).length });
  }
  const seasonItem = (field) => driverSeasons.map(s => ({ ref: driverRef(s.x.d), value: s[field], detail: `${s.season}`, detailHref: `/historia/seasons/${s.season}` }));
  const seasonRate = (field, min) => driverSeasons.filter(s => s.starts >= min).map(s => ({ ref: driverRef(s.x.d), value: s[field] / s.starts, raw: s[field], starts: s.starts, detail: `${s.season}`, detailHref: `/historia/seasons/${s.season}` }));

  // Streaks ignore the Indianapolis 500 (1950–1960), as the usual record lists do.
  const streakItems = (ok, pool = (x) => x.list) => drv.map(x => { const s = longestStreak(pool(x).filter(e => !isIndy(e.race)), ok); return s.length ? { ref: driverRef(x.d), value: s.length, ...streakDetail(s) } : null; }).filter(Boolean);
  const titleStreaks = drv.map(x => { const ys = [...x.titles].sort(); let best = 0, run = 0, from = 0, bestFrom = 0, bestTo = 0; ys.forEach((y, i) => { run = i && ys[i - 1] === y - 1 ? run + 1 : 1; if (run === 1) from = y; if (run > best) { best = run; bestFrom = from; bestTo = y; } }); return best > 1 ? { ref: driverRef(x.d), value: best, detail: bestFrom === bestTo ? `${bestFrom}` : `${bestFrom}–${bestTo}` } : null; }).filter(Boolean);

  // Most wins at the same Grand Prix.
  const gpWins = [];
  for (const x of drv) for (const [gp, list] of groupBy(x.wins, e => e.race.grandPrix?.id)) gpWins.push({ ref: driverRef(x.d), value: list.length, detail: list[0].race.grandPrix?.name ? `GP de ${place(list[0].race.grandPrix.name)}` : null, detailHref: list[0].race.grandPrix?.href ?? null, gp });

  const starsBeforeWin = drv.filter(x => x.wins.length).map(x => { const i = x.starts.indexOf(x.wins[0]); return { ref: driverRef(x.d), value: i + 1, ...raceRef(x.wins[0].race) }; });
  const winsFromBack = scopeEntries.filter(e => e.started && e.position === 1 && e.grid > 0).map(e => ({ ref: driverRef(e.driver), value: e.grid, ...raceRef(e.race) }));

  const titleRecords = nonEmpty([
    record("titulos", "Campeonatos de pilotos", by(x => x.titles.length || null, x => ({ detail: x.titles.join(", ") }))),
    record("titulos-seguidos", "Títulos consecutivos", titleStreaks),
    record("largadas", "Grandes Premios largados", by(x => x.starts.length || null, yearsSpan)),
    record("temporadas-disputadas", "Temporadas disputadas", by(x => seasonsOf(x).length, yearsSpan)),
    record("puntos", "Puntos", by(x => x.points || null, yearsSpan), { format: x => num(x.value, x.value % 1 ? 1 : 0), note: "Puntos oficiales de cada campeonato, con la escala de su época." }),
    record("puntos-seguidos", "Carreras seguidas en los puntos", streakItems(e => e.points > 0, x => x.starts)),
    record("llegadas-seguidas", "Carreras seguidas clasificado", streakItems(e => e.classified, x => x.starts))
  ]);
  const winRecords = nonEmpty([
    record("victorias-total", "Victorias", by(x => x.wins.length || null, yearsSpan)),
    record("victorias-pct", "Porcentaje de victorias", drv.filter(x => x.starts.length >= MIN_STARTS_RATE && x.wins.length).map(x => ({ ref: driverRef(x.d), value: x.wins.length / x.starts.length, detail: `${x.wins.length} de ${x.starts.length}` })), { format: x => pct(x.value), note: `Mínimo ${MIN_STARTS_RATE} largadas.` }),
    record("victorias-seguidas", "Victorias consecutivas", streakItems(e => e.position === 1)),
    record("victorias-temporada", "Victorias en una temporada", seasonItem("wins")),
    record("victorias-temporada-pct", "Porcentaje de victorias en una temporada", seasonRate("wins", 5).filter(s => s.raw), { format: x => pct(x.value), note: "Mínimo cinco largadas en la temporada." }),
    record("victorias-mismo-gp", "Victorias en un mismo Gran Premio", gpWins),
    record("largadas-primera-victoria", "Largadas hasta la primera victoria", starsBeforeWin),
    record("largadas-sin-victoria", "Largadas sin ganar", by(x => x.wins.length ? null : x.starts.length || null, yearsSpan)),
    record("victoria-desde-atras", "Victoria largando más atrás", winsFromBack, { format: x => `P${x.value}` })
  ]);
  const poleRecords = nonEmpty([
    record("poles-total", "Pole positions", by(x => x.poles.length || null, yearsSpan)),
    record("poles-pct", "Porcentaje de poles", drv.filter(x => x.starts.length >= MIN_STARTS_RATE && x.poles.length).map(x => ({ ref: driverRef(x.d), value: x.poles.length / x.list.length, detail: `${x.poles.length} de ${x.list.length}` })), { format: x => pct(x.value), note: `Sobre inscripciones; mínimo ${MIN_STARTS_RATE} largadas.` }),
    record("poles-seguidas", "Poles consecutivas", streakItems(e => e.pole)),
    record("poles-temporada", "Poles en una temporada", seasonItem("poles")),
    record("poles-sin-victoria", "Poles sin ganar", by(x => x.wins.length ? null : x.poles.length || null, yearsSpan)),
    record("hat-tricks", "Hat tricks", by(x => x.wins.filter(e => e.pole && e.fastest).length || null), { note: "Pole, victoria y vuelta rápida en el mismo Gran Premio." })
  ]);
  const podiumRecords = nonEmpty([
    record("podios-total", "Podios", by(x => x.podiums.length || null, yearsSpan)),
    record("podios-seguidos", "Podios consecutivos", streakItems(e => e.position >= 1 && e.position <= 3)),
    record("podios-temporada", "Podios en una temporada", seasonItem("podiums")),
    record("podios-sin-victoria", "Podios sin ganar", by(x => x.wins.length ? null : x.podiums.length || null, yearsSpan)),
    record("vueltas-rapidas", "Vueltas rápidas", by(x => x.fastest.length || null, yearsSpan)),
    record("vueltas-rapidas-temporada", "Vueltas rápidas en una temporada", seasonItem("fastest"))
  ]);

  // Ages. Champions are dated at the season's final race.
  const withBirth = drv.filter(x => x.d.biography?.dateOfBirth);
  const ageAt = (x, e) => { const a = age(x.d.biography.dateOfBirth, e.race.date); return { ref: driverRef(x.d), value: a.value, label: a.label, ...raceRef(e.race) }; };
  const firstOf = (pick) => withBirth.map(x => { const e = pick(x)[0]; return e ? ageAt(x, e) : null; }).filter(Boolean);
  const lastOf = (pick) => withBirth.map(x => { const e = pick(x).at(-1); return e ? ageAt(x, e) : null; }).filter(Boolean);
  const champAge = (which) => withBirth.filter(x => x.titles.length).map(x => { const y = which === "first" ? Math.min(...x.titles) : Math.max(...x.titles); const race = lastRaceOfSeason.get(y); const a = age(x.d.biography.dateOfBirth, race.date); return { ref: driverRef(x.d), value: a.value, label: a.label, detail: `${y}`, detailHref: `/historia/seasons/${y}` }; });
  const ageFormat = { format: x => x.label };
  const scorers = (x) => x.starts.filter(e => e.points > 0);
  const ageRecords = nonEmpty([
    record("joven-largada", "Más joven en largar", firstOf(x => x.starts), { asc: true, ...ageFormat }),
    record("joven-puntos", "Más joven en sumar puntos", firstOf(scorers), { asc: true, ...ageFormat }),
    record("joven-podio", "Más joven en un podio", firstOf(x => x.podiums), { asc: true, ...ageFormat }),
    record("joven-pole", "Más joven en hacer pole", firstOf(x => x.poles), { asc: true, ...ageFormat }),
    record("joven-victoria", "Más joven en ganar", firstOf(x => x.wins), { asc: true, ...ageFormat }),
    record("joven-campeon", "Campeón más joven", champAge("first"), { asc: true, ...ageFormat, note: "Edad en la última carrera de la temporada." }),
    record("veterano-largada", "Más veterano en largar", lastOf(x => x.starts), ageFormat),
    record("veterano-podio", "Más veterano en un podio", lastOf(x => x.podiums), ageFormat),
    record("veterano-pole", "Más veterano en hacer pole", lastOf(x => x.poles), ageFormat),
    record("veterano-victoria", "Más veterano en ganar", lastOf(x => x.wins), ageFormat),
    record("veterano-campeon", "Campeón más veterano", champAge("last"), { ...ageFormat, note: "Edad en la última carrera de la temporada." })
  ]);

  // Nations, by the drivers' nationality.
  const perNation = groupBy(drv.filter(x => x.d.country), x => x.d.country);
  const nation = (fn, detailFn) => [...perNation].map(([name, list]) => ({ ref: nationRef(name), value: fn(list), ...(detailFn ? detailFn(list) : {}) }));
  const nationRecords = nonEmpty([
    record("naciones-titulos", "Campeonatos de pilotos", nation(l => l.reduce((s, x) => s + x.titles.length, 0) || null, l => ({ detail: plural(l.filter(x => x.titles.length).length, "campeón", "campeones") }))),
    record("naciones-victorias", "Victorias", nation(l => l.reduce((s, x) => s + x.wins.length, 0) || null)),
    record("naciones-ganadores", "Pilotos ganadores", nation(l => l.filter(x => x.wins.length).length || null)),
    record("naciones-poles", "Pole positions", nation(l => l.reduce((s, x) => s + x.poles.length, 0) || null)),
    record("naciones-pilotos", "Pilotos con al menos una largada", nation(l => l.filter(x => x.starts.length).length || null))
  ]);

  return { titleRecords, winRecords, poleRecords, podiumRecords, ageRecords, nationRecords };
}

function teamSections(scopeEntries, scopeSeasons, scopeRaces) {
  const constructorTitles = new Map(constructorFiles.map(c => [c.id, (c.titleSeasons ?? []).filter(y => scopeSeasons.has(y))]));
  // One row per constructor (or engine) and race.
  const perRace = (key) => {
    const map = new Map();
    for (const e of scopeEntries) {
      const id = e[key];
      if (!id) continue;
      const k = `${id}|${e.race.id}`;
      if (!map.has(k)) map.set(k, { id, race: e.race, entries: [] });
      map.get(k).entries.push(e);
    }
    return [...map.values()];
  };
  const summarise = (rows, poleKey) => [...groupBy(rows, r => r.id)].map(([id, list]) => {
    const started = list.filter(r => r.entries.some(e => e.started));
    const won = started.filter(r => r.entries.some(e => e.started && e.position === 1));
    const podiums = started.reduce((s, r) => s + new Set(r.entries.filter(e => e.started && e.position >= 1 && e.position <= 3).map(e => e.position)).size, 0);
    const poles = list.filter(r => r.race.pole?.[poleKey]?.id === id);
    const fastest = started.filter(r => r.entries.some(e => e.fastest));
    const doubles = started.filter(r => { const p = new Set(r.entries.filter(e => e.started).map(e => e.position)); return p.has(1) && p.has(2); });
    return { id, list, started, won, podiums, poles, fastest, doubles };
  });
  const cons = summarise(perRace("constructorId"), "constructor");
  const engs = summarise(perRace("engineId"), "engine");
  const yearsSpan = (x) => x.started.length ? { detail: span(x.started[0].race, x.started.at(-1).race) } : {};
  const by = (list, refFn, fn, detailFn) => list.map(x => ({ ref: refFn(x.id), value: fn(x), ...(detailFn ? detailFn(x) : {}) }));
  const streak = (list, refFn, ok) => list.map(x => { const s = longestStreak(x.list.filter(r => !isIndy(r.race)), ok); return s.length ? { ref: refFn(x.id), value: s.length, ...streakDetail(s) } : null; }).filter(Boolean);
  const seasons = (list, refFn) => list.flatMap(x => [...groupBy(x.started, r => r.race.year)].map(([y, rs]) => ({ ref: refFn(x.id), y, races: scopeRaces.filter(r => r.year === y).length, wins: rs.filter(r => x.won.includes(r)).length })));
  const consSeasons = seasons(cons, constructorRef);

  const constructorRecords = nonEmpty([
    record("constructores-titulos", "Campeonatos de constructores", cons.map(x => ({ ref: constructorRef(x.id), value: constructorTitles.get(x.id)?.length || null, detail: null }))),
    record("constructores-victorias", "Victorias", by(cons, constructorRef, x => x.won.length || null, yearsSpan)),
    record("constructores-poles", "Pole positions", by(cons, constructorRef, x => x.poles.length || null, yearsSpan)),
    record("constructores-podios", "Podios", by(cons, constructorRef, x => x.podiums || null, yearsSpan), { note: "Cada auto en el podio suma uno." }),
    record("constructores-dobletes", "Dobletes", by(cons, constructorRef, x => x.doubles.length || null), { note: "Primero y segundo en la misma carrera." }),
    record("constructores-vr", "Vueltas rápidas", by(cons, constructorRef, x => x.fastest.length || null)),
    record("constructores-victorias-seguidas", "Victorias consecutivas", streak(cons, constructorRef, r => r.entries.some(e => e.started && e.position === 1))),
    record("constructores-victorias-temporada", "Victorias en una temporada", consSeasons.map(s => ({ ref: s.ref, value: s.wins || null, detail: `${s.y}`, detailHref: `/historia/seasons/${s.y}` }))),
    record("constructores-victorias-temporada-pct", "Porcentaje de victorias en una temporada", consSeasons.filter(s => s.wins && s.races >= 5).map(s => ({ ref: s.ref, value: s.wins / s.races, detail: `${s.y} · ${s.wins} de ${s.races}`, detailHref: `/historia/seasons/${s.y}` })), { format: x => pct(x.value) }),
    record("constructores-gp", "Grandes Premios disputados", by(cons, constructorRef, x => x.started.length || null, yearsSpan))
  ]);
  const engineRecords = nonEmpty([
    record("motores-victorias", "Victorias", by(engs, engineRef, x => x.won.length || null, yearsSpan)),
    record("motores-poles", "Pole positions", by(engs, engineRef, x => x.poles.length || null, yearsSpan)),
    record("motores-vr", "Vueltas rápidas", by(engs, engineRef, x => x.fastest.length || null)),
    record("motores-victorias-seguidas", "Victorias consecutivas", streak(engs, engineRef, r => r.entries.some(e => e.started && e.position === 1))),
    record("motores-gp", "Grandes Premios disputados", by(engs, engineRef, x => x.started.length || null, yearsSpan))
  ]);
  return { constructorRecords, engineRecords };
}

function seasonSections(scopeSeasons, scopeEntries) {
  const items = championships.filter(c => scopeSeasons.has(c.year));
  const seasonRef = (c) => ({ name: `${c.year}`, href: `/historia/seasons/${c.year}`, country: null });
  const winners = items.map(c => { const ids = new Set(scopeEntries.filter(e => e.season === c.year && e.started && e.position === 1).map(e => e.driver.id)); return { ref: seasonRef(c), value: ids.size, detail: plural(c.races.length, "carrera", "carreras") }; });
  const margin = items.filter(c => c.driverStandings?.length > 1).map(c => { const [a, b] = c.driverStandings; return { ref: seasonRef(c), value: a.points - b.points, a, b, share: a.points ? (a.points - b.points) / a.points : null }; });
  return nonEmpty([
    record("temporadas-ganadores", "Más ganadores distintos", winners),
    record("temporadas-ajustadas", "Campeonatos más ajustados", margin.map(m => ({ ...m, detail: `${m.a.entity.name} sobre ${m.b.entity.name}` })), { asc: true, format: x => `${num(x.value, x.value % 1 ? 1 : 0)} ${x.value === 1 ? "pt" : "pts"}` }),
    record("temporadas-dominantes", "Mayor ventaja del campeón", margin.map(m => ({ ref: m.ref, value: m.share, detail: `${m.a.entity.name}: ${num(m.a.points, 1)} a ${num(m.b.points, 1)}` })), { format: x => pct(x.value), note: "Diferencia con el subcampeón como porcentaje de los puntos del campeón, para comparar épocas con escalas distintas." }),
    record("temporadas-carreras", "Más Grandes Premios", items.map(c => ({ ref: seasonRef(c), value: c.races.length })))
  ]);
}

function modelSection(scopeSeasons, scopeRaces, allTime) {
  const inScope = (season) => scopeSeasons.has(season);
  const modelled = drivers.filter(d => d.model?.model?.careerRating);
  const peak = modelled.map(d => { const best = (d.ratingHistory ?? []).filter(r => inScope(r.season)).reduce((b, r) => !b || r.rating > b.rating ? r : b, null); const race = best && races.get(`${best.season}-${best.round}`); return best ? { ref: driverRef(d), value: best.rating, ...(race ? raceRef(race) : { detail: `${best.season}` }) } : null; }).filter(Boolean);

  // Season-level observed vs expected wins.
  const seasonModel = championships.filter(c => inScope(c.year)).flatMap(c => (c.model ?? []).map(m => ({ c, m })));
  const driverById = new Map(drivers.map(d => [d.id, d]));
  const refFor = (entity) => { const d = driverById.get(entity.id); return d ? driverRef(d) : { name: entity.name, href: entity.href, country: null }; };
  const aboveSeason = seasonModel.map(({ c, m }) => ({ ref: refFor(m.driver), value: m.observedWins - m.expectedWins, detail: `${c.year} · ${num(m.observedWins)} ganadas, ${num(m.expectedWins, 1)} esperadas`, detailHref: `/historia/seasons/${c.year}` }));

  // Upsets: winners the model gave the lowest chance.
  const upsets = scopeRaces.flatMap(race => {
    const winner = race.podium?.find(p => p.position === 1);
    const row = winner && (race.model ?? []).find(m => m.driver?.id === winner.driver.id);
    return row?.xw != null ? [{ ref: refFor(winner.driver), value: row.xw, ...raceRef(race) }] : [];
  });

  const career = allTime ? [
    record("modelo-carrera", "Rating de carrera", modelled.map(d => ({ ref: driverRef(d), value: d.model.model.careerRating, detail: span({ year: d.firstSeason }, { year: d.lastSeason }) })), { format: x => num(x.value, 1), note: "Nivel sostenido a lo largo de toda la carrera." }),
    record("modelo-sobre-esperado", "Victorias por encima de lo esperado", modelled.map(d => ({ ref: driverRef(d), value: d.model.model.winsAboveExpected, detail: `${num(d.model.model.observedWins)} ganadas, ${num(d.model.model.expectedWins, 1)} esperadas` })), { format: x => `+${num(x.value, 1)}` }),
    record("modelo-sin-ganar", "Victorias esperadas sin ganar", modelled.filter(d => !d.model.model.observedWins).map(d => ({ ref: driverRef(d), value: d.model.model.expectedWins, detail: span({ year: d.firstSeason }, { year: d.lastSeason }) })), { format: x => num(x.value, 2) }),
    record("modelo-companeros", "Ventaja sobre sus compañeros", modelled.map(d => { const t = d.model.teammates ?? []; const races = t.reduce((s, m) => s + m.races, 0); return races >= 30 ? { ref: driverRef(d), value: t.reduce((s, m) => s + m.averageRatingEdge * m.races, 0) / races, detail: `${plural(t.length, "compañero", "compañeros")}, ${num(races)} carreras` } : null; }).filter(Boolean), { format: x => `+${num(x.value, 1)}`, note: "Diferencia media de ELO frente a cada compañero, ponderada por carreras juntos. Mínimo 30 carreras." })
  ] : [];

  return nonEmpty([
    record("modelo-pico", "ELO máximo", peak, { format: x => num(x.value, 1) }),
    ...career,
    record("modelo-temporada", "Temporada más por encima de lo esperado", aboveSeason, { format: x => `+${num(x.value, 1)}` }),
    record("modelo-sorpresas", "Victorias más improbables", upsets, { asc: true, format: x => pct(x.value, 2), note: "Probabilidad de victoria que el modelo le daba al ganador antes de la carrera." })
  ]);
}

function buildScope(from, to) {
  const scopeRaces = raceOrder.filter(r => r.year >= from && r.year <= to);
  const scopeSeasons = new Set(scopeRaces.map(r => r.year));
  const scopeEntries = entries.filter(e => e.season >= from && e.season <= to);
  const d = driverSections(scopeEntries, scopeSeasons);
  const t = teamSections(scopeEntries, scopeSeasons, scopeRaces);
  const allTime = from === index.meta.firstSeason && to === index.meta.lastSeason;
  return [
    { id: "pilotos", title: "Pilotos", records: [...d.titleRecords] },
    { id: "victorias", title: "Victorias", records: d.winRecords },
    { id: "poles", title: "Poles", records: d.poleRecords },
    { id: "podios", title: "Podios y vueltas rápidas", records: d.podiumRecords },
    { id: "edades", title: "Edades", records: d.ageRecords },
    { id: "constructores", title: "Constructores", records: t.constructorRecords },
    { id: "motores", title: "Motores", records: t.engineRecords },
    { id: "naciones", title: "Naciones", records: d.nationRecords },
    { id: "temporadas", title: "Temporadas", records: seasonSections(scopeSeasons, scopeEntries) },
    { id: "modelo", title: "Modelo v7.6", records: modelSection(scopeSeasons, scopeRaces, allTime) }
  ].filter(s => s.records.length);
}

const { firstSeason, lastSeason, lastRaceDate } = index.meta;
const decades = [];
for (let y = Math.floor(firstSeason / 10) * 10; y <= lastSeason; y += 10) decades.push(y);
const scopes = { todas: buildScope(firstSeason, lastSeason) };
for (const decade of decades) scopes[`${decade}`] = buildScope(decade, Math.min(decade + 9, lastSeason));

await writeFile(path.join(root, "records.json"), JSON.stringify({ meta: { firstSeason, lastSeason, lastRaceDate, decades }, scopes }));
const count = Object.values(scopes).reduce((s, sections) => s + sections.reduce((t, x) => t + x.records.length, 0), 0);
console.log(`${count} record tables across ${Object.keys(scopes).length} scopes`);
