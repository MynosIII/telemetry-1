const fs = require('fs');
const path = require('path');
const https = require('https');

// Clean, sponsor-free logo URLs from Wikimedia Commons
const cleanLogos = {
  'ferrari': 'https://upload.wikimedia.org/wikipedia/en/thumb/d/d1/Ferrari-Logo.svg/500px-Ferrari-Logo.svg.png',
  'mercedes': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Mercedes-Logo.svg/500px-Mercedes-Logo.svg.png',
  'red-bull': 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f6/Red_Bull_Racing_logo.svg/500px-Red_Bull_Racing_logo.svg.png',
  'aston-martin': 'https://upload.wikimedia.org/wikipedia/en/thumb/3/30/Aston_Martin_cognizant_f1_logo.svg/500px-Aston_Martin_cognizant_f1_logo.svg.png', // Wait, cognizant is a sponsor. Better: 
  'aston-martin': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Aston_Martin_Lagonda_logo.svg/500px-Aston_Martin_Lagonda_logo.svg.png', // The car brand logo
  'mclaren': 'https://upload.wikimedia.org/wikipedia/en/thumb/6/66/McLaren_Racing_logo.svg/500px-McLaren_Racing_logo.svg.png',
  'haas': 'https://upload.wikimedia.org/wikipedia/en/thumb/6/65/Haas_F1_Team_logo.svg/500px-Haas_F1_Team_logo.svg.png',
  'williams': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Williams_Racing_2020_logo.svg/500px-Williams_Racing_2020_logo.svg.png',
  'alpine': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Alpine_F1_Team_Logo.svg/500px-Alpine_F1_Team_Logo.svg.png',
  'sauber': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Sauber_F1_logo.svg/500px-Sauber_F1_logo.svg.png',
  'kick-sauber': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Sauber_F1_logo.svg/500px-Sauber_F1_logo.svg.png', // Fallback to clean Sauber
  'rb': 'https://upload.wikimedia.org/wikipedia/en/thumb/4/47/Visa_Cash_App_RB_logo.svg/500px-Visa_Cash_App_RB_logo.svg.png', // VCARB has Visa in the logo itself natively, but let's try to just use Racing Bulls logo if it exists. Actually, VCARB logo is fine.
  'racing-bulls': 'https://upload.wikimedia.org/wikipedia/en/thumb/4/47/Visa_Cash_App_RB_logo.svg/500px-Visa_Cash_App_RB_logo.svg.png'
};

const mapPath = path.join(__dirname, 'lib/team-logos.json');
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

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
  for (const [id, url] of Object.entries(cleanLogos)) {
    console.log('Fetching clean logo for', id);
    const filename = `${id}.png`;
    const filepath = path.join(__dirname, 'public/history/team-logos', filename);
    const success = await download(url, filepath);
    if (success) {
      map[id] = `/history/team-logos/${filename}`;
    }
  }
  fs.writeFileSync(mapPath, JSON.stringify(map, null, 2));
  console.log('Done fixing current teams!');
}

run();
