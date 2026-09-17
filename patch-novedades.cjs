const fs = require('fs');

// 1. Update backend tmdb.ts
const tmdbPath = 'backend/src/routes/tmdb.ts';
let tmdbContent = fs.readFileSync(tmdbPath, 'utf-8');
tmdbContent = tmdbContent.replace(
  "const providerId = platform === 'prime' ? 119 : platform === 'apple' ? 350 : 8;",
  "const providerId = platform === 'prime' ? 119 : platform === 'apple' ? 350 : platform === 'disney' ? 337 : 8;"
);
fs.writeFileSync(tmdbPath, tmdbContent, 'utf-8');
console.log('Patched tmdb.ts');

// 2. Update NewsPage.tsx
const newsPath = 'src/pages/NewsPage.tsx';
let newsContent = fs.readFileSync(newsPath, 'utf-8');

// Add hideActiveFilters
newsContent = newsContent.replace(
  '        <MovieLibraryToolbar',
  '        <MovieLibraryToolbar hideActiveFilters'
);

// Add disney to PLATFORMS
newsContent = newsContent.replace(
  "{ id: 'justwatch', name: 'JustWatch' }",
  "{ id: 'justwatch', name: 'JustWatch' },\n    { id: 'disney', name: 'Disney+' }"
);

// Change badge size
// From: text-[9px] px-2 py-1
// To: text-[9px] px-1.5 py-0.5
// Looking at NewsPage.tsx: className={`absolute left-2 top-2 rounded px-2 py-1 text-[9px] font-semibold uppercase text-white shadow-sm ${candidate.type === 'series' ? 'bg-aqua' : 'bg-coral'}`}
const searchBadge = `rounded px-2 py-1 text-[9px] font-semibold uppercase text-white shadow-sm`;
const replaceBadge = `rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white shadow-sm`;
newsContent = newsContent.replace(searchBadge, replaceBadge);

fs.writeFileSync(newsPath, newsContent, 'utf-8');
console.log('Patched NewsPage.tsx');

