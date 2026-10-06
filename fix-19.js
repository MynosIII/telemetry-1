const fs = require('fs');
const path = require('path');

const missingIds = [
  'amon', 'andrea-moda', 'ats-wheels', 'ats', 'brm',
  'fondmetal', 'footwork', 'forti', 'frank-williams-racing-cars',
  'iso-marlboro', 'leyton-house', 'lotus-f1', 'march', 'pacific',
  'shadow', 'stewart', 'token', 'wolf-williams', 'wolf'
];
const mapPath = path.join(__dirname, 'lib/team-logos.json');
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

async function run() {
  for (const id of missingIds) {
    const data = JSON.parse(fs.readFileSync(`public/history/constructors/${id}.json`, 'utf8'));
    let title = data.sources?.wikipediaTitle || data.name;
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages|images&titles=${encodeURIComponent(title)}&pithumbsize=500&format=json`;
    
    try {
      const res = await fetch(searchUrl, { headers: { 'User-Agent': 'TelemetryOne/1.0' } });
      const json = await res.json();
      const pages = json.query?.pages;
      if (!pages) continue;
      const page = Object.values(pages)[0];
      let imgUrl = page.thumbnail?.source;
      
      if (imgUrl) {
        console.log(`Downloading ${id} from ${imgUrl}`);
        // Ensure no .svg extension since it's a rendered thumbnail from Wikipedia (usually .png)
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
        }
      }
    } catch (e) {
      console.log('Failed for', id, e.message);
    }
  }
  
  fs.writeFileSync(mapPath, JSON.stringify(map, null, 2));
  console.log('Done downloading 19 files!');
}

run();
