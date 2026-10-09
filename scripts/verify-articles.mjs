import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const directory=path.resolve('data/articles');
const records=fs.readdirSync(directory).filter(file=>file.endsWith('.json')).sort().map(file=>JSON.parse(fs.readFileSync(path.join(directory,file),'utf8')));
const index=JSON.parse(fs.readFileSync('data/articles-index.json','utf8'));
assert.deepEqual(index,records,'Run npm run build:articles after editing an article.');
assert(records.length>=9,'Initial collection needs at least nine complete articles.');
const unique=new Set();
for(const article of records) {
  const prefix=article.slug;
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(prefix),`Invalid slug: ${prefix}`);
  assert(!unique.has(prefix),`Duplicate article: ${prefix}`);unique.add(prefix);
  for(const key of ['title','description','category','period','lead'])assert(typeof article[key]==='string'&&article[key].trim(),`${prefix}: missing ${key}`);
  assert(['Los orígenes','Revoluciones técnicas','Ideas que cambiaron la F1'].includes(article.category),`${prefix}: unexpected category`);
  assert(article.sections.length>=4,`${prefix}: incomplete chapters`);
  assert(article.sources.length>=3,`${prefix}: insufficient sources`);
  const ids=new Set(article.sources.map(source=>source.id));
  assert.equal(ids.size,article.sources.length,`${prefix}: duplicate source ID`);
  for(const source of article.sources)assert(source.title&&new URL(source.url).protocol==='https:',`${prefix}: invalid source`);
  const sectionIds=new Set();
  for(const section of article.sections) {
    assert(/^[a-z0-9-]+$/.test(section.id)&&!sectionIds.has(section.id),`${prefix}: invalid/duplicate section`);sectionIds.add(section.id);
    assert(section.title&&section.paragraphs.length&&section.paragraphs.every(p=>typeof p==='string'&&p.length>30),`${prefix}: incomplete prose`);
    assert(section.sourceIds.length&&section.sourceIds.every(id=>ids.has(id)),`${prefix}: broken source reference`);
  }
  const words=[article.lead,...article.sections.flatMap(section=>section.paragraphs)].join(' ').split(/\s+/).length;
  assert(words>=600,`${prefix}: article too brief (${words} words)`);
  for(const link of article.related) {
    assert(link.label&&link.href.startsWith('/'),`${prefix}: invalid archive link`);
    const editorial=link.href.match(/^\/articulos\/([^/#?]+)$/);
    if(editorial)assert(records.some(record=>record.slug===editorial[1]),`${prefix}: missing related article ${link.href}`);
    const entity=link.href.match(/^\/historia\/([^/]+)\/([^/#?]+)$/);
    if(entity&&!['autos','carreras'].includes(entity[1]))assert(fs.existsSync(`public/history/${entity[1]}/${entity[2]}.json`),`${prefix}: missing archive entity ${link.href}`);
  }
  if(article.image)for(const key of ['url','page','author','license','caption','alt'])assert(article.image[key],`${prefix}: incomplete image credit`);
  console.log(`${prefix}: ${words} words · ${article.sources.length} sources`);
}
console.log(`Verified ${records.length} sourced editorial articles and their index.`);
