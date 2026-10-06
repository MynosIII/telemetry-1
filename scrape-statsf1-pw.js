const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');

const missing = JSON.parse(fs.readFileSync('missing-logos.json', 'utf8'));
const mapPath = 'lib/team-logos.json';
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

async function downloadImage(url, filepath) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 200) {
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
  const browser = await chromium.launch({ headless: false }); // User requested non-headless
  const page = await browser.newPage();
  
  for (const id of missing) {
    const data = JSON.parse(fs.readFileSync(`public/history/constructors/${id}.json`, 'utf8'));
    const url = data.sources?.statsf1;
    if (!url) continue;

    console.log(`Navigating to ${url} for ${id}...`);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      
      // Look for the logo image. StatsF1 usually puts it in an img inside a div.
      // Often it's <img id="ctl00_CPH_Main_imgConstructeur" ...> or similar, or just containing the team name in the src
      const imgSrc = await page.evaluate(() => {
        // Try known IDs or classes
        const exact = document.querySelector('img[id*="imgConstructeur"]');
        if (exact) return exact.src;
        
        // Find any image that looks like a logo
        const imgs = Array.from(document.querySelectorAll('img'));
        for (const img of imgs) {
          const src = img.src.toLowerCase();
          // Typically statsf1 stores them in /constructeur/ or /logo/ 
          if (src.includes('constructeur') && !src.includes('flag')) {
            return img.src;
          }
        }
        return null;
      });

      if (imgSrc) {
        console.log(`Found logo for ${id}: ${imgSrc}`);
        const extMatch = imgSrc.match(/\.(png|jpg|jpeg|gif|webp)/i);
        const ext = extMatch ? extMatch[0].toLowerCase() : '.jpg';
        const filename = `${id}${ext}`;
        const filepath = path.join(__dirname, 'public/history/team-logos', filename);
        
        // Sometimes direct download fails due to cookies, let's use the browser to download or fetch
        // But let's try direct first
        const success = await downloadImage(imgSrc, filepath);
        if (success) {
          map[id] = `/history/team-logos/${filename}`;
        }
      } else {
        console.log(`No logo found on page for ${id}`);
      }
    } catch (err) {
      console.log(`Error processing ${id}: ${err.message}`);
    }
  }

  await browser.close();
  fs.writeFileSync(mapPath, JSON.stringify(map, null, 2));
  console.log('Finished StatsF1 scraping!');
}

run();
