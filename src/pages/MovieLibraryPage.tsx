import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckSquare, Edit3, Film, Loader2, Printer, Square, Trash2, X } from 'lucide-react';
import { Header } from '@/components/Header';
import { MovieBulkEditModal } from '@/components/MovieBulkEditModal';
import { MovieCard, type MovieViewMode } from '@/components/MovieCard';
import { MovieDetailModal } from '@/components/MovieDetailModal';
import { MovieEditModal } from '@/components/MovieEditModal';
import { EmptyFieldsModal, type EmptyMovieField } from '@/components/EmptyFieldsModal';
import { MovieLibraryToolbar, type MovieBulkMode, type MovieLibrarySort, type MovieSearchScope } from '@/components/MovieLibraryToolbar';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { printMovies } from '@/utils/printMovies';
import type { FavoriteFilter, MovieItem, MovieTypeFilter, SortDirection, WatchedFilter, WatchlistFilter } from '@/types/movie';

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
const VIEW_MODE_STORAGE_KEY = 'moviebox:view-mode';
const VIEW_MODES: MovieViewMode[] = ['medium', 'mediumIcons', 'small', 'list', 'details'];
type LibraryFilterPreset = 'all' | 'movie' | 'series' | 'watchlist' | 'favorite' | 'watched' | 'unwatched';
const LIBRARY_FILTER_PRESETS: LibraryFilterPreset[] = ['all', 'movie', 'series', 'watchlist', 'favorite', 'watched', 'unwatched'];
const LIBRARY_SORT_STORAGE_KEY = 'moviebox:library-sort';

const getInitialLibrarySort = (): { key: MovieLibrarySort; direction: SortDirection } => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LIBRARY_SORT_STORAGE_KEY) || '{}') as { key?: MovieLibrarySort; direction?: SortDirection };
    const keys: MovieLibrarySort[] = ['title', 'createdAt', 'year', 'collection', 'genre', 'imdbRating'];
    return { key: keys.includes(parsed.key as MovieLibrarySort) ? parsed.key! : 'title', direction: parsed.direction === 'desc' ? 'desc' : 'asc' };
  } catch {
    return { key: 'title', direction: 'asc' };
  }
};

const isMovieFieldEmpty = (movie: MovieItem, field: EmptyMovieField) => {
  if (field === 'seasons') return movie.type === 'series' && movie.seasons == null;
  if (field === 'totalEpisodes') return movie.type === 'series' && movie.totalEpisodes == null;
  if (field === 'images' || field === 'countries' || field === 'genres' || field === 'keywords' || field === 'platforms' || field === 'collections') return movie[field].length === 0;
  if (field === 'directors') return !movie.credits.some((credit) => credit.creditType === 'director');
  if (field === 'cast') return !movie.credits.some((credit) => credit.creditType === 'cast');
  const value = movie[field];
  return value == null || (typeof value === 'string' && value.trim() === '');
};

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
  const initialSort = useMemo(getInitialLibrarySort, []);
  const [sortKey, setSortKey] = useState<MovieLibrarySort>(initialSort.key);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialSort.direction);
  const [viewMode, setViewMode] = useState<MovieViewMode>(getInitialViewMode);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<MovieBulkMode>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectionAnchorId = useRef<string | null>(null);
  const shiftPressed = useRef(false);
  const [detailMovie, setDetailMovie] = useState<MovieItem | null>(null);
  const [editingMovie, setEditingMovie] = useState<MovieItem | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [emptyFieldsOpen, setEmptyFieldsOpen] = useState(false);
  const [emptyFields, setEmptyFields] = useState<EmptyMovieField[]>([]);

  useEffect(() => {
    try {
      window.localStorage.setItem(LIBRARY_SORT_STORAGE_KEY, JSON.stringify({ key: sortKey, direction: sortDirection }));
    } catch {
      // The selected order remains active for the current session.
    }
  }, [sortDirection, sortKey]);

  useEffect(() => {
    const updateShiftState = (event: KeyboardEvent) => { shiftPressed.current = event.shiftKey; };
    const clearShiftState = () => { shiftPressed.current = false; };
    window.addEventListener('keydown', updateShiftState);
    window.addEventListener('keyup', updateShiftState);
    window.addEventListener('blur', clearShiftState);
    return () => {
      window.removeEventListener('keydown', updateShiftState);
      window.removeEventListener('keyup', updateShiftState);
      window.removeEventListener('blur', clearShiftState);
    };
  }, []);

  useEffect(() => {
    const applyLibraryFilter = (preset: LibraryFilterPreset) => {
      setSearch('');
      setType(preset === 'movie' ? 'movie' : preset === 'series' ? 'series' : 'all');
      setGenreIds([]);
      setPlatformIds([]);
      setYears([]);
      setWatched(preset === 'watched' ? 'watched' : preset === 'unwatched' ? 'unwatched' : 'all');
      setFavorite(preset === 'favorite' ? 'favorites' : 'all');
      setWatchlist(preset === 'watchlist' ? 'watchlist' : 'all');
      setEmptyFields([]);
      setFiltersOpen(false);
      setBulkMode(null);
      setSelectedIds(new Set());
      try {
        window.sessionStorage.removeItem('moviebox:library-filter');
      } catch {
        // The selected library filter was still applied.
      }
    };
    const handleLibraryFilter = (event: Event) => {
      const preset = (event as CustomEvent<string>).detail as LibraryFilterPreset;
      if (LIBRARY_FILTER_PRESETS.includes(preset)) applyLibraryFilter(preset);
    };
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
    window.addEventListener('moviebox:filter-library', handleLibraryFilter);
    window.addEventListener('moviebox:filter-genre', handleGenreFilter);
    window.addEventListener('moviebox:filter-platform', handlePlatformFilter);
    try {
      const storedLibraryFilter = window.sessionStorage.getItem('moviebox:library-filter') as LibraryFilterPreset | null;
      if (storedLibraryFilter && LIBRARY_FILTER_PRESETS.includes(storedLibraryFilter)) applyLibraryFilter(storedLibraryFilter);
      const storedGenreId = window.sessionStorage.getItem('moviebox:genre-filter');
      if (storedGenreId) applyGenreFilter(storedGenreId);
      const storedPlatformId = window.sessionStorage.getItem('moviebox:platform-filter');
      if (storedPlatformId) applyPlatformFilter(storedPlatformId);
    } catch {
      // Genre selection remains available from the library filters.
    }
    return () => {
      window.removeEventListener('moviebox:filter-library', handleLibraryFilter);
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
      if (emptyFields.length && !emptyFields.some((field) => isMovieFieldEmpty(movie, field))) return false;
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
      if (sortKey === 'imdbRating') {
        if (left.imdbRating == null && right.imdbRating == null) return 0;
        if (left.imdbRating == null) return 1;
        if (right.imdbRating == null) return -1;
        return factor * (left.imdbRating - right.imdbRating);
      }
      return factor * textValue(left).localeCompare(textValue(right), 'es');
    });
  }, [emptyFields, favorite, genreIds, moviesQuery.data, platformIds, search, searchScope, sortDirection, sortKey, type, watched, watchlist, years]);

  const selectedMovies = (moviesQuery.data || []).filter((movie) => selectedIds.has(movie.id));
  const refreshLibrary = () => {
    queryClient.invalidateQueries({ queryKey: ['movies'] });
    queryClient.invalidateQueries({ queryKey: ['metadata'] });
    queryClient.invalidateQueries({ queryKey: ['collections'] });
  };
  const toggleSelection = (movie: MovieItem, rangeSelection = false) => {
    const anchorId = selectionAnchorId.current;
    setSelectedIds((current) => {
      const next = new Set(current);
      const shouldSelectRange = rangeSelection || shiftPressed.current;
      const resolvedAnchorId = anchorId || (shouldSelectRange ? filteredMovies.find((item) => current.has(item.id))?.id || null : null);
      const anchorIndex = resolvedAnchorId ? filteredMovies.findIndex((item) => item.id === resolvedAnchorId) : -1;
      const currentIndex = filteredMovies.findIndex((item) => item.id === movie.id);
      if (shouldSelectRange && anchorIndex >= 0 && currentIndex >= 0) {
        const [start, end] = anchorIndex < currentIndex ? [anchorIndex, currentIndex] : [currentIndex, anchorIndex];
        filteredMovies.slice(start, end + 1).forEach((item) => next.add(item.id));
      } else if (next.has(movie.id)) next.delete(movie.id);
      else next.add(movie.id);
      return next;
    });
    if (!(rangeSelection || shiftPressed.current) || !anchorId) selectionAnchorId.current = movie.id;
  };
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
    selectionAnchorId.current = null;
    if (mode) setFiltersOpen(false);
  };
  const adjacentMovie = (movie: MovieItem, offset: -1 | 1) => {
    const index = filteredMovies.findIndex((item) => item.id === movie.id);
    return index >= 0 ? filteredMovies[index + offset] || null : null;
  };
  const gridClass = viewMode === 'small'
    ? 'grid grid-cols-2 gap-2 min-[520px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-9'
    : viewMode === 'mediumIcons'
      ? 'grid grid-cols-2 gap-3 min-[520px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 sm:gap-4 2xl:grid-cols-7'
    : 'grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:gap-5 2xl:grid-cols-5';

  return (
    <main className="movie-library-page min-h-screen bg-canvas">
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
        onClearFilters={() => { setGenreIds([]); setPlatformIds([]); setType('all'); setWatched('all'); setFavorite('all'); setWatchlist('all'); setYears([]); setEmptyFields([]); }}
        emptyFieldsCount={emptyFields.length}
        onEmptyFieldsSearch={() => setEmptyFieldsOpen(true)}
        onClearEmptyFields={() => setEmptyFields([])}
      />

      {bulkMode && (
        <section className="sticky top-[72px] z-20 border-b border-slate-200 bg-white shadow-card">
          <div className="mx-auto flex min-h-16 max-w-[1500px] flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
            <button type="button" onClick={() => setSelectedIds(new Set(filteredMovies.map((movie) => movie.id)))} className="secondary-button gap-2"><CheckSquare className="h-4 w-4" />Seleccionar todas</button>
            <button type="button" onClick={() => { setSelectedIds(new Set()); selectionAnchorId.current = null; }} className="secondary-button gap-2"><Square className="h-4 w-4" />Quitar seleccion</button>
            <span className="text-sm text-slate-500">{selectedMovies.length} seleccionadas <span className="hidden sm:inline">· Shift + clic selecciona un rango</span></span>
            <div className="ml-auto flex flex-wrap gap-2">
              {bulkMode === 'edit' && <button type="button" onClick={() => setBulkEditOpen(true)} disabled={!selectedMovies.length} className="primary-button"><Edit3 className="h-4 w-4" />Editar campos comunes</button>}
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

      {detailMovie && <MovieDetailModal movie={detailMovie} onClose={() => setDetailMovie(null)} onEdit={(movie) => { setDetailMovie(null); setEditingMovie(movie); }} onDelete={(movie) => { setSelectedIds(new Set([movie.id])); setDetailMovie(null); setDeleteConfirmOpen(true); }} onPersonal={(movie, field) => personalMutation.mutate({ movie, field })} onRating={(movie, rating) => ratingMutation.mutate({ movie, rating })} onCollections={(movie, collectionIds) => collectionsMutation.mutate({ movie, collectionIds })} onPrevious={adjacentMovie(detailMovie, -1) ? () => setDetailMovie(adjacentMovie(detailMovie, -1)) : undefined} onNext={adjacentMovie(detailMovie, 1) ? () => setDetailMovie(adjacentMovie(detailMovie, 1)) : undefined} />}
      {editingMovie && <MovieEditModal key={editingMovie.id} movie={editingMovie} onClose={() => setEditingMovie(null)} onSaved={() => { refreshLibrary(); setEditingMovie(null); }} onPrevious={adjacentMovie(editingMovie, -1) ? () => setEditingMovie(adjacentMovie(editingMovie, -1)) : undefined} onNext={adjacentMovie(editingMovie, 1) ? () => setEditingMovie(adjacentMovie(editingMovie, 1)) : undefined} />}
      {emptyFieldsOpen && <EmptyFieldsModal selected={emptyFields} onClose={() => setEmptyFieldsOpen(false)} onApply={(fields) => { setEmptyFields(fields); setEmptyFieldsOpen(false); }} />}
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
