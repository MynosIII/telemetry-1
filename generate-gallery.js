const fs = require('fs');
const path = require('path');

const constructorsDir = path.join(__dirname, 'public/history/constructors');
const files = fs.readdirSync(constructorsDir).filter(f => f.endsWith('.json'));
const mapPath = path.join(__dirname, 'lib/team-logos.json');
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

let html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Galería de Escuderías Históricas</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #111;
      color: #eee;
      margin: 0;
      padding: 20px;
    }
    h1 {
      text-align: center;
      margin-bottom: 40px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .card {
      background: #222;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 200px;
    }
    .card img {
      max-width: 150px;
      max-height: 100px;
      object-fit: contain;
      margin-bottom: 15px;
      background: #fff;
      padding: 10px;
      border-radius: 4px;
    }
    .card.missing img {
      opacity: 0.2;
    }
    .name {
      font-weight: bold;
      font-size: 1.1rem;
      margin-bottom: 5px;
    }
    .stats {
      font-size: 0.9rem;
      color: #ccc;
    }
  </style>
</head>
<body>
  <h1>Galería de Escuderías Históricas</h1>
  <div class="grid">
`;

const teams = [];
for (const file of files) {
  const data = JSON.parse(fs.readFileSync(path.join(constructorsDir, file), 'utf8'));
  teams.push(data);
}

teams.sort((a, b) => a.name.localeCompare(b.name));

for (const team of teams) {
  const logoUrl = map[team.id];
  const isMissing = !logoUrl;
  const imgSrc = logoUrl || '/history/team-logos-white/ferrari.webp'; // Fallback just for display placeholder if needed
  
  html += `
    <div class="card ${isMissing ? 'missing' : ''}">
      ${isMissing ? '<span>❌ Sin Logo</span>' : `<img src="${imgSrc}" alt="Logo de ${team.name}" loading="lazy" />`}
      <div class="name">${team.name}</div>
      <div class="stats">${team.stats?.races || 0} Carreras</div>
    </div>
  `;
}

html += `
  </div>
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, 'public/history/constructors-gallery.html'), html);
console.log('Generated gallery!');
