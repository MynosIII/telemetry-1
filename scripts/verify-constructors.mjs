import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=path=>JSON.parse(fs.readFileSync(path,'utf8'));
const articles=read('data/constructor-articles.json');
const photos=read('data/constructor-photos.json');
const logos=read('lib/team-logos.json');
const logoSources=read('data/constructor-logo-sources.json');
const ids=fs.readdirSync('public/history/constructors').filter(f=>f.endsWith('.json')).map(f=>f.slice(0,-5));
assert.equal(Object.keys(articles).length,ids.length);
for(const id of ids){const article=articles[id];assert.ok(article,`Missing article: ${id}`);assert.ok(article.chapters.length>=2);assert.ok(article.sources.length,`Missing sources: ${id}`);for(const chapter of article.chapters)assert.ok(chapter.paragraphs.every(p=>p.length>80));}
for(const [id,images]of Object.entries(photos)){assert.ok(articles[id]);for(const image of images){assert.ok(image.author&&image.caption&&image.alt);assert.match(image.license,/CC BY|Public domain|CC0/i);assert.match(image.page,/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);}}
for(const [id,source]of Object.entries(logoSources)){assert.ok(fs.existsSync(`public${logos[id]}`),`Missing asset: ${id}`);assert.match(source.source,/^https:\/\/(commons\.wikimedia|en\.wikipedia)\.org\//);assert.equal(source.asset,logos[id]);}
for(const id of ['balsa','krakau','mcguire','deidt','lec','rebaque','shadow','snowberger','spirit'])assert.equal(logos[id],undefined,`Unrelated photo remains registered as logo: ${id}`);
console.log(`Verified ${ids.length} constructor articles, ${Object.keys(photos).length} illustrated articles, ${Object.keys(logoSources).length} sourced emblems.`);
