const fs = require('fs');

const newsPagePath = 'src/pages/NewsPage.tsx';
let content = fs.readFileSync(newsPagePath, 'utf-8');

// 1. Add import for MovieDetailModal
if (!content.includes('MovieDetailModal')) {
    content = content.replace("import { MovieLibraryToolbar", "import { MovieDetailModal } from '@/components/MovieDetailModal';\nimport { MovieLibraryToolbar");
}

// 2. Add state for selectedCandidate
const stateInsert = `
  const [emptyFieldsCount, setEmptyFieldsCount] = useState(0);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);`;
if (!content.includes('const [selectedCandidate')) {
    content = content.replace('  const [emptyFieldsCount, setEmptyFieldsCount] = useState(0);', stateInsert);
}

// 3. Make title clickable
const titleSearch = `<h2 className="font-bebas line-clamp-2 text-xl uppercase leading-6 text-ink">{candidate.title}</h2>`;
const titleReplace = `<h2 role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); setSelectedCandidate(candidate); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setSelectedCandidate(candidate); } }} className="font-bebas line-clamp-2 text-xl uppercase leading-6 text-ink hover:text-coral hover:underline">{candidate.title}</h2>`;
if (content.includes(titleSearch)) {
    content = content.replace(titleSearch, titleReplace);
} else if (content.includes(titleSearch.replace(/\r\n/g, '\n'))) {
    content = content.replace(titleSearch.replace(/\r\n/g, '\n'), titleReplace.replace(/\r\n/g, '\n'));
}

// 4. Render MovieDetailModal
const modalRender = `      <main className="mx-auto max-w-[1500px] p-4 sm:p-6 pb-20">`;
const modalInsert = `      {selectedCandidate && (
        <MovieDetailModal
          movie={{
            id: 'preview-' + selectedCandidate.tmdbId,
            title: selectedCandidate.title,
            originalTitle: selectedCandidate.title,
            type: selectedCandidate.type,
            year: selectedCandidate.year || null,
            runtime: null,
            synopsis: selectedCandidate.overview || 'Sin descripción disponible.',
            imdbId: selectedCandidate.imdbId || null,
            tmdbId: selectedCandidate.tmdbId || null,
            imdbRating: selectedCandidate.rating || null,
            trailerUrl: null,
            favorite: false,
            watched: false,
            watchlist: false,
            personalRating: null,
            instagramRecommendation: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            images: selectedCandidate.posterUrl ? [{ id: '1', url: selectedCandidate.posterUrl, localPath: null, tmdbFilePath: null, order: 0, isPrimary: true, altText: null }] : [],
            genres: (selectedCandidate.genres || []).map((g, i) => ({ id: String(i), name: g, normalizedName: g, order: i })),
            platforms: [],
            keywords: [],
            director: [],
            cast: [],
            countries: [],
            collectionIds: [],
          } as any}
          onClose={() => setSelectedCandidate(null)}
          onPersonal={() => {}}
          onRating={() => {}}
          onCollections={() => {}}
        />
      )}
      <main className="mx-auto max-w-[1500px] p-4 sm:p-6 pb-20">`;
if (content.includes(modalRender)) {
    content = content.replace(modalRender, modalInsert);
}

fs.writeFileSync(newsPagePath, content, 'utf-8');
console.log("NewsPage modal integrated");

