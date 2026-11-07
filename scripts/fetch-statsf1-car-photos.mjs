// Fills in car photos from STATS F1 (www.statsf1.com) for cars in public/history/cars.json that still have none.
//
// How STATS F1 is laid out:
//   /en/constructeurs-<letter>.aspx      every constructor (name + seasons), linking to /en/<constructor>.aspx
//   /en/<constructor>/modeles.aspx       a table of that constructor's models: name, photo, years
//   /constructeurs/photos/<n>/<m>.jpg    the model photo (≈400 px wide JPEG), also shown on /en/<model>.aspx
//
// Matching is strict: same constructor (name equal after squash, or one a prefix of the other), the StatsF1 model name
// equal to our model token after squash ("MP4/4" = "MP4-4"), and overlapping seasons. A car named only after its team
// takes the one model that constructor raced in those seasons. Anything else is skipped and logged.
//
// Polite: one request at a time with a ~1 s pause. Resumable: cars that already have a photo are skipped.
// Misses go to car-photos-revisar/statsf1-sin-foto.json; a review page to car-photos-revisar/statsf1.html.
//
// Usage: node scripts/fetch-statsf1-car-photos.mjs [--ids a,b] [--limit 20] [--dry]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { squash, modelToken } from "./fetch-car-photos.mjs";

const root = new URL("../", import.meta.url);
const carsFile = new URL("public/history/cars.json", root);
const photoDir = new URL("public/history/car-photos/", root);
const indexFile = new URL("lib/car-photos.json", root);
const reviewDir = new URL("car-photos-revisar/", root);
const missesFile = new URL("car-photos-revisar/statsf1-sin-foto.json", root);
const reviewPage = new URL("car-photos-revisar/statsf1.html", root);

const BASE = "https://www.statsf1.com";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const DELAY_MS = 1100;
const MAX_BYTES = 300 * 1024;

const args = process.argv.slice(2);
const argValue = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const onlyIds = argValue("--ids")?.split(",").map(s => s.trim()).filter(Boolean);
const limit = Number(argValue("--limit") ?? Infinity);
const dry = args.includes("--dry");

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const decode = s => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, " ").replace(/<[^>]*>/g, "").trim();
const readJson = file => JSON.parse(readFileSync(file, "utf8"));
const writeSorted = (file, value) => writeFileSync(file, JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))), null, 2) + "\n");

class Blocked extends Error {}
let lastRequest = 0;
async function get(path, binary = false) {
  const wait = lastRequest + DELAY_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequest = Date.now();
  let res;
  for (let attempt = 1; ; attempt++) {
    try {
      res = await fetch(BASE + path, { headers: { "User-Agent": USER_AGENT, Accept: binary ? "image/*" : "text/html" }, signal: AbortSignal.timeout(30000) });
      break;
    } catch (error) { // network hiccup (timeout, reset): back off and retry a couple of times
      if (attempt >= 3) throw error;
      await sleep(5000 * attempt);
    }
  }
  if ([403, 429, 503].includes(res.status)) throw new Blocked(`${res.status} on ${path}`);
  if (!res.ok) return null;
  if (binary) return { type: res.headers.get("content-type") ?? "", bytes: Buffer.from(await res.arrayBuffer()) };
  const html = await res.text();
  if (/captcha|cf-challenge|access denied/i.test(html) && !/statsf1/i.test(html.slice(0, 2000))) throw new Blocked(`challenge page on ${path}`);
  return html;
}

const years = html => [...html.matchAll(/\/en\/(\d{4})\.aspx/g)].map(m => Number(m[1]));
const overlaps = (range, seasons) => range.length && seasons.some(y => y >= Math.min(...range) && y <= Math.max(...range));

/** Every StatsF1 constructor: { slug, name, years } (years = debut season as listed). */
async function constructors() {
  const list = [];
  for (const letter of "abcdefghijklmnopqrstuvwxyz") {
    const html = await get(`/en/constructeurs-${letter}.aspx`);
    if (!html) continue;
    const links = [...html.matchAll(/<a href="\/en\/([a-z0-9-]+)\.aspx">([\s\S]*?)<\/a>/g)]; // champions' names sit in a <span>
    let current = null;
    for (const [, slug, text] of links) {
      if (/^\d{4}$/.test(slug)) { current?.years.push(Number(slug)); continue; }
      if (/^(constructeurs|default|saisons|grands-prix|pilotes|moteurs|pneus|nations|circuits|agenda|liens|fond-ecran|contact)/.test(slug)) { current = null; continue; }
      if (list.some(c => c.slug === slug)) { current = null; continue; }
      current = { slug, name: decode(text), years: [] };
      list.push(current);
    }
  }
  return list;
}

const modelCache = new Map();
/** A constructor's models: { slug, name, photo, years }. */
async function models(slug) {
  if (modelCache.has(slug)) return modelCache.get(slug);
  const html = await get(`/en/${slug}/modeles.aspx`);
  const rows = [];
  for (const [, row] of (html ?? "").matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const cells = [...row.matchAll(/<td>([\s\S]*?)<\/td>/g)].map(m => m[1]);
    if (cells.length < 3) continue;
    const link = cells[0].match(/<a href="\/en\/([a-z0-9-]+)\.aspx">([\s\S]*?)<\/a>/);
    if (!link) continue;
    const photo = cells[1].match(/(?:data-src|src)="(\/constructeurs\/photos\/[^"]+\.jpe?g)"/i)?.[1] ?? null;
    rows.push({ slug: link[1], name: decode(link[2]), photo, years: years(cells[2]) });
  }
  modelCache.set(slug, rows);
  return rows;
}

function candidateConstructors(car, all) {
  const ours = squash(car.constructor.name);
  const exact = all.filter(c => squash(c.name) === ours);
  const loose = all.filter(c => { const s = squash(c.name); return s !== ours && s.length >= 3 && (ours.startsWith(s) || s.startsWith(ours)); });
  // The index only shows a constructor's debut season: keep those that debuted before this car's last season.
  const inSeason = list => list.filter(c => !c.years.length || Math.min(...c.years) <= Math.max(...car.seasons));
  return { exact: inSeason(exact), loose: inSeason(loose) };
}

async function findPhoto(car, all) {
  const token = modelToken(car);
  const { exact, loose } = candidateConstructors(car, all);
  if (!exact.length && !loose.length) return { miss: "constructor not found on StatsF1" };
  if (!token) {
    // Car named only after the team: the single model that constructor raced in these seasons.
    if (exact.length !== 1) return { miss: `team-name car, ${exact.length} exact constructors` };
    const list = (await models(exact[0].slug)).filter(m => overlaps(m.years, car.seasons));
    if (list.length !== 1) return { miss: `team-name car, ${list.length} models in season`, models: list.map(m => m.name) };
    return { model: list[0] };
  }
  const hits = [];
  const seen = [];
  for (const c of [...exact, ...loose]) {
    const prefix = squash(c.name);
    for (const m of await models(c.slug)) {
      seen.push(`${c.name} ${m.name}`);
      const full = squash(m.name);
      const tokens = new Set([full, full.startsWith(prefix) ? full.slice(prefix.length) : full]);
      if (tokens.has(token) && (!m.years.length || overlaps(m.years, car.seasons))) hits.push(m);
    }
  }
  const unique = [...new Map(hits.map(m => [m.slug, m])).values()];
  if (unique.length === 1) return { model: unique[0] };
  if (unique.length > 1) return { miss: "ambiguous", models: unique.map(m => m.name) };
  return { miss: "no model with this name", models: seen.slice(0, 40) };
}

function writeReview(index, cars) {
  const byId = new Map(cars.map(c => [c.id, c]));
  const items = Object.entries(index).filter(([, v]) => v.author === "STATS F1").map(([id, v]) => ({ id, v, car: byId.get(id) }));
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const cards = items.map(({ id, v, car }) => `<figure><img loading="lazy" src="../public${v.url}" alt=""><figcaption><b>${esc(car?.name ?? id)}</b> ${esc((car?.seasons ?? []).join(", "))}<br><code>${esc(id)}</code> · <a href="${esc(v.source)}" target="_blank">StatsF1</a></figcaption></figure>`).join("\n");
  writeFileSync(reviewPage, `<!doctype html><meta charset="utf-8"><title>StatsF1 car photos (${items.length})</title>
<style>body{font:14px system-ui;margin:16px;background:#111;color:#eee}a{color:#8cf}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}figure{margin:0;background:#222;padding:8px;border-radius:6px}img{width:100%;display:block}figcaption{margin-top:6px}code{color:#aaa}</style>
<h1>StatsF1 car photos — ${items.length}</h1><p>Delete wrong ones from public/history/car-photos/ and lib/car-photos.json.</p><main>
${cards}
</main>\n`);
}

async function main() {
  const cars = readJson(carsFile).cars;
  const index = readJson(indexFile);
  const misses = existsSync(missesFile) ? readJson(missesFile) : {};
  mkdirSync(reviewDir, { recursive: true });
  let todo = cars.filter(c => !existsSync(new URL(`${c.id}.jpg`, photoDir)) && !index[c.id]);
  if (onlyIds) todo = todo.filter(c => onlyIds.includes(c.id));
  todo = todo.slice(0, limit);
  console.log(`statsf1: ${todo.length} cars without a photo`);

  let added = 0;
  try {
    const all = await constructors();
    console.log(`statsf1: ${all.length} constructors`);
    for (const car of todo) {
      const found = await findPhoto(car, all);
      if (!found.model?.photo) {
        misses[car.id] = { name: car.name, seasons: car.seasons, reason: found.miss ?? "model has no photo", ...(found.models ? { statsf1: found.models } : {}) };
        console.log(`  - ${car.id}: ${misses[car.id].reason}`);
        continue;
      }
      const source = `${BASE}/en/${found.model.slug}.aspx`;
      if (dry) { console.log(`  ✓ ${car.id} → ${found.model.name} ${found.model.photo}`); continue; }
      const img = await get(found.model.photo, true);
      if (!img || img.bytes[0] !== 0xff || img.bytes[1] !== 0xd8 || img.bytes.length > MAX_BYTES || img.bytes.length < 2000) {
        misses[car.id] = { name: car.name, seasons: car.seasons, reason: `bad image (${img ? `${img.type}, ${img.bytes.length} B` : "download failed"})` };
        console.log(`  - ${car.id}: ${misses[car.id].reason}`);
        continue;
      }
      writeFileSync(new URL(`${car.id}.jpg`, photoDir), img.bytes);
      index[car.id] = { url: `/history/car-photos/${car.id}.jpg`, source, author: "STATS F1", license: "© STATS F1" };
      delete misses[car.id];
      added++;
      console.log(`  ✓ ${car.id} ← ${found.model.name} (${source})`);
      writeSorted(indexFile, index);
      writeSorted(missesFile, misses);
    }
  } catch (error) {
    if (error instanceof Blocked) console.error(`statsf1: BLOCKED — ${error.message}. Stopping.`);
    else throw error;
  } finally {
    if (!dry) writeSorted(indexFile, index);
    writeSorted(missesFile, misses);
    writeReview(index, cars);
    console.log(`statsf1: ${added} photos added, ${Object.keys(misses).length} logged as missing`);
  }
}

await main();
