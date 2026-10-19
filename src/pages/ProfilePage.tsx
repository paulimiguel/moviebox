import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/Header';
import { MovieCard, type MovieViewMode } from '@/components/MovieCard';
import { MovieDetailModal } from '@/components/MovieDetailModal';
import { MovieEditModal } from '@/components/MovieEditModal';
import { MovieLibraryToolbar, type MovieLibrarySort, type MovieSearchScope } from '@/components/MovieLibraryToolbar';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import type { MovieItem, MovieTypeFilter, SortDirection } from '@/types/movie';

const VIEW_MODE_STORAGE_KEY = 'moviebox:view-mode';
const VIEW_MODES: MovieViewMode[] = ['medium', 'mediumIcons', 'small', 'list', 'details'];

const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('es');

const getInitialViewMode = (): MovieViewMode => {
  try {
    const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    return VIEW_MODES.includes(stored as MovieViewMode) ? stored as MovieViewMode : 'medium';
  } catch {
    return 'medium';
  }
};

const gridClassFor = (viewMode: MovieViewMode) => viewMode === 'small'
  ? 'grid grid-cols-3 gap-2 min-[520px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-9'
  : viewMode === 'mediumIcons'
    ? 'grid grid-cols-2 gap-3 min-[520px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 sm:gap-4 2xl:grid-cols-7'
    : 'grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:gap-5 2xl:grid-cols-5';

const SECTIONS: { id: string; title: string; empty: string; matches: (movie: MovieItem) => boolean }[] = [
  { id: 'mis-favoritos', title: 'Mis títulos favoritos', empty: 'Todavía no marcaste títulos con Me encanta.', matches: (movie) => movie.favorite },
  { id: 'mis-vistos', title: 'Mis títulos vistos', empty: 'Todavía no marcaste títulos como vistos.', matches: (movie) => movie.watched },
  { id: 'mi-watchlist', title: 'Mi Watchlist', empty: 'Tu Watchlist está vacía.', matches: (movie) => movie.watchlist },
];

export const ProfilePage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const moviesQuery = useQuery({ queryKey: ['movies'], queryFn: api.movies.getAll });
  const [search, setSearch] = useState('');
  const [searchScope, setSearchScope] = useState<MovieSearchScope>('name');
  const [type, setType] = useState<MovieTypeFilter>('all');
  const [sortKey, setSortKey] = useState<MovieLibrarySort>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [viewMode, setViewMode] = useState<MovieViewMode>(getInitialViewMode);
  const [detailMovie, setDetailMovie] = useState<MovieItem | null>(null);
  const [editingMovie, setEditingMovie] = useState<MovieItem | null>(null);

  const sections = useMemo(() => {
    const query = normalize(search.trim());
    const textValue = (movie: MovieItem) => {
      if (sortKey === 'collection') return normalize(movie.collections[0]?.name || '');
      if (sortKey === 'genre') return normalize(movie.genres[0]?.name || '');
      return normalize(movie.spanishTitle || movie.originalTitle);
    };
    const sortMovies = (list: MovieItem[]) => list.sort((left, right) => {
      const factor = sortDirection === 'asc' ? 1 : -1;
      if (sortKey === 'createdAt') return factor * (new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
      if (sortKey === 'year') return factor * ((left.year || 0) - (right.year || 0));
      if (sortKey === 'imdbRating') {
        if (left.imdbRating == null && right.imdbRating == null) return 0;
        if (left.imdbRating == null) return 1;
        if (right.imdbRating == null) return -1;
        return factor * (left.imdbRating - right.imdbRating);
      }
      return factor * textValue(left).localeCompare(textValue(right), 'es');
    });
    const passes = (movie: MovieItem) => {
      if (type !== 'all' && movie.type !== type) return false;
      if (!query) return true;
      const searchable = searchScope === 'actor'
        ? movie.credits.filter((credit) => credit.creditType === 'cast').map((credit) => credit.name).join(' ')
        : searchScope === 'genre'
          ? movie.genres.map((genre) => genre.name).join(' ')
          : [movie.spanishTitle, movie.originalTitle].filter(Boolean).join(' ');
      return normalize(searchable).includes(query);
    };
    const all = moviesQuery.data || [];
    return SECTIONS.map((section) => ({ ...section, movies: sortMovies(all.filter((movie) => section.matches(movie) && passes(movie))) }));
  }, [moviesQuery.data, search, searchScope, type, sortKey, sortDirection]);

  const visibleCount = new Set(sections.flatMap((section) => section.movies.map((movie) => movie.id))).size;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['movies'] });
    queryClient.invalidateQueries({ queryKey: ['metadata'] });
    queryClient.invalidateQueries({ queryKey: ['collections'] });
  };
  const personalMutation = useMutation({
    mutationFn: ({ movie, field }: { movie: MovieItem; field: 'favorite' | 'watched' | 'watchlist' | 'thumbsUp' | 'thumbsDown' }) => api.movies.updatePersonal(movie.id, { [field]: !movie[field] }),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      setDetailMovie((current) => current?.id === saved.id ? saved : current);
    },
  });
  const ratingMutation = useMutation({
    mutationFn: ({ movie, rating }: { movie: MovieItem; rating: number | null }) => api.movies.updatePersonal(movie.id, { personalRating: rating }),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      setDetailMovie((current) => current?.id === saved.id ? saved : current);
    },
  });

  const handleSortChange = (key: MovieLibrarySort) => {
    if (key === sortKey) setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDirection('asc'); }
  };
  const handleViewModeChange = (mode: MovieViewMode) => {
    setViewMode(mode);
    try { window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode); } catch { /* La vista sigue funcionando en esta sesión. */ }
  };
  const adjacent = (movie: MovieItem, offset: -1 | 1) => {
    const list = sections.find((section) => section.movies.some((item) => item.id === movie.id))?.movies || [];
    const index = list.findIndex((item) => item.id === movie.id);
    return index >= 0 ? list[index + offset] || null : null;
  };

  const renderCards = (movies: MovieItem[]) => {
    const cards = movies.map((movie) => (
      <MovieCard
        key={movie.id}
        movie={movie}
        mode={viewMode}
        onOpen={setDetailMovie}
        onPersonal={(item, field) => personalMutation.mutate({ movie: item, field })}
        onRating={(item, rating) => ratingMutation.mutate({ movie: item, rating })}
        onEdit={setEditingMovie}
      />
    ));
    return viewMode === 'list' || viewMode === 'details'
      ? <div className="overflow-hidden rounded-md">{cards}</div>
      : <div className={gridClassFor(viewMode)}>{cards}</div>;
  };

  return (
    <main className="movie-library-page min-h-screen bg-canvas pb-12">
      <Header />
      <MovieLibraryToolbar
        ownerName={user?.alias || user?.name || 'Usuario'}
        title="Mi perfil"
        hideActiveFilters
        hideFilterAndAdd
        visibleCount={visibleCount}
        totalCount={moviesQuery.data?.length || 0}
        search={search}
        onSearchChange={setSearch}
        searchScope={searchScope}
        onSearchScopeChange={setSearchScope}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        filtersOpen={false}
        onFiltersToggle={() => undefined}
        bulkMode={null}
        onBulkModeChange={() => undefined}
        genreIds={[]}
        genres={[]}
        onGenreChange={() => undefined}
        platformIds={[]}
        platforms={[]}
        onPlatformChange={() => undefined}
        type={type}
        onTypeChange={setType}
        watched="all"
        onWatchedChange={() => undefined}
        favorite="all"
        onFavoriteChange={() => undefined}
        watchlist="all"
        onWatchlistChange={() => undefined}
        years={[]}
        onYearChange={() => undefined}
        onClearFilters={() => { setType('all'); setSearch(''); }}
        emptyFieldsCount={0}
        onEmptyFieldsSearch={() => undefined}
        onClearEmptyFields={() => undefined}
      />

      <div className="mx-auto max-w-[1500px] px-4 sm:px-6">
        {moviesQuery.isLoading ? <div className="mt-8 h-56 animate-pulse rounded-lg bg-mist" /> : sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-20 border-b border-slate-200/50 py-8 last:border-b-0 sm:py-10">
            <div className="mb-5 text-center">
              <h2 className="font-bebas text-3xl font-normal uppercase text-ink sm:text-4xl">{section.title}</h2>
              <p className="mt-1 text-xs text-slate-500">{section.movies.length} {section.movies.length === 1 ? 'título' : 'títulos'}</p>
            </div>
            {section.movies.length
              ? renderCards(section.movies)
              : <p className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">{search.trim() || type !== 'all' ? 'No hay títulos que coincidan con la búsqueda.' : section.empty}</p>}
          </section>
        ))}
      </div>

      {detailMovie && (
        <MovieDetailModal
          movie={detailMovie}
          onClose={() => setDetailMovie(null)}
          onEdit={(movie) => { setDetailMovie(null); setEditingMovie(movie); }}
          onPersonal={(movie, field) => personalMutation.mutate({ movie, field })}
          onRating={(movie, rating) => ratingMutation.mutate({ movie, rating })}
          onPrevious={adjacent(detailMovie, -1) ? () => setDetailMovie(adjacent(detailMovie, -1)) : undefined}
          onNext={adjacent(detailMovie, 1) ? () => setDetailMovie(adjacent(detailMovie, 1)) : undefined}
        />
      )}
      {editingMovie && <MovieEditModal key={editingMovie.id} movie={editingMovie} onClose={() => setEditingMovie(null)} onSaved={() => { refresh(); setEditingMovie(null); }} />}
    </main>
  );
};
