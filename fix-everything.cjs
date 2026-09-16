const fs = require('fs');

// 1. Fix NewsPage.tsx
const newsPagePath = 'src/pages/NewsPage.tsx';
let newsPageContent = fs.readFileSync(newsPagePath, 'utf-8');
const search1 = "import type { MovieTypeFilter, SortDirection, MovieViewMode } from '@/types/movie';\r\nimport type { MovieTypeFilter, SortDirection } from '@/types/movie';\r\nimport type { MovieViewMode } from '@/components/MovieCard';";
const replacement1 = "import type { MovieTypeFilter, SortDirection } from '@/types/movie';\r\nimport type { MovieViewMode } from '@/components/MovieCard';";
const search1Lf = "import type { MovieTypeFilter, SortDirection, MovieViewMode } from '@/types/movie';\nimport type { MovieTypeFilter, SortDirection } from '@/types/movie';\nimport type { MovieViewMode } from '@/components/MovieCard';";
const replacement1Lf = "import type { MovieTypeFilter, SortDirection } from '@/types/movie';\nimport type { MovieViewMode } from '@/components/MovieCard';";

if (newsPageContent.includes(search1)) {
    newsPageContent = newsPageContent.replace(search1, replacement1);
} else if (newsPageContent.includes(search1Lf)) {
    newsPageContent = newsPageContent.replace(search1Lf, replacement1Lf);
}
fs.writeFileSync(newsPagePath, newsPageContent, 'utf-8');
console.log("NewsPage.tsx fixed");

// 2. Fix MovieLibraryToolbar.tsx
const toolbarPath = 'src/components/MovieLibraryToolbar.tsx';
let toolbarContent = fs.readFileSync(toolbarPath, 'utf-8');
const search2 = "interface ToolbarProps {\r\n  ownerName: string;\r\n  title?: string;\r\n  titleExtras?: React.ReactNode;\r\n  ownerName?: string;";
const replacement2 = "interface ToolbarProps {\r\n  title?: string;\r\n  titleExtras?: React.ReactNode;\r\n  ownerName?: string;";
const search2Lf = "interface ToolbarProps {\n  ownerName: string;\n  title?: string;\n  titleExtras?: React.ReactNode;\n  ownerName?: string;";
const replacement2Lf = "interface ToolbarProps {\n  title?: string;\n  titleExtras?: React.ReactNode;\n  ownerName?: string;";

if (toolbarContent.includes(search2)) {
    toolbarContent = toolbarContent.replace(search2, replacement2);
} else if (toolbarContent.includes(search2Lf)) {
    toolbarContent = toolbarContent.replace(search2Lf, replacement2Lf);
}
fs.writeFileSync(toolbarPath, toolbarContent, 'utf-8');
console.log("MovieLibraryToolbar.tsx fixed");

