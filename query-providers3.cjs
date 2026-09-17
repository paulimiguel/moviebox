const https = require('https');
const fs = require('fs');

const env = fs.readFileSync('backend/.env', 'utf-8');
const token = env.match(/TMDB_API_TOKEN="(.*)"/)[1];

https.get('https://api.themoviedb.org/3/watch/providers/movie?language=es-AR&watch_region=AR', {
  headers: { Authorization: "Bearer " + token }
}, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const json = JSON.parse(data);
    const providers = json.results || [];
    ['JustWatch', 'Max', 'HBO', 'Flow', 'Paramount', 'Claro', 'Stremio', 'MUBI', 'Crunchyroll', 'Pluto', 'Star'].forEach(name => {
      const p = providers.filter(x => x.provider_name.toLowerCase().includes(name.toLowerCase()));
      console.log(name, p.map(x => ({ id: x.provider_id, name: x.provider_name })));
    });
  });
});

