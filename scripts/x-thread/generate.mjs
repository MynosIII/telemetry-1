/**
 * Writes the next X thread and its article from the site's own data.
 *
 *   node scripts/x-thread/generate.mjs            # only when the last thread is two or more days old
 *   node scripts/x-thread/generate.mjs --force    # write one now
 *   node scripts/x-thread/generate.mjs --dry      # print it, write nothing
 *   node scripts/x-thread/generate.mjs --date 2026-11-21 --every 2
 *
 * Output: data/articles/<slug>.json, public/articles/diagrams/<slug>.svg and data/x-threads/<slug>.json.
 * Then run `npm run build:articles`, which also rebuilds data/x-threads-index.json.
 * The site (/api/x/hilos) sends the thread to the phone for review and posts it to X later.
 */
import fs from 'node:fs';
import path from 'node:path';
import { raceStory, driverStory, winnerOdds } from './stories.mjs';

const args = process.argv.slice(2);
const flag = name => args.includes(`--${name}`);
const option = (name, fallback) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : fallback; };
const today = option('date', new Date().toISOString().slice(0, 10));
const every = Number(option('every', process.env.X_THREAD_EVERY_DAYS ?? 2));

const THREADS = 'data/x-threads';
fs.mkdirSync(THREADS, { recursive: true });
const previous = fs.readdirSync(THREADS).filter(f => f.endsWith('.json'))
  .map(f => JSON.parse(fs.readFileSync(path.join(THREADS, f), 'utf8')))
  .sort((a, b) => a.createdOn.localeCompare(b.createdOn));
const last = previous.at(-1);
const daysSince = last ? (Date.parse(today) - Date.parse(last.createdOn)) / 86_400_000 : Infinity;
if (!flag('force') && daysSince < every) {
  console.log(`No toca: el último hilo es del ${last.createdOn} (cada ${every} días).`);
  process.exit(0);
}
const used = new Set(previous.map(t => t.topic));

/** A race whose anniversary (10, 20, 25, 30... years) falls today or tomorrow. */
function anniversary(odds) {
  const days = [0, 1].map(n => new Date(Date.parse(today) + n * 86_400_000).toISOString().slice(5, 10));
  const year = Number(today.slice(0, 4));
  const candidates = odds.filter(o => days.includes(o.date.slice(5)))
    .map(o => ({ ...o, years: year - o.year }))
    .filter(o => o.years >= 10 && (o.years % 10 === 0 || o.years % 25 === 0) && !used.has(`race:${o.id}`));
  // Rounder anniversaries first, then the more surprising win.
  const weight = o => (o.years % 50 === 0 ? 3 : o.years % 25 === 0 ? 2 : 1);
  return candidates.sort((a, b) => weight(b) - weight(a) || a.xw - b.xw)[0];
}

function pick() {
  const odds = winnerOdds();
  const party = anniversary(odds);
  if (party) return { topic: `race:${party.id}`, build: () => raceStory(party.id, { anniversary: party.years }) };
  // Otherwise alternate: an unlikely win, then a driver who won more (or less) than his cars allowed.
  const kinds = previous.filter(t => !t.anniversary).map(t => t.topic.split(':')[0]);
  const next = kinds.at(-1) === 'race' ? 'driver' : 'race';
  if (next === 'race') {
    const race = odds.find(o => !used.has(`race:${o.id}`));
    return { topic: `race:${race.id}`, build: () => raceStory(race.id, {}) };
  }
  const ratings = JSON.parse(fs.readFileSync('lib/elo-ratings.json', 'utf8'));
  const drivers = Object.entries(ratings)
    .filter(([id, r]) => r.observedWins >= 5 && fs.existsSync(`public/history/drivers/${id}.json`) && !used.has(`driver:${id}`));
  // Take the biggest gap left, alternating above and below expectation.
  const wantAbove = previous.filter(t => t.topic.startsWith('driver:')).at(-1)?.above !== true;
  const side = drivers.filter(([, r]) => wantAbove ? r.winsAboveExpected > 0 : r.winsAboveExpected < 0);
  const pool = side.length ? side : drivers;
  const [id] = pool.sort((a, b) => Math.abs(b[1].winsAboveExpected) - Math.abs(a[1].winsAboveExpected))[0];
  return { topic: `driver:${id}`, build: () => driverStory(id) };
}

const choice = pick();
const story = choice.build();
const slug = story.slug;
const article = {
  slug,
  title: story.title,
  description: story.description,
  category: 'Los números',
  period: story.period,
  year: story.year,
  kind: 'history',
  reviewedOn: today,
  publishedOn: today,
  generatedBy: 'x-thread',
  tags: story.tags,
  lead: story.lead,
  sections: story.sections.map(s => ({ ...s, sourceIds: s.sourceIds.filter(id => story.sources.some(src => src.id === id)), diagram: s.diagram && { url: `/articles/diagrams/${slug}.svg`, alt: s.diagram.alt, caption: s.diagram.caption, height: s.diagram.height } })),
  sources: story.sources,
  related: story.related,
  ...(story.homePhoto ? { homePhoto: story.homePhoto } : {})
};
const thread = {
  slug,
  topic: choice.topic,
  createdOn: today,
  ...(story.anniversary ? { anniversary: story.anniversary } : {}),
  ...(story.above !== undefined ? { above: story.above } : {}),
  tweets: story.tweets
};

for (const [i, tweet] of thread.tweets.entries()) {
  const length = [...tweet.replace(/https?:\/\/\S+/g, 'x'.repeat(23))].length;
  if (length > 280) throw new Error(`Tweet ${i + 1} is ${length} characters: ${tweet}`);
}

if (flag('dry')) {
  console.log(JSON.stringify({ article: { ...article, sections: article.sections.map(s => ({ title: s.title, paragraphs: s.paragraphs })) }, thread }, null, 2));
  process.exit(0);
}
if (fs.existsSync(`data/articles/${slug}.json`)) throw new Error(`Article ${slug} already exists`);
fs.writeFileSync(`data/articles/${slug}.json`, `${JSON.stringify(article, null, 2)}\n`);
const diagram = story.sections.find(s => s.diagram)?.diagram;
if (diagram) fs.writeFileSync(`public/articles/diagrams/${slug}.svg`, diagram.svg);
fs.writeFileSync(path.join(THREADS, `${slug}.json`), `${JSON.stringify(thread, null, 2)}\n`);
console.log(`Hilo y artículo: ${slug} (${choice.topic}, ${thread.tweets.length} tuits).`);
