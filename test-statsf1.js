const fs = require('fs');

async function run() {
  const res = await fetch('https://www.statsf1.com/en/ferrari.aspx');
  const html = await res.text();
  const matches = html.match(/<img[^>]+src="([^"]+)"/ig);
  if (matches) {
     const logos = matches.filter(m => m.toLowerCase().includes('logo') || m.toLowerCase().includes('constructeur') || m.toLowerCase().includes('ferrari'));
     console.log(logos);
  }
}
run();
