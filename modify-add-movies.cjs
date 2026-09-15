const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/pages/AddMoviesPage.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add PLATFORMS constant
const platformsCode = `
const MAX_NAMES = 50;
const SEARCH_BATCH_SIZE = 4;

const PLATFORMS = [
  { id: 'justwatch', name: 'JustWatch' },
  { id: 'netflix', name: 'Netflix' },
  { id: 'prime', name: 'Amazon Prime' },
  { id: 'apple', name: 'Apple TV' }
];
`;
content = content.replace(/const MAX_NAMES = 50;\r?\nconst SEARCH_BATCH_SIZE = 4;/, platformsCode);

// 2. Add activePlatform state
content = content.replace(
  /const \[appliedSuggestionSearch, setAppliedSuggestionSearch\] = useState\(''\);/,
  `const [appliedSuggestionSearch, setAppliedSuggestionSearch] = useState('');\n  const [activePlatform, setActivePlatform] = useState('justwatch');`
);

// 3. Add new releases query
content = content.replace(
  /const suggestions = useQuery\(\{\r?\n\s*queryKey: \['tmdb-suggestions', appliedSuggestionSearch\],\r?\n\s*queryFn: \(\) => api.tmdb.suggestions\(appliedSuggestionSearch\),\r?\n\s*\}\);/,
  `const suggestions = useQuery({
    queryKey: ['tmdb-suggestions', appliedSuggestionSearch, activePlatform],
    queryFn: async () => {
      if (appliedSuggestionSearch || activePlatform === 'justwatch') {
        return api.tmdb.suggestions(appliedSuggestionSearch);
      }
      const data = await api.tmdb.newReleases(activePlatform);
      return [...data.movies, ...data.series];
    },
  });`
);

// 4. Update the suggestion filters UI
const suggestionFiltersUI = `{(!appliedSuggestionSearch && !suggestionSearch) && (
          <div className="mb-6 flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                onClick={() => setActivePlatform(p.id)}
                className={\`rounded-md px-4 py-2 text-sm font-semibold transition-colors \${
                  activePlatform === p.id 
                    ? 'bg-coral text-white' 
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }\`}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
        {!appliedSuggestionSearch && <h2 className="add-suggestions-title font-bebas text-2xl uppercase text-ink">Sugerencias</h2>}`;
content = content.replace(/\{!appliedSuggestionSearch && <h2 className="add-suggestions-title font-bebas text-2xl uppercase text-ink">Sugerencias<\/h2>\}/, suggestionFiltersUI);

// 5. Update subtitle text
content = content.replace(
  /\{appliedSuggestionSearch \? \`Mostrando \$\{visibleSuggestions\.length\} resultados de TMDB\` : \`Mostrando \$\{visibleSuggestions\.length\} títulos populares de JustWatch\`\}/,
  `{appliedSuggestionSearch ? \`Mostrando \${visibleSuggestions.length} resultados de TMDB\` : activePlatform === 'justwatch' ? \`Mostrando \${visibleSuggestions.length} títulos populares de JustWatch\` : \`Mostrando \${visibleSuggestions.length} novedades de \${PLATFORMS.find(p => p.id === activePlatform)?.name}\`}`
);

fs.writeFileSync(filePath, content);
console.log('AddMoviesPage updated successfully');

