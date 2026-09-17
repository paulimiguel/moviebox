const fs = require('fs');

const path = 'backend/src/routes/tmdb.ts';
let content = fs.readFileSync(path, 'utf-8');

content = content.replace(
  "const providerQuery = (platform === 'justwatch' || platform === 'stremio') ? '' : `${providerQuery}`;",
  "const providerQuery = (platform === 'justwatch' || platform === 'stremio') ? '' : `&with_watch_providers=${providerId}&watch_region=AR`;"
);

fs.writeFileSync(path, content, 'utf-8');
