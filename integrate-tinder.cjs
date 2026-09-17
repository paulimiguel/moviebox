const fs = require('fs');

const pagePath = 'src/pages/AddMoviesPage.tsx';
let content = fs.readFileSync(pagePath, 'utf-8');

// Add import
if (!content.includes('TinderSuggestions')) {
  content = content.replace(
    "import { Header } from '@/components/Header';",
    "import { Header } from '@/components/Header';\nimport { TinderSuggestions } from '@/components/TinderSuggestions';"
  );
}

// Replace Suggestions header & grid
const searchRegex = /\{!appliedSuggestionSearch && <h2 className="add-suggestions-title[^>]*>Sugerencias<\/h2>\}\s*\{suggestions\.isLoading[\s\S]*?(?=<div className="mx-auto max-w-\[1500px\])/;

const replacement = `
          {suggestions.isLoading ? (
            <div className="grid min-h-[360px] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-aqua" /></div>
          ) : suggestions.isError ? (
            <div className="mt-4 rounded-md border border-red-100 bg-red-50 p-5 text-center">
              <p className="text-sm text-red-700">{appliedSuggestionSearch ? 'No se pudieron cargar los resultados de TMDB.' : 'No se pudieron cargar los títulos populares de JustWatch.'}</p>
              <button type="button" onClick={() => suggestions.refetch()} className="secondary-button mt-3">Reintentar</button>
            </div>
          ) : visibleSuggestions.length ? (
            <TinderSuggestions 
              initialCandidates={visibleSuggestions}
              onAdd={(candidate) => {
                if (!addedMovieIdFor(candidate)) {
                  importSuggestion.mutate(candidate);
                }
              }}
              isAdding={importSuggestion.isPending}
              addingTmdbId={importSuggestion.variables?.tmdbId || null}
            />
          ) : (
            <div className="grid min-h-[280px] place-items-center text-center">
              <div><Film className="mx-auto h-12 w-12 text-aqua" />
              <p className="mt-3 font-semibold text-ink">No hay sugerencias para mostrar</p></div>
            </div>
          )}
        `;

content = content.replace(searchRegex, replacement + '\n        ');

fs.writeFileSync(pagePath, content, 'utf-8');
console.log('AddMoviesPage updated');
