const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');

const mapPath = path.join(__dirname, 'lib/team-logos.json');
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

const targets = [
  { id: 'brm', q: 'British Racing Motors logo wikipedia' },
  { id: 'wolf', q: 'Walter Wolf Racing logo wikipedia' },
  { id: 'leyton-house', q: 'Leyton House Racing logo wikipedia' },
  { id: 'fondmetal', q: 'Fondmetal logo wikipedia' },
  { id: 'ats', q: 'Auto Technisches Spezialzubehör logo wikipedia' },
  { id: 'march', q: 'March Engineering logo wikipedia' },
  { id: 'pacific', q: 'Pacific Racing logo wikipedia' },
  { id: 'footwork', q: 'Footwork Arrows logo wikipedia' },
  { id: 'stewart', q: 'Stewart Grand Prix logo wikipedia' }
];

async function run() {
  const browser = await chromium.launch({ headless: false }); 
  const context = await browser.newContext();
  const page = await context.newPage();

  for (const t of targets) {
     if (map[t.id]) continue;

     console.log('Searching for:', t.q);
     await page.goto(`https://duckduckgo.com/?q=${encodeURIComponent(t.q)}&t=h_&iax=images&ia=images`);
     await page.waitForTimeout(2000);

     const imgSrc = await page.evaluate(() => {
        const img = document.querySelector('img.tile--img__img');
        return img ? (img.src || img.getAttribute('data-src')) : null;
     });

     if (imgSrc) {
        console.log(`Found image for ${t.id}: ${imgSrc}`);
        // We'll just save the DDG proxied image
        let ext = '.jpg';
        if (imgSrc.includes('png')) ext = '.png';
        const filepath = path.join(__dirname, 'public/history/team-logos', `${t.id}${ext}`);
        
        let url = imgSrc.startsWith('//') ? 'https:' + imgSrc : imgSrc;
        
        await new Promise((resolve) => {
          https.get(url, (res) => {
             const file = fs.createWriteStream(filepath);
             res.pipe(file);
             file.on('finish', () => { file.close(); resolve(); });
          });
        });

        map[t.id] = `/history/team-logos/${t.id}${ext}`;
        fs.writeFileSync(mapPath, JSON.stringify(map, null, 2));
     } else {
        console.log(`No image found for ${t.id}`);
     }
  }

  await browser.close();
  require('child_process').execSync('node generate-gallery.js');
}

run();
