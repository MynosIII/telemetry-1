const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');

const missingIds = JSON.parse(fs.readFileSync('missing-logos.json', 'utf8'));
const mapPath = path.join(__dirname, 'lib/team-logos.json');
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function download(url, filepath) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 200 || res.statusCode === 301 || res.statusCode === 302) {
         if (res.statusCode === 301 || res.statusCode === 302) {
             download(res.headers.location, filepath).then(resolve);
             return;
         }
        const fileStream = fs.createWriteStream(filepath);
        res.pipe(fileStream);
        fileStream.on('finish', () => { fileStream.close(); resolve(true); });
      } else {
        resolve(false);
      }
    }).on('error', () => resolve(false));
  });
}

async function run() {
  console.log('Starting Playwright...');
  const browser = await chromium.launch({ headless: false }); 
  const context = await browser.newContext();
  const page = await context.newPage();

  let count = 0;
  for (const id of missingIds) {
    if (map[id]) continue;
    
    const data = JSON.parse(fs.readFileSync(`public/history/constructors/${id}.json`, 'utf8'));
    let query = `${data.name} F1 team logo`;
    
    console.log(`Searching DDG Images for: ${query}`);
    
    try {
      await page.goto(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&t=h_&iax=images&ia=images`, { waitUntil: 'domcontentloaded' });
      await sleep(2000);
      
      const imgSrc = await page.evaluate(() => {
        // DDG images usually have class 'tile--img__img'
        const img = document.querySelector('img.tile--img__img');
        return img ? (img.src || img.getAttribute('data-src')) : null;
      });

      if (imgSrc) {
        console.log(`Found image for ${id}`);
        // DDG image sources are often external URLs proxied via DDG
        // So we can just download it directly
        const filename = `${id}.png`;
        const filepath = path.join(__dirname, 'public/history/team-logos', filename);
        
        let targetUrl = imgSrc;
        if (targetUrl.startsWith('//')) targetUrl = 'https:' + targetUrl;
        
        const success = await download(targetUrl, filepath);
        if (success) {
          map[id] = `/history/team-logos/${filename}`;
          fs.writeFileSync(mapPath, JSON.stringify(map, null, 2));
        }
      } else {
        console.log(`No image found for ${id}`);
      }
    } catch (e) {
      console.log(`Error on ${id}: ${e.message}`);
    }
    
    count++;
    if (count % 20 === 0) await sleep(2000);
  }

  await browser.close();
  console.log('Finished scraping DDG Images!');
  
  require('child_process').execSync('node generate-gallery.js');
}

run();
