const fs = require('fs');
const path = require('path');
const https = require('https');

const mapPath = path.join(__dirname, 'lib/team-logos.json');
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

const fixUrls = {
  'veritas': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Veritas_logo.png/500px-Veritas_logo.png',
  'venturi': 'https://upload.wikimedia.org/wikipedia/en/thumb/0/07/Venturi_Automobiles_logo.svg/500px-Venturi_Automobiles_logo.svg.png',
  'toleman': 'https://upload.wikimedia.org/wikipedia/en/2/29/Toleman_logo.png',
  'spirit': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Spirit_Racing_Logo.png/500px-Spirit_Racing_Logo.png' // Just guessing if it exists, if not it will 404
};

const toRemove = [
  'rebaque', 'snowberger', 'scirocco', 'tec-mec'
];

async function download(url, filepath) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'TelemetryOne-F1-Bot/1.0' } }, (res) => {
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
  for (const id of toRemove) {
     if (map[id]) {
        console.log('Removing bad mapping for', id);
        delete map[id];
     }
  }

  for (const [id, url] of Object.entries(fixUrls)) {
    console.log('Fetching fixed logo for', id);
    const filename = `${id}.png`;
    const filepath = path.join(__dirname, 'public/history/team-logos', filename);
    const success = await download(url, filepath);
    if (success) {
      map[id] = `/history/team-logos/${filename}`;
    } else {
      console.log('Failed to fetch', id, 'removing mapping');
      delete map[id];
    }
  }
  
  fs.writeFileSync(mapPath, JSON.stringify(map, null, 2));
  console.log('Done fixing bad logos!');
}

run();
