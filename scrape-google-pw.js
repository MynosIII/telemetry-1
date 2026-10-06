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
    if (url.startsWith('data:image')) {
       const matches = url.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
       if (!matches || matches.length !== 3) return resolve(false);
       const buffer = Buffer.from(matches[2], 'base64');
       fs.writeFile(filepath, buffer, (err) => resolve(!err));
       return;
    }
    
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

  // Try to reject/accept cookies once
  await page.goto('https://www.google.com/imghp');
  await sleep(2000);
  try {
     const buttons = await page.$$('button');
     for (const btn of buttons) {
        const text = await btn.textContent();
        if (text.toLowerCase().includes('aceptar') || text.toLowerCase().includes('rechazar')) {
           await btn.click();
           await sleep(1000);
           break;
        }
     }
  } catch (e) {}

  let count = 0;
  for (const id of missingIds) {
    if (map[id]) continue;
    
    const data = JSON.parse(fs.readFileSync(`public/history/constructors/${id}.json`, 'utf8'));
    let query = `${data.name} F1 logo`;
    if (id === 'brm') query = 'BRM Formula 1 team logo'; // explicitly help BRM
    if (id === 'ats') query = 'ATS Formula 1 team logo';
    
    console.log(`Searching Google Images for: ${query}`);
    
    try {
      await page.goto(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded' });
      await sleep(1500);
      
      const imgSrc = await page.evaluate(() => {
        // Find the first image in the grid that looks like a search result
        // Usually they have a specific class, or they are data base64.
        const imgs = Array.from(document.querySelectorAll('img')).filter(img => {
           return img.width > 50 && img.height > 50 && img.src.length > 500 && img.src.startsWith('data:image');
        });
        return imgs.length > 0 ? imgs[0].src : null;
      });

      if (imgSrc) {
        console.log(`Found image for ${id}`);
        const filename = `${id}.png`;
        const filepath = path.join(__dirname, 'public/history/team-logos', filename);
        
        const success = await download(imgSrc, filepath);
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
    if (count % 15 === 0) await sleep(2000);
  }

  await browser.close();
  console.log('Finished scraping Google Images!');
  
  // Also regenerate gallery at the end
  require('child_process').execSync('node generate-gallery.js');
}

run();
