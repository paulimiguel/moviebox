const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/pages/NewsPage.tsx');

const content = `import { useState } from 'react';
import { Header } from '@/components/Header';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Film, Tv, Plus, Check, Loader2, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PLATFORMS = [
  { id: 'netflix', name: 'Netflix' },
  { id: 'prime', name: 'Amazon Prime' },
  { id: 'apple', name: 'Apple TV' }
];

export const NewsPage = () => {
  const [activePlatform, setActivePlatform] = useState('netflix');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const library = useQuery({ queryKey: ['movies'], queryFn: api.movies.getAll });
  const [addedMovieIds, setAddedMovieIds] = useState<Record<string, string>>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ['newReleases', activePlatform],
    queryFn: () => api.tmdb.newReleases(activePlatform),
  });

  const suggestionKey = (candidate: any) => \`\${candidate.type}-\${candidate.tmdbId}-\${candidate.imdbId}\`;

  const addedMovieIdFor = (candidate: any) => addedMovieIds[suggestionKey(candidate)] || (library.data || []).find((movie: any) => (
    movie.tmdbId === candidate.tmdbId || movie.imdbId === candidate.imdbId
  ))?.id;

  const suggestionExternalUrl = (candidate: any) => candidate.imdbId
    ? \`https://www.imdb.com/title/\${candidate.imdbId}/\`
    : \`https://www.themoviedb.org/\${candidate.type === 'movie' ? 'movie' : 'tv'}/\${candidate.tmdbId}\`;

  const importSuggestion = useMutation({
    mutationFn: async (candidate: any) => {
      const payload = await api.imdb.import({ imdbId: candidate.imdbId, type: candidate.type });
      return api.movies.create({ ...payload, favorite: false, watched: false, watchlist: false, personalRating: null, collectionIds: [] });
    },
    onSuccess: (saved, candidate) => {
      setAddedMovieIds((current) => ({ ...current, [suggestionKey(candidate)]: saved.id }));
      queryClient.setQueryData(['movies'], (current: any = []) => current.some((movie: any) => movie.id === saved.id) ? current : [saved, ...current]);
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      queryClient.invalidateQueries({ queryKey: ['metadata'] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });

  const renderCandidate = (candidate: any) => {
    const addedMovieId = addedMovieIdFor(candidate);
    const added = Boolean(addedMovieId);
    const adding = importSuggestion.isPending && importSuggestion.variables?.tmdbId === candidate.tmdbId;
    const openAddedMovie = () => { if (addedMovieId) navigate(\`/titulo/\${addedMovieId}\`); };
    const externalUrl = suggestionExternalUrl(candidate);
    const openExternalResult = () => window.open(externalUrl, '_blank', 'noopener,noreferrer');
    return (
      <article key={\`\${candidate.type}-\${candidate.tmdbId}\`} role="link" tabIndex={0} onClick={openExternalResult} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openExternalResult(); } }} className="movie-card flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-md bg-white shadow-card transition-transform hover:-translate-y-0.5" title={\`Abrir \${candidate.imdbId ? 'IMDb' : 'TMDB'} en una pestaña nueva\`}>
        <div className="relative aspect-[2/3] bg-mist">
          {candidate.posterUrl ? <img src={candidate.posterUrl} alt={candidate.title} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-aqua/70">{candidate.type === 'movie' ? <Film className="h-12 w-12" /> : <Tv className="h-12 w-12" />}</div>}
          <span className={\`absolute left-2 top-2 rounded px-2 py-1 text-[9px] font-semibold uppercase text-white shadow-sm \${candidate.type === 'series' ? 'bg-aqua' : 'bg-coral'}\`}>{candidate.type === 'movie' ? 'Película' : 'Serie'}</span>
          <button type="button" onClick={(event) => { event.stopPropagation(); if (addedMovieId) openAddedMovie(); else importSuggestion.mutate(candidate); }} disabled={!added && importSuggestion.isPending} className={\`absolute bottom-2 right-2 grid h-8 w-8 place-items-center rounded-md text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-70 \${added ? 'bg-[#2cbc63] hover:bg-[#249e53]' : 'bg-coral hover:bg-[#dc493a]'}\`} title={added ? 'Abrir título agregado' : 'Agregar título'} aria-label={added ? \`Abrir \${candidate.title}\` : \`Agregar \${candidate.title}\`}>{adding ? <Loader2 className="h-4 w-4 animate-spin" /> : added ? <Check className="h-4 w-4" strokeWidth={3} /> : <Plus className="h-5 w-5" strokeWidth={4} />}</button>
        </div>
        <div className="flex flex-1 flex-col p-3">
          <h2 className="font-bebas line-clamp-2 text-xl uppercase leading-6 text-ink">{candidate.title}</h2>
          <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">{candidate.year && <span className="font-semibold">{candidate.year}</span>}{candidate.rating != null && candidate.rating > 0 && <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{candidate.rating.toFixed(1)}</span>}</div>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{(candidate.genres || []).join(', ') || 'Sin género'}</p>
        </div>
      </article>
    );
  };

  return (
    <>
      <Header />
      <main className="mx-auto max-w-[1500px] p-4 sm:p-6 pb-20">
        <h1 className="font-bebas text-3xl text-ink">Novedades por Plataforma</h1>
        
        <div className="mt-6 flex flex-wrap gap-2">
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

        {isLoading ? (
          <div className="mt-12 grid place-items-center">
            <Loader2 className="h-8 w-8 animate-spin text-coral" />
          </div>
        ) : error ? (
          <div className="mt-12 rounded-md bg-red-50 p-4 text-red-700">
            Error al cargar las novedades.
          </div>
        ) : (
          <div className="mt-10 space-y-12">
            <section>
              <h2 className="mb-4 text-xl font-semibold text-ink border-b border-slate-200 pb-2">Películas</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7">
                {(data?.movies || []).map(renderCandidate)}
                {(data?.movies || []).length === 0 && (
                  <p className="col-span-full text-slate-500">No se encontraron películas recientes.</p>
                )}
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-xl font-semibold text-ink border-b border-slate-200 pb-2">Series</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7">
                {(data?.series || []).map(renderCandidate)}
                {(data?.series || []).length === 0 && (
                  <p className="col-span-full text-slate-500">No se encontraron series recientes.</p>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </>
  );
};
`;

fs.writeFileSync(filePath, content);
console.log('NewsPage.tsx updated successfully');

