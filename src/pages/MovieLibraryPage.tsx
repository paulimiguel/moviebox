import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckSquare, Edit3, Film, Loader2, Printer, Square, Trash2, X } from 'lucide-react';
import { Header } from '@/components/Header';
import { MovieBulkEditModal } from '@/components/MovieBulkEditModal';
import { MovieCard, type MovieViewMode } from '@/components/MovieCard';
import { MovieDetailModal } from '@/components/MovieDetailModal';
import { MovieEditModal } from '@/components/MovieEditModal';
import { MovieLibraryToolbar, type MovieBulkMode, type MovieLibrarySort, type MovieSearchScope } from '@/components/MovieLibraryToolbar';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { printMovies } from '@/utils/printMovies';
import type { FavoriteFilter, MovieItem, MovieTypeFilter, SortDirection, WatchedFilter, WatchlistFilter } from '@/types/movie';

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
const VIEW_MODE_STORAGE_KEY = 'moviebox:view-mode';
const VIEW_MODES: MovieViewMode[] = ['medium', 'mediumIcons', 'small', 'list', 'details'];

const getInitialViewMode = (): MovieViewMode => {
  try {
    const storedMode = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    return VIEW_MODES.includes(storedMode as MovieViewMode) ? storedMode as MovieViewMode : 'medium';
  } catch {
    return 'medium';
  }
};

export const MovieLibraryPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [searchScope, setSearchScope] = useState<MovieSearchScope>('name');
  const [type, setType] = useState<MovieTypeFilter>('all');
  const [genreIds, setGenreIds] = useState<string[]>([]);
  const [platformIds, setPlatformIds] = useState<string[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [watched, setWatched] = useState<WatchedFilter>('all');
  const [favorite, setFavorite] = useState<FavoriteFilter>('all');
  const [watchlist, setWatchlist] = useState<WatchlistFilter>('all');
  const [sortKey, setSortKey] = useState<MovieLibrarySort>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [viewMode, setViewMode] = useState<MovieViewMode>(getInitialViewMode);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<MovieBulkMode>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailMovie, setDetailMovie] = useState<MovieItem | null>(null);
  const [editingMovie, setEditingMovie] = useState<MovieItem | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    const applyGenreFilter = (genreId: string) => {
      setGenreIds([genreId]);
      setFiltersOpen(false);
      try {
        window.sessionStorage.removeItem('moviebox:genre-filter');
      } catch {
        // The selected genre was still applied.
      }
    };
    const handleGenreFilter = (event: Event) => applyGenreFilter((event as CustomEvent<string>).detail);
    const applyPlatformFilter = (platformId: string) => {
      setPlatformIds([platformId]);
      setFiltersOpen(false);
      try {
        window.sessionStorage.removeItem('moviebox:platform-filter');
      } catch {
        // The selected platform was still applied.
      }
    };
    const handlePlatformFilter = (event: Event) => applyPlatformFilter((event as CustomEvent<string>).detail);
    window.addEventListener('moviebox:filter-genre', handleGenreFilter);
    window.addEventListener('moviebox:filter-platform', handlePlatformFilter);
    try {
      const storedGenreId = window.sessionStorage.getItem('moviebox:genre-filter');
      if (storedGenreId) applyGenreFilter(storedGenreId);
      const storedPlatformId = window.sessionStorage.getItem('moviebox:platform-filter');
      if (storedPlatformId) applyPlatformFilter(storedPlatformId);
    } catch {
      // Genre selection remains available from the library filters.
    }
    return () => {
      window.removeEventListener('moviebox:filter-genre', handleGenreFilter);
      window.removeEventListener('moviebox:filter-platform', handlePlatformFilter);
    };
  }, []);

  const moviesQuery = useQuery({ queryKey: ['movies'], queryFn: api.movies.getAll });
  const metadataQuery = useQuery({ queryKey: ['metadata'], queryFn: api.metadata.getAll });
  const collectionsQuery = useQuery({ queryKey: ['collections'], queryFn: api.collections.getAll });

  const personalMutation = useMutation({
    mutationFn: ({ movie, field }: { movie: MovieItem; field: 'favorite' | 'watched' | 'watchlist' }) => api.movies.updatePersonal(movie.id, { [field]: !movie[field] }),
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
  const collectionsMutation = useMutation({
    mutationFn: ({ movie, collectionIds }: { movie: MovieItem; collectionIds: string[] }) => api.movies.updatePersonal(movie.id, { collectionIds }),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      setDetailMovie((current) => current?.id === saved.id ? saved : current);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map(api.movies.remove)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      queryClient.invalidateQueries({ queryKey: ['metadata'] });
      setSelectedIds(new Set());
      setBulkMode(null);
      setDeleteConfirmOpen(false);
      setDetailMovie(null);
    },
  });

  const filteredMovies = useMemo(() => {
    const query = normalize(search.trim());
    const list = (moviesQuery.data || []).filter((movie) => {
      const searchableText = searchScope === 'actor'
        ? movie.credits.filter((credit) => credit.creditType === 'cast').map((credit) => credit.name).join(' ')
        : searchScope === 'genre'
          ? movie.genres.map((genre) => genre.name).join(' ')
          : [movie.spanishTitle, movie.originalTitle].filter(Boolean).join(' ');
      if (query && !normalize(searchableText).includes(query)) return false;
      if (type !== 'all' && movie.type !== type) return false;
      if (genreIds.length && !movie.genres.some((item) => genreIds.includes(item.id))) return false;
      if (platformIds.length && !movie.platforms.some((item) => platformIds.includes(item.id))) return false;
      if (years.length && (!movie.year || !years.includes(String(movie.year)))) return false;
      if (watched === 'watched' && !movie.watched) return false;
      if (watched === 'unwatched' && movie.watched) return false;
      if (favorite === 'favorites' && !movie.favorite) return false;
      if (watchlist === 'watchlist' && !movie.watchlist) return false;
      return true;
    });
    const textValue = (movie: MovieItem) => {
      if (sortKey === 'title') return normalize(movie.spanishTitle || movie.originalTitle);
      if (sortKey === 'collection') return normalize(movie.collections[0]?.name || '');
      if (sortKey === 'genre') return normalize(movie.genres[0]?.name || '');
      return '';
    };
    return list.sort((left, right) => {
      const factor = sortDirection === 'asc' ? 1 : -1;
      if (sortKey === 'createdAt') return factor * (new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
      if (sortKey === 'year') return factor * ((left.year || 0) - (right.year || 0));
      return factor * textValue(left).localeCompare(textValue(right), 'es');
    });
  }, [favorite, genreIds, moviesQuery.data, platformIds, search, searchScope, sortDirection, sortKey, type, watched, watchlist, years]);

  const selectedMovies = (moviesQuery.data || []).filter((movie) => selectedIds.has(movie.id));
  const refreshLibrary = () => {
    queryClient.invalidateQueries({ queryKey: ['movies'] });
    queryClient.invalidateQueries({ queryKey: ['metadata'] });
    queryClient.invalidateQueries({ queryKey: ['collections'] });
  };
  const toggleSelection = (movie: MovieItem) => setSelectedIds((current) => {
    const next = new Set(current);
    if (next.has(movie.id)) next.delete(movie.id); else next.add(movie.id);
    return next;
  });
  const handleSortChange = (key: MovieLibrarySort) => {
    if (key === sortKey) setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDirection('asc'); }
  };
  const handleViewModeChange = (mode: MovieViewMode) => {
    setViewMode(mode);
    try {
      window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    } catch {
      // The selected view still works for this session when storage is unavailable.
    }
  };
  const handleBulkModeChange = (mode: MovieBulkMode) => {
    setBulkMode(mode);
    setSelectedIds(new Set());
    if (mode) setFiltersOpen(false);
  };
  const gridClass = viewMode === 'small'
    ? 'grid grid-cols-2 gap-2 min-[520px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-9'
    : viewMode === 'mediumIcons'
      ? 'grid grid-cols-2 gap-3 min-[520px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 sm:gap-4 2xl:grid-cols-7'
    : 'grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:gap-5 2xl:grid-cols-5';

  return (
    <main className="min-h-screen bg-canvas">
      <Header />
      <MovieLibraryToolbar
        ownerName={user?.alias || user?.name || 'Usuario'}
        visibleCount={filteredMovies.length}
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
        filtersOpen={filtersOpen}
        onFiltersToggle={() => { setFiltersOpen((current) => !current); setBulkMode(null); setSelectedIds(new Set()); }}
        bulkMode={bulkMode}
        onBulkModeChange={handleBulkModeChange}
        genreIds={genreIds}
        genres={metadataQuery.data?.genres || []}
        onGenreChange={setGenreIds}
        platformIds={platformIds}
        platforms={metadataQuery.data?.platforms || []}
        onPlatformChange={setPlatformIds}
        type={type}
        onTypeChange={setType}
        watched={watched}
        onWatchedChange={setWatched}
        favorite={favorite}
        onFavoriteChange={setFavorite}
        watchlist={watchlist}
        onWatchlistChange={setWatchlist}
        years={years}
        onYearChange={setYears}
        onClearFilters={() => { setGenreIds([]); setPlatformIds([]); setType('all'); setWatched('all'); setFavorite('all'); setWatchlist('all'); setYears([]); }}
      />

      {bulkMode && (
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex min-h-16 max-w-[1500px] flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
            <button type="button" onClick={() => setSelectedIds(new Set(filteredMovies.map((movie) => movie.id)))} className="secondary-button gap-2"><CheckSquare className="h-4 w-4" />Seleccionar todas</button>
            <button type="button" onClick={() => setSelectedIds(new Set())} className="secondary-button gap-2"><Square className="h-4 w-4" />Quitar seleccion</button>
            <span className="text-sm text-slate-500">{selectedMovies.length} seleccionadas</span>
            <div className="ml-auto flex flex-wrap gap-2">
              {bulkMode === 'edit' && <button type="button" onClick={() => setBulkEditOpen(true)} disabled={!selectedMovies.length} className="primary-button"><Edit3 className="h-4 w-4" />Editar seleccion</button>}
              {bulkMode === 'print' && <><button type="button" onClick={() => printMovies(selectedMovies, 'cards')} disabled={!selectedMovies.length} className="secondary-button gap-2"><Printer className="h-4 w-4" />Imprimir tarjetas</button><button type="button" onClick={() => printMovies(selectedMovies, 'list')} disabled={!selectedMovies.length} className="secondary-button gap-2"><Printer className="h-4 w-4" />Imprimir lista</button></>}
              {bulkMode === 'delete' && <button type="button" onClick={() => setDeleteConfirmOpen(true)} disabled={!selectedMovies.length} className="primary-button bg-red-600 hover:bg-red-700"><Trash2 className="h-4 w-4" />Eliminar movies</button>}
              <button type="button" onClick={() => handleBulkModeChange(null)} className="icon-button" title="Cerrar" aria-label="Cerrar"><X className="h-4 w-4" /></button>
            </div>
          </div>
        </section>
      )}

      <div className="mx-auto max-w-[1500px] px-3 py-5 sm:px-6 sm:py-7">
        {moviesQuery.isLoading ? <div className="grid min-h-[45vh] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-aqua" /></div>
          : moviesQuery.isError ? <div className="grid min-h-[45vh] place-items-center text-center"><div><p className="font-semibold text-ink">No se pudo cargar la biblioteca</p><button type="button" onClick={() => moviesQuery.refetch()} className="primary-button mt-4">Reintentar</button></div></div>
          : filteredMovies.length === 0 ? <div className="grid min-h-[45vh] place-items-center px-4 text-center"><div><Film className="mx-auto h-14 w-14 text-aqua" /><h2 className="mt-4 text-lg font-semibold text-ink">{moviesQuery.data?.length ? 'No hay coincidencias' : 'Tu biblioteca esta vacia'}</h2></div></div>
          : viewMode === 'medium' || viewMode === 'mediumIcons' || viewMode === 'small' ? <section className={gridClass}>{filteredMovies.map((movie) => <MovieCard key={movie.id} movie={movie} mode={viewMode} onOpen={setDetailMovie} onPersonal={(item, field) => personalMutation.mutate({ movie: item, field })} onRating={(item, rating) => ratingMutation.mutate({ movie: item, rating })} onEdit={setEditingMovie} onDelete={(item) => { setSelectedIds(new Set([item.id])); setDeleteConfirmOpen(true); }} selectionMode={Boolean(bulkMode)} selected={selectedIds.has(movie.id)} onSelectionChange={toggleSelection} />)}</section>
          : <section className="overflow-hidden rounded-md">{filteredMovies.map((movie) => <MovieCard key={movie.id} movie={movie} mode={viewMode} onOpen={setDetailMovie} onPersonal={(item, field) => personalMutation.mutate({ movie: item, field })} onRating={(item, rating) => ratingMutation.mutate({ movie: item, rating })} onEdit={setEditingMovie} onDelete={(item) => { setSelectedIds(new Set([item.id])); setDeleteConfirmOpen(true); }} selectionMode={Boolean(bulkMode)} selected={selectedIds.has(movie.id)} onSelectionChange={toggleSelection} />)}</section>}
      </div>

      {detailMovie && <MovieDetailModal movie={detailMovie} onClose={() => setDetailMovie(null)} onEdit={(movie) => { setDetailMovie(null); setEditingMovie(movie); }} onDelete={(movie) => { setSelectedIds(new Set([movie.id])); setDetailMovie(null); setDeleteConfirmOpen(true); }} onPersonal={(movie, field) => personalMutation.mutate({ movie, field })} onRating={(movie, rating) => ratingMutation.mutate({ movie, rating })} onCollections={(movie, collectionIds) => collectionsMutation.mutate({ movie, collectionIds })} />}
      {editingMovie && <MovieEditModal movie={editingMovie} onClose={() => setEditingMovie(null)} onSaved={() => { refreshLibrary(); setEditingMovie(null); }} />}
      {bulkEditOpen && <MovieBulkEditModal movies={selectedMovies} genres={metadataQuery.data?.genres || []} platforms={metadataQuery.data?.platforms || []} collections={collectionsQuery.data || []} onClose={() => setBulkEditOpen(false)} onSaved={() => { refreshLibrary(); setBulkEditOpen(false); setSelectedIds(new Set()); setBulkMode(null); }} />}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-ink/55 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-movies-title">
          <div className="w-full max-w-md rounded-md bg-white p-5 shadow-xl">
            <h2 id="delete-movies-title" className="text-lg font-semibold text-ink">Eliminar movies</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Se eliminaran {selectedIds.size} {selectedIds.size === 1 ? 'movie seleccionada' : 'movies seleccionadas'} y todos sus datos asociados. Esta accion no se puede deshacer.</p>
            <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => { setDeleteConfirmOpen(false); if (!bulkMode) setSelectedIds(new Set()); }} className="secondary-button">Cancelar</button><button type="button" onClick={() => deleteMutation.mutate(Array.from(selectedIds))} disabled={deleteMutation.isPending} className="primary-button bg-red-600 hover:bg-red-700">{deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Eliminar</button></div>
          </div>
        </div>
      )}
    </main>
  );
};
