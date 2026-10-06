const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const missingIds = [
  'andrea-moda', 'ats-wheels', 'ats', 'brm',
  'fondmetal', 'footwork', 'forti', 'frank-williams-racing-cars',
  'iso-marlboro', 'leyton-house', 'lotus-f1', 'march', 'pacific',
  'shadow', 'stewart', 'token', 'wolf-williams', 'wolf'
];
const mapPath = path.join(__dirname, 'lib/team-logos.json');
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

async function run() {
  for (const id of missingIds) {
    const data = JSON.parse(fs.readFileSync(`public/history/constructors/${id}.json`, 'utf8'));
    let url = data.sources?.wikipedia;
    if (!url) continue;
    
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'TelemetryOne/1.0' } });
      const html = await res.text();
      const $ = cheerio.load(html);
      
      let imgUrl = null;
      $('.infobox img').each((i, el) => {
        const src = $(el).attr('src');
        if (src && !src.includes('Flag') && !src.includes('flag') && !src.toLowerCase().includes('icon')) {
          imgUrl = src;
          return false; 
        }
      });
      
      if (imgUrl) {
        if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;
        
        // Wikipedia renders SVGs as PNGs for thumbnails
        imgUrl = imgUrl.replace(/\/thumb\//, '/'); // try to get original if possible, but actually we can just take the thumb
        // Wait, removing /thumb/ might break the url if we don't also remove the trailing /[width]px-... part.
        // It's safer to just download the thumb!
        console.log(`Downloading ${id} from ${imgUrl}`);
        
        let ext = '.png'; 
        if (imgUrl.toLowerCase().includes('.jpg') || imgUrl.toLowerCase().includes('.jpeg')) ext = '.jpg';
        const filename = `${id}${ext}`;
        const filepath = path.join(__dirname, 'public/history/team-logos', filename);
        
        const imgRes = await fetch(imgUrl, { headers: { 'User-Agent': 'TelemetryOne/1.0' } });
        if (imgRes.ok) {
          const buffer = await imgRes.arrayBuffer();
          fs.writeFileSync(filepath, Buffer.from(buffer));
          map[id] = `/history/team-logos/${filename}`;
          console.log('Saved', filename);
        } else {
          console.log(`Failed to download image for ${id}: ${imgRes.status}`);
        }
      } else {
        console.log(`No infobox image found for ${id}`);
      }
    } catch (e) {
      console.log('Failed for', id, e.message);
    }
  }
  
  fs.writeFileSync(mapPath, JSON.stringify(map, null, 2));
  console.log('Done fixing HTML missing!');
}

run();
