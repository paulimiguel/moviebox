const fs = require('fs');

const pagePath = 'src/pages/AddMoviesPage.tsx';
let content = fs.readFileSync(pagePath, 'utf-8');

const startMarker = '{!appliedSuggestionSearch && <h2 className="add-suggestions-title font-bebas text-2xl uppercase text-ink">Sugerencias</h2>}';
const endMarkerStr = 'No hay sugerencias para mostrar</p></div></div>}';

const startIndex = content.indexOf(startMarker);
if (startIndex === -1) {
  console.log('Start marker not found');
  process.exit(1);
}

const endIndex = content.indexOf(endMarkerStr, startIndex);
if (endIndex === -1) {
  console.log('End marker not found');
  process.exit(1);
}

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

content = content.slice(0, startIndex) + replacement + content.slice(endIndex + endMarkerStr.length);

fs.writeFileSync(pagePath, content, 'utf-8');
console.log('Successfully replaced grid with Tinder UI');
