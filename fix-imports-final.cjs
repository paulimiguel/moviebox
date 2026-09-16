const fs = require('fs');
const filePath = 'src/pages/NewsPage.tsx';
let content = fs.readFileSync(filePath, 'utf-8');
const search = "import type { MovieTypeFilter, SortDirection, MovieViewMode } from '@/types/movie';\r\nimport type { MovieTypeFilter, SortDirection } from '@/types/movie';\r\nimport type { MovieViewMode } from '@/components/MovieCard';";
const replacement = "import type { MovieTypeFilter, SortDirection } from '@/types/movie';\r\nimport type { MovieViewMode } from '@/components/MovieCard';";

if (content.includes(search)) {
    content = content.replace(search, replacement);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log("Imports fixed with CRLF!");
} else {
    // try LF
    const searchLf = "import type { MovieTypeFilter, SortDirection, MovieViewMode } from '@/types/movie';\nimport type { MovieTypeFilter, SortDirection } from '@/types/movie';\nimport type { MovieViewMode } from '@/components/MovieCard';";
    const replacementLf = "import type { MovieTypeFilter, SortDirection } from '@/types/movie';\nimport type { MovieViewMode } from '@/components/MovieCard';";
    if (content.includes(searchLf)) {
        content = content.replace(searchLf, replacementLf);
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log("Imports fixed with LF!");
    } else {
        console.log("Could not find the target string");
    }
}
