const fs = require('fs');
const path = require('path');

const mapPath = path.join(__dirname, 'lib/team-logos.json');
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

const titles = {
  'veritas': 'File:Veritas_logo.png',
  'venturi': 'File:Venturi_Automobiles_logo.svg',
  'toleman': 'File:Toleman_logo.png'
};

async function run() {
  for (const [id, fileTitle] of Object.entries(titles)) {
    console.log('Fetching', id, fileTitle);
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url&titles=${encodeURIComponent(fileTitle)}&format=json`;
    
    try {
      const res = await fetch(searchUrl, { headers: { 'User-Agent': 'TelemetryOne-F1-Bot/1.0' } });
      const json = await res.json();
      const pages = json.query?.pages;
      if (!pages) continue;
      
      const page = Object.values(pages)[0];
      const imgUrl = page.imageinfo?.[0]?.url;
      
      if (imgUrl) {
        console.log(`Downloading ${id} from ${imgUrl}`);
        let ext = '.png'; 
        if (imgUrl.toLowerCase().includes('.svg')) ext = '.svg';
        const filename = `${id}${ext}`;
        const filepath = path.join(__dirname, 'public/history/team-logos', filename);
        
        const imgRes = await fetch(imgUrl, { headers: { 'User-Agent': 'TelemetryOne-F1-Bot/1.0' } });
        if (imgRes.ok) {
          const buffer = await imgRes.arrayBuffer();
          fs.writeFileSync(filepath, Buffer.from(buffer));
          map[id] = `/history/team-logos/${filename}`;
          console.log('Saved', filename);
        } else {
           console.log('failed HTTP status', imgRes.status);
        }
      } else {
        console.log('No URL found in API for', id);
      }
    } catch (e) {
      console.log('Failed for', id, e.message);
    }
  }
  
  fs.writeFileSync(mapPath, JSON.stringify(map, null, 2));
  console.log('Done resolving images via API!');
}

run();
