import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckSquare, Edit3, Film, Loader2, Printer, Square, Trash2, X } from 'lucide-react';
import { Header } from '@/components/Header';
import { MovieBulkEditModal } from '@/components/MovieBulkEditModal';
import { MovieCard, type MovieViewMode } from '@/components/MovieCard';
import { MovieDetailModal } from '@/components/MovieDetailModal';
import { MovieFormModal } from '@/components/MovieFormModal';
import { MovieImportModal } from '@/components/MovieImportModal';
import { MovieLibraryToolbar, type MovieBulkMode, type MovieLibrarySort } from '@/components/MovieLibraryToolbar';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { printMovies } from '@/utils/printMovies';
import type { MovieItem, MovieTypeFilter, SortDirection } from '@/types/movie';

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');

export const MovieLibraryPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [type, setType] = useState<MovieTypeFilter>('all');
  const [genreId, setGenreId] = useState('');
  const [year, setYear] = useState('');
  const [sortKey, setSortKey] = useState<MovieLibrarySort>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [viewMode, setViewMode] = useState<MovieViewMode>('medium');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<MovieBulkMode>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [detailMovie, setDetailMovie] = useState<MovieItem | null>(null);
  const [editingMovie, setEditingMovie] = useState<MovieItem | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const moviesQuery = useQuery({ queryKey: ['movies'], queryFn: api.movies.getAll });
  const metadataQuery = useQuery({ queryKey: ['metadata'], queryFn: api.metadata.getAll });
  const collectionsQuery = useQuery({ queryKey: ['collections'], queryFn: api.collections.getAll });

  const personalMutation = useMutation({
    mutationFn: ({ movie, field }: { movie: MovieItem; field: 'favorite' | 'watched' }) => api.movies.updatePersonal(movie.id, { [field]: !movie[field] }),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['movies'] });
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
      const title = normalize([movie.spanishTitle, movie.originalTitle].filter(Boolean).join(' '));
      if (query && !title.includes(query)) return false;
      if (type !== 'all' && movie.type !== type) return false;
      if (genreId && !movie.genres.some((item) => item.id === genreId)) return false;
      if (year && movie.year !== Number(year)) return false;
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
  }, [genreId, moviesQuery.data, search, sortDirection, sortKey, type, year]);

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
  const handleBulkModeChange = (mode: MovieBulkMode) => {
    setBulkMode(mode);
    setSelectedIds(new Set());
    if (mode) setFiltersOpen(false);
  };
  const gridClass = viewMode === 'small'
    ? 'grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-5 2xl:grid-cols-6'
    : 'grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:gap-5 2xl:grid-cols-5';

  return (
    <main className="min-h-screen bg-canvas">
      <Header onNew={() => setFormOpen(true)} onImport={() => setImportOpen(true)} />
      <MovieLibraryToolbar
        ownerName={user?.alias || user?.name || 'Usuario'}
        visibleCount={filteredMovies.length}
        totalCount={moviesQuery.data?.length || 0}
        search={search}
        onSearchChange={setSearch}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        filtersOpen={filtersOpen}
        onFiltersToggle={() => { setFiltersOpen((current) => !current); setBulkMode(null); setSelectedIds(new Set()); }}
        bulkMode={bulkMode}
        onBulkModeChange={handleBulkModeChange}
        genreId={genreId}
        genres={metadataQuery.data?.genres || []}
        onGenreChange={setGenreId}
        type={type}
        onTypeChange={setType}
        year={year}
        onYearChange={setYear}
        onClearFilters={() => { setGenreId(''); setType('all'); setYear(''); }}
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
          : viewMode === 'medium' || viewMode === 'small' ? <section className={gridClass}>{filteredMovies.map((movie) => <MovieCard key={movie.id} movie={movie} mode={viewMode} onOpen={setDetailMovie} onPersonal={(item, field) => personalMutation.mutate({ movie: item, field })} selectionMode={Boolean(bulkMode)} selected={selectedIds.has(movie.id)} onSelectionChange={toggleSelection} />)}</section>
          : <section className="overflow-hidden rounded-md border border-slate-200">{filteredMovies.map((movie) => <MovieCard key={movie.id} movie={movie} mode={viewMode} onOpen={setDetailMovie} onPersonal={(item, field) => personalMutation.mutate({ movie: item, field })} selectionMode={Boolean(bulkMode)} selected={selectedIds.has(movie.id)} onSelectionChange={toggleSelection} />)}</section>}
      </div>

      {formOpen && <MovieFormModal onClose={() => setFormOpen(false)} onSaved={() => { refreshLibrary(); setFormOpen(false); }} />}
      {importOpen && <MovieImportModal onClose={() => setImportOpen(false)} onSaved={() => { refreshLibrary(); setImportOpen(false); }} />}
      {detailMovie && <MovieDetailModal movie={detailMovie} onClose={() => setDetailMovie(null)} onEdit={(movie) => { setDetailMovie(null); setEditingMovie(movie); }} onDelete={(movie) => { setSelectedIds(new Set([movie.id])); setDetailMovie(null); setBulkMode('delete'); setDeleteConfirmOpen(true); }} onPersonal={(movie, field) => personalMutation.mutate({ movie, field })} />}
      {editingMovie && <MovieFormModal movie={editingMovie} onClose={() => setEditingMovie(null)} onSaved={() => { refreshLibrary(); setEditingMovie(null); }} />}
      {bulkEditOpen && <MovieBulkEditModal movies={selectedMovies} genres={metadataQuery.data?.genres || []} platforms={metadataQuery.data?.platforms || []} collections={collectionsQuery.data || []} onClose={() => setBulkEditOpen(false)} onSaved={() => { refreshLibrary(); setBulkEditOpen(false); setSelectedIds(new Set()); setBulkMode(null); }} />}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-ink/55 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-movies-title">
          <div className="w-full max-w-md rounded-md bg-white p-5 shadow-xl">
            <h2 id="delete-movies-title" className="text-lg font-semibold text-ink">Eliminar movies</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Se eliminaran {selectedIds.size} {selectedIds.size === 1 ? 'movie seleccionada' : 'movies seleccionadas'} y todos sus datos asociados. Esta accion no se puede deshacer.</p>
            <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setDeleteConfirmOpen(false)} className="secondary-button">Cancelar</button><button type="button" onClick={() => deleteMutation.mutate(Array.from(selectedIds))} disabled={deleteMutation.isPending} className="primary-button bg-red-600 hover:bg-red-700">{deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Eliminar</button></div>
          </div>
        </div>
      )}
    </main>
  );
};
