import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const directory=path.resolve('data/articles');
const records=fs.readdirSync(directory).filter(file=>file.endsWith('.json')).sort().map(file=>JSON.parse(fs.readFileSync(path.join(directory,file),'utf8')));
const index=JSON.parse(fs.readFileSync('data/articles-index.json','utf8'));
assert.deepEqual(index,records,'Run npm run build:articles after editing an article.');
assert(records.length>=9,'Initial collection needs at least nine complete articles.');
const unique=new Set();
const coverage=JSON.parse(fs.readFileSync('data/articles-guide-coverage.json','utf8'));
const photos=JSON.parse(fs.readFileSync('data/article-photo-provenance.json','utf8'));
const photoSlugs=new Set();
for(const photo of photos) {
  assert(!photoSlugs.has(photo.slug),`Duplicate photograph provenance: ${photo.slug}`);photoSlugs.add(photo.slug);
  const article=records.find(record=>record.slug===photo.slug);
  assert(article?.image,`Photograph without an article: ${photo.slug}`);
  assert.equal(photo.file,`public${article.image.url}`,`${photo.slug}: photograph path mismatch`);
  assert(photo.file.startsWith('public/articles/photos/')&&!photo.file.includes('..'),`${photo.slug}: invalid photograph path`);
  assert(fs.existsSync(photo.file),`${photo.slug}: missing photograph`);
  assert.equal(createHash('sha256').update(fs.readFileSync(photo.file)).digest('hex'),photo.sha256,`${photo.slug}: photograph changed from the reviewed source`);
  assert(new URL(photo.page).hostname==='commons.wikimedia.org',`${photo.slug}: missing original archive page`);
  assert(new URL(photo.originalUrl).protocol==='https:',`${photo.slug}: missing original image provenance`);
  assert(photo.width>0&&photo.height>0,`${photo.slug}: missing image dimensions`);
  assert(/^(CC BY|CC0|Public domain)/.test(photo.license),`${photo.slug}: unreviewed license`);
  for(const key of ['page','author','license','licenseUrl'])assert.equal(photo[key],article.image[key],`${photo.slug}: credit differs from provenance`);
}
for(const entry of coverage.entries)for(const slug of entry.slugs)assert(records.some(record=>record.slug===slug),`Missing guide topic ${entry.label}: ${slug}`);
for(const article of records) {
  const prefix=article.slug;
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(prefix),`Invalid slug: ${prefix}`);
  assert(!unique.has(prefix),`Duplicate article: ${prefix}`);unique.add(prefix);
  for(const key of ['title','description','category','period','lead'])assert(typeof article[key]==='string'&&article[key].trim(),`${prefix}: missing ${key}`);
  assert(/[.!?…]$/.test(article.description.trim()),`${prefix}: unfinished card description`);
  assert(['Los orígenes','Autos de leyenda','Automovilismo argentino','Revoluciones técnicas','Ideas que cambiaron la F1'].includes(article.category),`${prefix}: unexpected category`);
  assert(Number.isInteger(article.year)&&article.year>=1800&&article.year<=2026,`${prefix}: missing/invalid chronological year`);
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
  assert(words>=500,`${prefix}: article too brief (${words} words)`);
  for(const link of article.related) {
    assert(link.label&&link.href.startsWith('/'),`${prefix}: invalid archive link`);
    const editorial=link.href.match(/^\/articulos\/([^/#?]+)$/);
    if(editorial)assert(records.some(record=>record.slug===editorial[1]),`${prefix}: missing related article ${link.href}`);
    const entity=link.href.match(/^\/historia\/([^/]+)\/([^/#?]+)$/);
    if(entity&&!['autos','carreras'].includes(entity[1]))assert(fs.existsSync(`public/history/${entity[1]}/${entity[2]}.json`),`${prefix}: missing archive entity ${link.href}`);
  }
  if(article.image) {
    for(const key of ['url','page','author','license','caption','alt'])assert(article.image[key],`${prefix}: incomplete image credit`);
    if(article.image.url.startsWith('/articles/photos/'))assert(photoSlugs.has(prefix),`${prefix}: local photo without provenance`);
  }
  console.log(`${prefix}: ${words} words · ${article.sources.length} sources`);
}
console.log(`Verified ${records.length} sourced editorial articles and their index.`);
