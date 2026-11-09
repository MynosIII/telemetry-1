// Stores driver portraits in the repo instead of hotlinking them, and fills in drivers that have none.
//
// 1. Entries in lib/driver-photos.json whose url points at another site (Wikimedia, StatsF1) are downloaded to
//    public/drivers/photos/<id>.jpg and the entry is switched to the local path. Hotlinked Wikimedia images fail
//    now and then (rate limits), which left drivers showing "imagen no disponible".
// 2. Archive drivers (public/history/drivers/<id>.json) with no entry get the lead image of their Wikipedia article,
//    or failing that their STATS F1 portrait.
//
// Images are shrunk to at most 600 px wide JPEG. Polite: one request at a time with a pause. Resumable: local
// entries are skipped, so run it again with --limit to go batch by batch. Misses go to lib/driver-photos-misses.json.
// After it, run python3 scripts/driver-faces.py for the face crops.
//
// Usage: node scripts/localize-driver-photos.mjs [--limit 100] [--only remote|missing] [--ids a,b]
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const indexFile = new URL("lib/driver-photos.json", root);
const driversDir = new URL("public/history/drivers/", root);
const photoDir = new URL("public/drivers/photos/", root);
const missesFile = new URL("lib/driver-photos-misses.json", root);

const USER_AGENT = "TelemetryOnePhotoFetcher/1.0 (https://telemetry-one.com; one-off download of driver portraits)";
const DELAY_MS = 1500;
const MAX_WIDTH = 600;

const args = process.argv.slice(2);
const argValue = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const limit = Number(argValue("--limit") ?? Infinity);
const only = argValue("--only");
const onlyIds = argValue("--ids")?.split(",").map(s => s.trim()).filter(Boolean);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const sharp = (await import("sharp")).default;

let lastRequest = 0;
async function get(url, accept) {
  const wait = lastRequest + DELAY_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequest = Date.now();
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: accept }, redirect: "follow", signal: AbortSignal.timeout(30000) });
      if (res.status === 429 || res.status === 503) {
        if (attempt >= 4) throw new Error(`${res.status} on ${url}`);
        await sleep(15000 * attempt);
        continue;
      }
      return res.ok ? res : null;
    } catch (error) {
      if (attempt >= 4) throw error;
      await sleep(5000 * attempt);
    }
  }
}

async function save(id, url) {
  const res = await get(url, "image/*");
  if (!res || !(res.headers.get("content-type") ?? "").startsWith("image/")) return false;
  const input = Buffer.from(await res.arrayBuffer());
  const output = await sharp(input, { failOn: "none" }).rotate().flatten({ background: "#161616" })
    .resize({ width: MAX_WIDTH, withoutEnlargement: true }).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
  writeFileSync(new URL(`${id}.jpg`, photoDir), output);
  return true;
}

/** Wikipedia lead image for an article title, sized for the portrait. */
async function wikipediaImage(title) {
  const res = await get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`, "application/json");
  if (!res) return [];
  const page = await res.json();
  const thumb = page.thumbnail?.source;
  // A 960 px thumbnail when the original is that big; otherwise the summary's own thumbnail.
  return thumb ? [thumb.replace(/\/\d+px-/, "/960px-"), thumb] : [];
}

/** STATS F1 portrait from the driver's page. */
async function statsf1Image(pageUrl) {
  const res = await get(pageUrl, "text/html");
  if (!res) return [];
  const html = await res.text();
  const src = html.match(/src="([^"]*\/pilotes\/photos\/[^"]+)"/i)?.[1];
  return src ? [new URL(src, "https://www.statsf1.com").href] : [];
}

const index = JSON.parse(readFileSync(indexFile, "utf8"));
const misses = existsSync(missesFile) ? JSON.parse(readFileSync(missesFile, "utf8")) : {};
const writeIndex = () => writeFileSync(indexFile, JSON.stringify(Object.fromEntries(Object.entries(index).sort(([a], [b]) => a.localeCompare(b))), null, 1) + "\n");

const remote = Object.keys(index).filter(id => !index[id].url.startsWith("/") && !misses[id]);
const archive = readdirSync(driversDir).filter(f => f.endsWith(".json")).map(f => f.slice(0, -5));
const missing = archive.filter(id => !index[id] && !misses[id]);

let jobs = [
  ...(only === "missing" ? [] : remote.map(id => ({ id, kind: "remote" }))),
  ...(only === "remote" ? [] : missing.map(id => ({ id, kind: "missing" }))),
];
if (onlyIds) jobs = jobs.filter(job => onlyIds.includes(job.id));
jobs = jobs.slice(0, limit);

let done = 0;
for (const { id, kind } of jobs) {
  try {
    if (kind === "remote") {
      if (await save(id, index[id].url)) { index[id].url = `/drivers/photos/${id}.jpg`; done++; console.log(`ok   ${id}`); }
      else { misses[id] = `no se pudo bajar ${index[id].url}`; console.log(`miss ${id}`); }
    } else {
      const driver = JSON.parse(readFileSync(new URL(`${id}.json`, driversDir), "utf8"));
      const candidates = [];
      if (driver.sources?.wikipediaTitle) candidates.push(["wikipedia", () => wikipediaImage(driver.sources.wikipediaTitle)]);
      if (driver.sources?.statsf1) candidates.push(["statsf1", () => statsf1Image(driver.sources.statsf1)]);
      let found = null;
      for (const [source, find] of candidates) {
        for (const url of await find()) if (await save(id, url)) { found = source; break; }
        if (found) break;
      }
      if (found) { index[id] = { name: driver.name, url: `/drivers/photos/${id}.jpg`, source: found }; done++; console.log(`ok   ${id} (${found})`); }
      else { misses[id] = "sin foto en Wikipedia ni STATS F1"; console.log(`miss ${id}`); }
    }
  } catch (error) {
    console.log(`err  ${id}: ${error.message}`);
  }
  writeIndex();
}
writeFileSync(missesFile, JSON.stringify(misses, null, 2) + "\n");
const left = Object.keys(index).filter(id => !index[id].url.startsWith("/")).length;
console.log(`\n${done} of ${jobs.length} saved. Still hotlinked: ${left}. Misses so far: ${Object.keys(misses).length}.`);
