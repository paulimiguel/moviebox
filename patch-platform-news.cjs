const fs = require('fs');
const path = 'src/pages/PlatformNewsPage.tsx';
let content = fs.readFileSync(path, 'utf-8');

// Change export name
content = content.replace('export const NewsPage = () => {', 'import { useParams } from "react-router-dom";\n\nexport const PlatformNewsPage = () => {');

// Use platformId from URL
content = content.replace(
  'const [platformIds, setPlatformIds] = useState<string[]>([\'netflix\']);',
  'const { platformId = "netflix" } = useParams();\n  const [platformIds, setPlatformIds] = useState<string[]>([platformId]);'
);

// Remove the inline platform selector buttons inside the page (since it's a dedicated page now)
const btnRegex = /<div className="mb-6 flex flex-wrap gap-2">[\s\S]*?<\/div>\s*<\/div>/;
content = content.replace(btnRegex, '</div>');

fs.writeFileSync(path, content, 'utf-8');
console.log('Updated PlatformNewsPage');

