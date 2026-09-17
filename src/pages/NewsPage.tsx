import { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Film, Tv, Plus, Check, Loader2, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MovieDetailModal } from '@/components/MovieDetailModal';
import { MovieLibraryToolbar, MovieLibrarySort, MovieSearchScope } from '@/components/MovieLibraryToolbar';
import type { MovieTypeFilter, SortDirection } from '@/types/movie';
import type { MovieViewMode } from '@/components/MovieCard';

const PLATFORMS = [
  { id: 'netflix', name: 'Netflix' },
  { id: 'prime', name: 'Prime Video' },
  { id: 'apple', name: 'Apple TV' },
  { id: 'justwatch', name: 'JustWatch' },
    { id: 'disney', name: 'Disney+' }
];

export const NewsPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const library = useQuery({ queryKey: ['movies'], queryFn: api.movies.getAll });
  const [addedMovieIds, setAddedMovieIds] = useState<Record<string, string>>({});

  // Toolbar state
  const [search, setSearch] = useState('');
  const [searchScope, setSearchScope] = useState<MovieSearchScope>('name');
  const [viewMode, setViewMode] = useState<MovieViewMode>('medium');
  const [sortKey, setSortKey] = useState<MovieLibrarySort>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  const [platformIds, setPlatformIds] = useState<string[]>(['netflix']);
  const [genreIds, setGenreIds] = useState<string[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [type, setType] = useState<MovieTypeFilter>('all');
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);

  const activePlatform = platformIds.length > 0 ? platformIds[0] : 'netflix';

  const { data, isLoading, error } = useQuery({
    queryKey: ['newReleases', activePlatform],
    queryFn: () => api.tmdb.newReleases(activePlatform),
  });

  const metadataQuery = useQuery({ queryKey: ['metadata'], queryFn: api.metadata.getAll });
  const allGenres = metadataQuery.data?.genres || [];

  const handleSortChange = (key: MovieLibrarySort) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const clearFilters = () => {
    setGenreIds([]);
    setYears([]);
    setType('all');
    setPlatformIds(['netflix']);
    setSearch('');
  };

  const allItems = useMemo(() => {
    if (!data) return [];
    return [...(data.movies || []), ...(data.series || [])];
  }, [data]);

  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      if (type !== 'all' && item.type !== type) return false;
      
      if (years.length > 0 && item.year) {
        if (!years.includes(String(item.year))) return false;
      }
      
      if (genreIds.length > 0) {
        // Novedades uses genre names instead of IDs, so we need to map selected IDs to names
        const selectedGenreNames = allGenres.filter(g => genreIds.includes(g.id)).map(g => g.name.toLowerCase());
        const itemGenres = (item.genres || []).map((g: string) => g.toLowerCase());
        if (!selectedGenreNames.some(name => itemGenres.includes(name))) return false;
      }

      if (search) {
        const query = search.toLowerCase();
        if (searchScope === 'name') {
          if (!item.title.toLowerCase().includes(query) && !item.originalTitle?.toLowerCase().includes(query)) return false;
        } else if (searchScope === 'genre') {
          const itemGenres = (item.genres || []).map((g: string) => g.toLowerCase());
          if (!itemGenres.some((g: string) => g.includes(query))) return false;
        }
      }

      return true;
    });
  }, [allItems, type, years, genreIds, search, searchScope, allGenres]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      let result = 0;
      if (sortKey === 'title') {
        result = a.title.localeCompare(b.title);
      } else if (sortKey === 'year') {
        result = (a.year || 0) - (b.year || 0);
      } else if (sortKey === 'imdbRating') {
        result = (a.rating || 0) - (b.rating || 0);
      }
      return sortDirection === 'asc' ? result : -result;
    });
  }, [filteredItems, sortKey, sortDirection]);

  const suggestionKey = (candidate: any) => `${candidate.type}-${candidate.tmdbId}-${candidate.imdbId}`;

  const addedMovieIdFor = (candidate: any) => addedMovieIds[suggestionKey(candidate)] || (library.data || []).find((movie: any) => (
    movie.tmdbId === candidate.tmdbId || movie.imdbId === candidate.imdbId
  ))?.id;

  const suggestionExternalUrl = (candidate: any) => candidate.imdbId
    ? `https://www.imdb.com/title/${candidate.imdbId}/`
    : `https://www.themoviedb.org/${candidate.type === 'movie' ? 'movie' : 'tv'}/${candidate.tmdbId}`;

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
    const openAddedMovie = () => { if (addedMovieId) navigate(`/titulo/${addedMovieId}`); };
    const externalUrl = suggestionExternalUrl(candidate);
    const openExternalResult = () => window.open(externalUrl, '_blank', 'noopener,noreferrer');
    
    // Determine grid classes based on viewMode
    let cardClass = "movie-card flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-md bg-white shadow-card transition-transform hover:-translate-y-0.5";
    if (viewMode === 'list' || viewMode === 'details') {
       cardClass = "movie-card flex min-w-0 cursor-pointer flex-row overflow-hidden rounded-md bg-white shadow-card transition-transform hover:-translate-y-0.5";
    }

    return (
      <article key={`${candidate.type}-${candidate.tmdbId}`} role="link" tabIndex={0} onClick={openExternalResult} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openExternalResult(); } }} className={cardClass} title={`Abrir ${candidate.imdbId ? 'IMDb' : 'TMDB'} en una pestaña nueva`}>
        <div className={`relative bg-mist ${viewMode === 'list' || viewMode === 'details' ? 'w-24 shrink-0' : 'aspect-[2/3]'}`}>
          {candidate.posterUrl ? <img src={candidate.posterUrl} alt={candidate.title} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-aqua/70">{candidate.type === 'movie' ? <Film className="h-12 w-12" /> : <Tv className="h-12 w-12" />}</div>}
          <span className={`absolute left-2 top-2 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white shadow-sm ${candidate.type === 'series' ? 'bg-aqua' : 'bg-coral'}`}>{candidate.type === 'movie' ? 'Película' : 'Serie'}</span>
          <button type="button" onClick={(event) => { event.stopPropagation(); if (addedMovieId) openAddedMovie(); else importSuggestion.mutate(candidate); }} disabled={!added && importSuggestion.isPending} className={`absolute bottom-2 right-2 grid h-8 w-8 place-items-center rounded-md text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${added ? 'bg-[#2cbc63] hover:bg-[#249e53]' : 'bg-coral hover:bg-[#dc493a]'}`} title={added ? 'Abrir título agregado' : 'Agregar título'} aria-label={added ? `Abrir ${candidate.title}` : `Agregar ${candidate.title}`}>{adding ? <Loader2 className="h-4 w-4 animate-spin" /> : added ? <Check className="h-4 w-4" strokeWidth={3} /> : <Plus className="h-5 w-5" strokeWidth={4} />}</button>
        </div>
        <div className="flex flex-1 flex-col p-3">
          <h2 role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); setSelectedCandidate(candidate); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setSelectedCandidate(candidate); } }} className="font-bebas line-clamp-2 text-xl uppercase leading-6 text-ink hover:text-coral hover:underline">{candidate.title}</h2>
          <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">{candidate.year && <span className="font-semibold">{candidate.year}</span>}{candidate.rating != null && candidate.rating > 0 && <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{candidate.rating.toFixed(1)}</span>}</div>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{(candidate.genres || []).join(', ') || 'Sin género'}</p>
        </div>
      </article>
    );
  };

  const getGridClass = () => {
    if (viewMode === 'small') return "grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9";
    if (viewMode === 'mediumIcons') return "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8";
    if (viewMode === 'list' || viewMode === 'details') return "grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3";
    return "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7"; // medium (default)
  };

  return (
    <>
      <Header />
      <MovieLibraryToolbar
        ownerName="Plataforma"
        title="Novedades por Plataforma"
        titleExtras={
          <div className="mx-auto max-w-[1500px] px-4 pb-3 sm:px-6">
            <div className="mt-1 flex items-center gap-2 overflow-x-auto no-scrollbar">
              {PLATFORMS.map((p) => {
                const active = platformIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => setPlatformIds([p.id])}
                    className={`inline-flex shrink-0 items-center justify-center rounded-md border px-4 py-2 text-[13px] font-semibold transition-colors ${
                      active
                        ? 'border-coral bg-coral text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>
        }
        visibleCount={sortedItems.length}
        totalCount={allItems.length}
        search={search}
        onSearchChange={setSearch}
        searchScope={searchScope}
        onSearchScopeChange={setSearchScope}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        filtersOpen={filtersOpen}
        onFiltersToggle={() => setFiltersOpen(!filtersOpen)}
        bulkMode={null}
        onBulkModeChange={() => {}}
        genreIds={genreIds}
        genres={allGenres}
        onGenreChange={setGenreIds}
        platformIds={platformIds}
        platforms={PLATFORMS}
        onPlatformChange={(ids) => {
          // Keep only the latest selected platform for Novedades since API takes one
          const latest = ids.filter(id => !platformIds.includes(id))[0];
          if (latest) {
            setPlatformIds([latest]);
          } else if (ids.length > 0) {
             setPlatformIds([ids[0]]);
          } else {
             setPlatformIds(['netflix']); // default
          }
        }}
        type={type}
        onTypeChange={setType}
        watched="all"
        onWatchedChange={() => {}}
        favorite="all"
        onFavoriteChange={() => {}}
        watchlist="all"
        onWatchlistChange={() => {}}
        years={years}
        onYearChange={setYears}
        onClearFilters={clearFilters}
        emptyFieldsCount={0}
        onEmptyFieldsSearch={() => {}}
        onClearEmptyFields={() => {}}
      />
      {selectedCandidate && (
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
            genres: (selectedCandidate.genres || []).map((g: string, i: number) => ({ id: String(i), name: g, normalizedName: g, order: i })),
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
      <main className="mx-auto max-w-[1500px] p-4 sm:p-6 pb-20">
        {isLoading ? (
          <div className="mt-12 grid place-items-center">
            <Loader2 className="h-8 w-8 animate-spin text-coral" />
          </div>
        ) : error ? (
          <div className="mt-12 rounded-md bg-red-50 p-4 text-red-700">
            Error al cargar las novedades.
          </div>
        ) : (
          <div className="mt-6">
             <div className={getGridClass()}>
                {sortedItems.map(renderCandidate)}
             </div>
             {sortedItems.length === 0 && (
               <p className="mt-10 text-center text-slate-500">No se encontraron resultados para los filtros actuales.</p>
             )}
          </div>
        )}
      </main>
    </>
  );
};
