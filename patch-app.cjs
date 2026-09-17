const fs = require('fs');

const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf-8');

// Add import
content = content.replace(
  "import { NewsPage } from '@/pages/NewsPage';",
  "import { NewsPage } from '@/pages/NewsPage';\nimport { PlatformNewsPage } from '@/pages/PlatformNewsPage';"
);

// Add Route
content = content.replace(
  '<Route path="/novedades" element={<NewsPage />} />',
  '<Route path="/novedades" element={<NewsPage />} />\n      <Route path="/novedades/:platformId" element={<PlatformNewsPage />} />'
);

fs.writeFileSync(path, content, 'utf-8');
console.log('Patched App.tsx');
