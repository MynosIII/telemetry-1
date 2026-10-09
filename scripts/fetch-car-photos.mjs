// Finds a photo for every car in public/history/cars.json.
//
//   1. The car's own Wikipedia article (English, then Spanish): the first freely licensed photo in it
//      that is a real picture (no SVG, logo, map, diagram…) and whose file name or article names this model.
//      These go straight to public/history/car-photos/<id>.<ext>, credited in lib/car-photos.json.
//   2. Otherwise an image search: Wikimedia Commons, then Openverse (Flickr and other free-licence sources).
//      With BRAVE_API_KEY set, a last web image search too (no licence information: those may be copyrighted).
//      Search results are never published directly: they land in car-photos-revisar/ for review.
//
// Usage (needs internet; the cloud sandbox blocks Wikimedia):
//   node scripts/fetch-car-photos.mjs                 every car without a photo yet
//   node scripts/fetch-car-photos.mjs --ids mclaren-mp4-4,ferrari-312t --limit 20 --retry
//   node scripts/fetch-car-photos.mjs --accept        publish what is left in car-photos-revisar/ (delete the bad ones first)
//   node scripts/fetch-car-photos.mjs --accept mclaren-mp4-4,ferrari-312t
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = new URL("../", import.meta.url);
const carsFile = new URL("public/history/cars.json", root);
const photoDir = new URL("public/history/car-photos/", root);
const indexFile = new URL("lib/car-photos.json", root);
const reviewDir = new URL("car-photos-revisar/", root);
const reviewIndexFile = new URL("car-photos-revisar/revisar.json", root);
const missesFile = new URL("car-photos-revisar/sin-foto.json", root);

const USER_AGENT = "telemetry-one-car-photos/1.0 (https://github.com/MynosIII/telemetry-1)";
const WIDTH = 960;
const BAD_NAME = /\.svg$|\.gif$|\.tiff?$|logo|icon|flag|bandera|\bmap\b|mapa|layout|diagram|drawing|dibujo|blueprint|plan\b|chart|graph|helmet|casco|portrait|signature|firma|badge|emblem|crest|escudo|trophy|trofeo|wordmark|coat.of.arms/i;
const OK_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const FREE_LICENSE = /^(cc[ -]?(by|zero|0)|public domain|pd\b|dominio público|attribution|gfdl|free art|copyrighted free use|no restrictions)/i;

/** Lower-case letters and digits only, so "MP4/4", "MP4-4" and "mp4_4" all compare equal. */
export const squash = text => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** The part of the car name that identifies the model: "McLaren MP4/4" → "mp44". Empty for cars named only after the team. */
export function modelToken(car) {
  const name = car.name.trim();
  const team = car.constructor.name.trim();
  const rest = name.toLowerCase().startsWith(team.toLowerCase()) ? name.slice(team.length) : name;
  const token = squash(rest);
  return token.length >= 2 || /\d/.test(token) ? token : "";
}

const stripHtml = html => (html ?? "").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, " ").trim();

/** Licence and author of a MediaWiki imageinfo record, or null when it is not freely licensed. */
export function wikiCredit(info) {
  const meta = info.extmetadata ?? {};
  const license = stripHtml(meta.LicenseShortName?.value);
  const nonFree = /non-?free|fair use/i.test(meta.NonFree?.value ?? "") || /non-?free|fair use/i.test(license) || meta.NonFree?.value === "true";
  if (nonFree || !FREE_LICENSE.test(license)) return null;
  return { license, author: stripHtml(meta.Artist?.value) || stripHtml(meta.Credit?.value) || "Wikimedia Commons" };
}

/**
 * Picks the best photo among an article's files. `pages` are MediaWiki file pages with imageinfo;
 * `lead` is the article's lead image name. Returns null when nothing looks like a photo of this car.
 */
export function pickWikiImage(pages, { token, lead, titleMatches }) {
  const candidates = [];
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    if (!info) continue;
    const file = page.title.replace(/^[^:]+:/, "");
    if (BAD_NAME.test(file) || !OK_MIME.has(info.mime)) continue;
    const ratio = info.width / info.height;
    if (info.width < 500 || ratio < 1.15 || ratio > 3.5) continue;
    const credit = wikiCredit(info);
    if (!credit) continue;
    const named = token && squash(file).includes(token);
    const isLead = lead && squash(file) === squash(lead);
    // A photo in an article about a whole family of cars may show a sibling model: only take it
    // when the article itself is about this model or the file name says which car it is.
    if (!named && !(titleMatches && isLead)) continue;
    candidates.push({ file, info, credit, score: (named ? 3 : 0) + (isLead ? 2 : 0) + (ratio > 1.4 && ratio < 2.4 ? 1 : 0) });
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0] ?? null;
}

async function getJson(url, headers = {}) {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, { headers: { "User-Agent": USER_AGENT, ...headers } });
    if (response.ok) return response.json();
    if ((response.status === 429 || response.status >= 500) && attempt < 3) { await sleep(2000 * 2 ** attempt); continue; }
    throw new Error(`${response.status} ${url}`);
  }
}

const sleep = ms => new Promise(done => setTimeout(done, ms));
const api = (host, params) => `https://${host}/w/api.php?` + new URLSearchParams({ format: "json", formatversion: "2", origin: "*", ...params });

/** The Wikipedia article about this car, following redirects; falls back to a search. */
async function findArticle(host, car, token) {
  const direct = await getJson(api(host, { action: "query", titles: car.name, redirects: "1" }));
  const page = direct.query?.pages?.[0];
  const redirectFragment = direct.query?.redirects?.[0]?.tofragment;
  if (page && !page.missing) return { title: page.title, titleMatches: !redirectFragment && (!token || squash(page.title).includes(token)) };
  if (!token) return null;
  const search = await getJson(api(host, { action: "query", list: "search", srsearch: car.name, srlimit: "5" }));
  const hit = search.query?.search?.find(result => squash(result.title).includes(token) && squash(result.title).includes(squash(car.constructor.name).slice(0, 4)));
  return hit ? { title: hit.title, titleMatches: true } : null;
}

async function fromWikipedia(host, car, token) {
  const article = await findArticle(host, car, token);
  if (!article) return null;
  const [files, lead] = await Promise.all([
    getJson(api(host, { action: "query", generator: "images", titles: article.title, gimlimit: "50", prop: "imageinfo", iiprop: "url|mime|size|extmetadata", iiurlwidth: String(WIDTH) })),
    getJson(api(host, { action: "query", titles: article.title, prop: "pageimages", piprop: "name" })),
  ]);
  const pick = pickWikiImage(files.query?.pages ?? [], { token, lead: lead.query?.pages?.[0]?.pageimage, titleMatches: article.titleMatches });
  if (!pick) return null;
  return {
    download: pick.info.thumburl ?? pick.info.url,
    credit: { source: pick.info.descriptionurl, author: pick.credit.author, license: pick.credit.license },
    from: `https://${host}/wiki/${encodeURIComponent(article.title.replace(/ /g, "_"))}`,
  };
}

async function fromCommonsSearch(car, token) {
  const result = await getJson(api("commons.wikimedia.org", { action: "query", generator: "search", gsrsearch: `${car.name} filetype:bitmap`, gsrnamespace: "6", gsrlimit: "20", prop: "imageinfo", iiprop: "url|mime|size|extmetadata", iiurlwidth: String(WIDTH) }));
  const pages = (result.query?.pages ?? []).sort((a, b) => a.index - b.index);
  const pick = pickWikiImage(pages, { token, lead: null, titleMatches: false });
  return pick && { download: pick.info.thumburl ?? pick.info.url, credit: { source: pick.info.descriptionurl, author: pick.credit.author, license: pick.credit.license }, from: "Wikimedia Commons (búsqueda)" };
}

const OPENVERSE_LICENSES = { by: "CC BY", "by-sa": "CC BY-SA", cc0: "CC0", pdm: "Public domain" };

async function fromOpenverse(car, token) {
  if (!token) return null;
  const result = await getJson("https://api.openverse.org/v1/images/?" + new URLSearchParams({ q: car.name, license: "by,by-sa,cc0,pdm", page_size: "20", mature: "false" }));
  const hit = (result.results ?? []).find(image => squash(image.title ?? "").includes(token) && !BAD_NAME.test(image.title ?? "") && (!image.width || image.width / image.height > 1.15));
  if (!hit) return null;
  const license = `${OPENVERSE_LICENSES[hit.license] ?? hit.license.toUpperCase()}${hit.license_version && !["cc0", "pdm"].includes(hit.license) ? " " + hit.license_version : ""}`;
  return { download: hit.url, credit: { source: hit.foreign_landing_url, author: hit.creator || hit.source, license }, from: `Openverse (${hit.source})` };
}

async function fromBrave(car) {
  const key = process.env.BRAVE_API_KEY;
  if (!key) return null;
  const result = await getJson("https://api.search.brave.com/res/v1/images/search?" + new URLSearchParams({ q: `${car.name} Formula 1 car`, count: "10", safesearch: "strict" }), { "X-Subscription-Token": key, Accept: "application/json" });
  const hit = (result.results ?? []).find(image => !BAD_NAME.test(image.properties?.url ?? ""));
  // No licence information: these are almost always copyrighted. Only keep them after checking the source.
  return hit && { download: hit.properties.url, credit: { source: hit.url, author: hit.source ?? "", license: "" }, from: "Brave (sin licencia: verificar derechos)" };
}

let sharp;
async function save(url, base) {
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  sharp ??= await import("sharp").then(module => module.default, () => null);
  if (sharp) {
    writeFileSync(`${base}.jpg`, await sharp(bytes).rotate().resize({ width: WIDTH, withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toBuffer());
    return "jpg";
  }
  const type = response.headers.get("content-type") ?? "";
  const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
  writeFileSync(`${base}.${ext}`, bytes);
  return ext;
}

const readJson = (file, fallback) => existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : fallback;
const writeJson = (file, value) => writeFileSync(file, JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))), null, 2) + "\n");
const option = name => { const at = process.argv.indexOf(name); return at < 0 ? null : process.argv[at + 1]?.startsWith("--") ? "" : process.argv[at + 1] ?? ""; };

function accept(ids) {
  const review = readJson(reviewIndexFile, {});
  const index = readJson(indexFile, {});
  const wanted = ids ? ids.split(",").filter(Boolean) : Object.keys(review);
  let moved = 0;
  for (const id of wanted) {
    const entry = review[id];
    const file = entry && readdirSync(reviewDir).find(name => name.startsWith(`${id}.`) && name !== "revisar.json");
    if (!file) { delete review[id]; continue; }
    renameSync(new URL(file, reviewDir), new URL(file, photoDir));
    index[id] = { url: `/history/car-photos/${file}`, ...entry.credit };
    delete review[id];
    moved++;
  }
  writeJson(indexFile, index);
  writeJson(reviewIndexFile, review);
  console.log(`${moved} fotos publicadas; quedan ${Object.keys(review).length} para revisar.`);
}

async function main() {
  if (process.argv.includes("--accept")) return accept(option("--accept"));
  mkdirSync(reviewDir, { recursive: true });
  const { cars } = JSON.parse(readFileSync(carsFile, "utf8"));
  const index = readJson(indexFile, {});
  const review = readJson(reviewIndexFile, {});
  const misses = readJson(missesFile, {});
  const onDisk = new Set(readdirSync(photoDir).map(name => name.replace(/\.[^.]+$/, "")));
  const only = option("--ids")?.split(",").filter(Boolean);
  const limit = Number(option("--limit")) || Infinity;
  const retry = process.argv.includes("--retry");

  const todo = cars.filter(car => only ? only.includes(car.id) : !index[car.id] && !onDisk.has(car.id) && !review[car.id] && (retry || !misses[car.id])).slice(0, limit);
  console.log(`${todo.length} autos para buscar.`);
  const tally = { wikipedia: 0, revisar: 0, nada: 0, error: 0 };
  for (const [n, car] of todo.entries()) {
    const token = modelToken(car);
    const label = `[${n + 1}/${todo.length}] ${car.name}`;
    try {
      const own = await fromWikipedia("en.wikipedia.org", car, token) ?? await fromWikipedia("es.wikipedia.org", car, token);
      if (own) {
        const ext = await save(own.download, fileURLToPath(new URL(car.id, photoDir)));
        index[car.id] = { url: `/history/car-photos/${car.id}.${ext}`, ...own.credit };
        delete misses[car.id];
        writeJson(indexFile, index);
        tally.wikipedia++;
        console.log(`${label}: Wikipedia ✓ (${own.credit.license})`);
      } else {
        const found = await fromCommonsSearch(car, token) ?? await fromOpenverse(car, token).catch(() => null) ?? await fromBrave(car);
        if (found) {
          await save(found.download, fileURLToPath(new URL(car.id, reviewDir)));
          review[car.id] = { name: car.name, from: found.from, credit: found.credit };
          delete misses[car.id];
          writeJson(reviewIndexFile, review);
          tally.revisar++;
          console.log(`${label}: para revisar (${found.from})`);
        } else {
          misses[car.id] = car.name;
          tally.nada++;
          console.log(`${label}: sin foto`);
        }
      }
    } catch (error) {
      tally.error++;
      console.log(`${label}: error ${error.message}`);
    }
    writeJson(missesFile, misses);
    await sleep(300);
  }
  writeReviewPage(review);
  console.log(`\nWikipedia: ${tally.wikipedia} · para revisar: ${tally.revisar} · sin foto: ${tally.nada} · errores: ${tally.error}`);
  if (tally.revisar) console.log("Abrí car-photos-revisar/index.html, borrá las que no sirvan y corré: node scripts/fetch-car-photos.mjs --accept");
  if (tally.wikipedia) console.log("Después: node scripts/car-photo-manifest.mjs && git add public/history/car-photos lib/car-photos.json");
}

/** A local page with every photo waiting for review, its source and licence. */
function writeReviewPage(review) {
  const escape = text => String(text).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const files = existsSync(reviewDir) ? readdirSync(reviewDir) : [];
  const cards = Object.entries(review).map(([id, entry]) => {
    const file = files.find(name => name.startsWith(`${id}.`) && !name.endsWith(".json"));
    return `<figure><img src="${escape(file ?? "")}" loading="lazy"><figcaption><b>${escape(entry.name)}</b> · ${escape(file ?? id)}<br>${escape(entry.from)} · <a href="${escape(entry.credit.source)}">${escape(entry.credit.author || "fuente")}</a> · ${escape(entry.credit.license || "sin licencia")}</figcaption></figure>`;
  });
  writeFileSync(new URL("index.html", reviewDir), `<!doctype html><meta charset="utf-8"><title>Fotos para revisar</title><style>body{font:14px system-ui;margin:16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}img{width:100%;aspect-ratio:16/10;object-fit:cover;background:#ddd}</style>${cards.join("\n")}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
