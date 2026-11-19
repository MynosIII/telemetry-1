import fs from 'node:fs';
import path from 'node:path';

// One source file per article lets collaborators write without editing the same index.
const directory = path.resolve('data/articles');
const articles = fs.readdirSync(directory).filter(file => file.endsWith('.json')).sort()
  .map(file => JSON.parse(fs.readFileSync(path.join(directory,file),'utf8')));
fs.writeFileSync('data/articles-index.json',`${JSON.stringify(articles,null,2)}\n`);
console.log(`Article index: ${articles.length} source-backed stories.`);

// X threads written with their article (scripts/x-thread/generate.mjs); the site posts them from this index.
const threadDirectory = path.resolve('data/x-threads');
const threads = fs.existsSync(threadDirectory) ? fs.readdirSync(threadDirectory).filter(file => file.endsWith('.json')).sort()
  .map(file => JSON.parse(fs.readFileSync(path.join(threadDirectory,file),'utf8'))) : [];
fs.writeFileSync('data/x-threads-index.json',`${JSON.stringify(threads,null,2)}\n`);
console.log(`X threads: ${threads.length}.`);
