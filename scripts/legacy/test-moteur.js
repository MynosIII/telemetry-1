const fs = require('fs');
fetch('https://www.statsf1.com/en/moteur-brm.aspx').then(r => r.text()).then(html => {
  const matches = html.match(/<img[^>]+src="([^"]+)"/ig);
  console.log(matches);
});
