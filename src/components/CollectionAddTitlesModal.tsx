import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bookmark, Check, ChevronDown, Eye, EyeOff, Film, Filter, Heart, Loader2, Search, Tags, Tv, X } from 'lucide-react';
import { FilterPlatformIcon, FilterSelect } from '@/components/FilterSelect';
import { api, resolveMovieImageUrl } from '@/services/api';
import { getGenreIconImage } from '@/utils/genreIcons';
import type { MovieCollection, MovieItem } from '@/types/movie';

const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('es');

const filterButtonClass = (active: boolean) => `library-filter-button moviebox-translucent-action inline-flex h-8 w-full items-center justify-center gap-1 rounded-md border px-1 text-[11px] font-semibold whitespace-nowrap transition-colors ${active ? 'border-coral bg-coral text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`;

const posterFor = (movie: MovieItem) => {
  const image = movie.images.find((item) => item.isPrimary) || movie.images[0];
  return image ? resolveMovieImageUrl(image.url) : null;
};

export const CollectionAddTitlesModal = ({ collection, onClose }: { collection: MovieCollection; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const moviesQuery = useQuery({ queryKey: ['movies'], queryFn: api.movies.getAll });
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const collectionsQuery = useQuery({ queryKey: ['collections'], queryFn: api.collections.getAll });
  const [genreFilter, setGenreFilter] = useState<string[]>([]);
  const [platformFilter, setPlatformFilter] = useState<string[]>([]);
  const [collectionFilter, setCollectionFilter] = useState<string[]>([]);
  const [yearFilter, setYearFilter] = useState<number[]>([]);
  const [yearDraft, setYearDraft] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'movie' | 'series'>('all');
  const [watchedFilter, setWatchedFilter] = useState<'all' | 'watched' | 'unwatched'>('all');
  const [likeFilter, setLikeFilter] = useState(false);
  const [watchlistFilter, setWatchlistFilter] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [addedTitles, setAddedTitles] = useState<MovieItem[] | null>(null);
  const [failedCount, setFailedCount] = useState(0);

  const alreadyInCollection = useMemo(() => new Set(collection.movieIds), [collection.movieIds]);
  const genreOptions = useMemo(() => [...new Set((moviesQuery.data || []).flatMap((movie) => movie.genres.map((genre) => genre.name)))].sort((left, right) => left.localeCompare(right, 'es')), [moviesQuery.data]);
  const platformOptions = useMemo(() => [...new Set((moviesQuery.data || []).flatMap((movie) => movie.platforms.map((platform) => platform.name)))].sort((left, right) => left.localeCompare(right, 'es')), [moviesQuery.data]);
  const noFilters = genreFilter.length === 0 && platformFilter.length === 0 && collectionFilter.length === 0 && yearFilter.length === 0 && typeFilter === 'all' && watchedFilter === 'all' && !likeFilter && !watchlistFilter;
  const clearFilters = () => {
    setGenreFilter([]);
    setPlatformFilter([]);
    setCollectionFilter([]);
    setYearFilter([]);
    setYearDraft('');
    setTypeFilter('all');
    setWatchedFilter('all');
    setLikeFilter(false);
    setWatchlistFilter(false);
  };
  const filterChips = (items: { key: string; label: string; onRemove: () => void }[], kind: string) => items.length ? (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {items.map((item) => (
        <button key={`chip-${kind}-${item.key}`} type="button" onClick={item.onRemove} className="inline-flex max-w-full items-center gap-1 rounded bg-mist px-1.5 py-0.5 text-[11px] font-medium text-slate-600" title={`Quitar ${kind} ${item.label}`}>
          <span className="truncate">{item.label}</span>
          <X className="h-3 w-3 shrink-0" />
        </button>
      ))}
    </div>
  ) : null;
  const toggleIn = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, value: T) => setter((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  const movies = useMemo(() => {
    const query = normalize(search.trim());
    return [...(moviesQuery.data || [])]
      .filter((movie) => !query || normalize(`${movie.originalTitle} ${movie.spanishTitle || ''}`).includes(query))
      .filter((movie) => !genreFilter.length || movie.genres.some((genre) => genreFilter.includes(genre.name)))
      .filter((movie) => !platformFilter.length || movie.platforms.some((platform) => platformFilter.includes(platform.name)))
      .filter((movie) => !collectionFilter.length || movie.collections.some((item) => collectionFilter.includes(item.id)))
      .filter((movie) => !yearFilter.length || (movie.year != null && yearFilter.includes(movie.year)))
      .filter((movie) => typeFilter === 'all' || movie.type === typeFilter)
      .filter((movie) => watchedFilter === 'all' || (watchedFilter === 'watched' ? movie.watched : !movie.watched))
      .filter((movie) => !likeFilter || movie.favorite)
      .filter((movie) => !watchlistFilter || movie.watchlist)
      .sort((left, right) => (left.spanishTitle || left.originalTitle).localeCompare(right.spanishTitle || right.originalTitle, 'es', { sensitivity: 'base' }));
  }, [moviesQuery.data, search, genreFilter, platformFilter, collectionFilter, yearFilter, typeFilter, watchedFilter, likeFilter, watchlistFilter]);

  const selectableVisible = movies.filter((movie) => !alreadyInCollection.has(movie.id));
  const allVisibleSelected = selectableVisible.length > 0 && selectableVisible.every((movie) => selectedIds.has(movie.id));
  const selectAllVisible = () => setSelectedIds((current) => {
    const next = new Set(current);
    selectableVisible.forEach((movie) => next.add(movie.id));
    return next;
  });
  const clearSelection = () => setSelectedIds(new Set());
  const toggle = (movie: MovieItem) => {
    if (alreadyInCollection.has(movie.id)) return;
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(movie.id)) next.delete(movie.id);
      else next.add(movie.id);
      return next;
    });
  };

  const save = async () => {
    if (!selectedIds.size || saving) return;
    setSaving(true);
    setError('');
    const targets = (moviesQuery.data || []).filter((movie) => selectedIds.has(movie.id));
    // Se agregan a las colecciones que el título ya tenía: nunca se reemplazan.
    const results: PromiseSettledResult<unknown>[] = [];
    for (const movie of targets) {
      const request = api.movies.updatePersonal(movie.id, {
        collectionIds: [...new Set([...movie.collections.map((item) => item.id), collection.id])],
      });
      const timeout = new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('Tiempo de espera agotado')), 20000));
      // Se envían de a uno: en paralelo la base SQLite se bloqueaba y la solicitud quedaba colgada.
      results.push(await Promise.race([request, timeout]).then((value): PromiseFulfilledResult<unknown> => ({ status: 'fulfilled', value }), (reason): PromiseRejectedResult => ({ status: 'rejected', reason })));
    }
    queryClient.invalidateQueries({ queryKey: ['movies'] });
    queryClient.invalidateQueries({ queryKey: ['collections'] });
    const failed = results.filter((result) => result.status === 'rejected').length;
    const added = targets.filter((_, index) => results[index].status === 'fulfilled');
    setSaving(false);
    // Los que fallaron quedan seleccionados para reintentar.
    setSelectedIds(new Set(targets.filter((_, index) => results[index].status === 'rejected').map((movie) => movie.id)));
    if (added.length) {
      setFailedCount(failed);
      setAddedTitles(added);
      return;
    }
    setError(`No se pudieron agregar los títulos (${failed}). Volvé a intentarlo.`);
  };

  const keepAdding = () => {
    setAddedTitles(null);
    setFailedCount(0);
    setError('');
    clearFilters();
  };

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-ink/55 p-3 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="collection-add-titles-title">
      <div className="movie-detail-modal flex max-h-[92vh] w-full min-w-0 max-w-5xl flex-col overflow-hidden rounded-md bg-canvas shadow-xl">
        <header className="flex min-h-16 items-center gap-3 border-b border-slate-200 bg-white px-5">
          <h2 id="collection-add-titles-title" className="min-w-0 truncate font-bebas text-2xl uppercase text-ink">Agregar títulos a colección {collection.name}</h2>
          <button type="button" onClick={onClose} className="icon-button ml-auto shrink-0 border-0 shadow-none" title="Cerrar" aria-label="Cerrar"><X className="h-5 w-5" /></button>
        </header>
        <div className="min-w-0 border-b border-slate-200 p-3 sm:px-5">
          <div className="flex items-center gap-2">
            <label className="relative block min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input autoFocus type="search" value={search} onChange={(event) => setSearch(event.target.value)} className="control w-full pl-9" placeholder="Buscar en mi biblioteca" />
            </label>
            <button type="button" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((current) => !current)} className={`library-toolbar-menu-button inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-md border px-3 text-xs font-semibold uppercase transition-colors ${filtersOpen || !noFilters ? 'border-coral bg-coral text-white shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'}`}>
              <Filter className="h-3.5 w-3.5 shrink-0" />
              <span>Filtrar</span>
              <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
          {filtersOpen && (
            <div className="mt-3 space-y-1.5">
              <div className="grid w-full grid-cols-1 gap-1.5 sm:flex sm:flex-row sm:items-start sm:gap-2">
                <div className="min-w-0 flex-1">
                <FilterSelect
                  compact
                  label="Género"
                  placeholder="Filtrar por género"
                  searchPlaceholder="Buscar género..."
                  plural="seleccionado{s}"
                  options={genreOptions.map((genre) => {
                    const iconImage = getGenreIconImage(genre);
                    return { id: genre, label: genre, icon: iconImage ? <img src={iconImage} alt="" className="h-6 w-6 shrink-0 object-contain" loading="lazy" /> : <span className="grid h-6 w-6 shrink-0 place-items-center" aria-hidden="true"><Tags className="h-4 w-4 text-aqua" /></span> };
                  })}
                  selected={genreFilter}
                  onToggle={(id) => toggleIn(setGenreFilter, id)}
                />
                {filterChips(genreFilter.map((genre) => ({ key: genre, label: genre, onRemove: () => toggleIn(setGenreFilter, genre) })), 'género')}
                </div>
                <div className="min-w-0 flex-1">
                <FilterSelect
                  compact
                  label="Plataforma"
                  placeholder="Filtrar por plataforma"
                  searchPlaceholder="Buscar plataforma..."
                  plural="seleccionada{s}"
                  options={platformOptions.map((name) => ({ id: name, label: name, icon: <FilterPlatformIcon name={name} /> }))}
                  selected={platformFilter}
                  onToggle={(id) => toggleIn(setPlatformFilter, id)}
                />
                {filterChips(platformFilter.map((name) => ({ key: name, label: name, onRemove: () => toggleIn(setPlatformFilter, name) })), 'plataforma')}
                </div>
                <div className="min-w-0 flex-1">
                <FilterSelect
                  compact
                  label="Colección"
                  placeholder="Filtrar por colección"
                  searchPlaceholder="Buscar colección..."
                  plural="seleccionada{s}"
                  options={(collectionsQuery.data || []).filter((item) => item.id !== collection.id).map((item) => ({ id: item.id, label: item.name }))}
                  selected={collectionFilter}
                  onToggle={(id) => toggleIn(setCollectionFilter, id)}
                />
                {filterChips(collectionFilter.map((id) => ({ key: id, label: (collectionsQuery.data || []).find((item) => item.id === id)?.name || id, onRemove: () => toggleIn(setCollectionFilter, id) })), 'colección')}
                </div>
                <div className="min-w-0 flex-1">
                  <label htmlFor="collection-add-year-filter" className="field-label">Año</label>
                  <input id="collection-add-year-filter" className="control h-8 w-full py-0 text-xs" type="text" inputMode="numeric" value={yearDraft} onChange={(event) => setYearDraft(event.target.value.replace(/\D/g, '').slice(0, 4))} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); const value = Number(yearDraft); if (yearDraft.length === 4 && !yearFilter.includes(value)) setYearFilter((current) => [...current, value]); setYearDraft(''); } }} placeholder="Escribir y Enter" aria-label="Agregar año" />
                {filterChips(yearFilter.map((year) => ({ key: String(year), label: String(year), onRemove: () => toggleIn(setYearFilter, year) })), 'año')}
                </div>
              </div>
              <div className="grid w-full grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-2 md:grid-cols-7">
                <button type="button" aria-pressed={typeFilter === 'movie'} onClick={() => setTypeFilter(typeFilter === 'movie' ? 'all' : 'movie')} className={filterButtonClass(typeFilter === 'movie')}><Film className="h-4 w-4 shrink-0" /><span className="whitespace-nowrap">Película</span></button>
                <button type="button" aria-pressed={typeFilter === 'series'} onClick={() => setTypeFilter(typeFilter === 'series' ? 'all' : 'series')} className={filterButtonClass(typeFilter === 'series')}><Tv className="h-4 w-4 shrink-0" /><span className="whitespace-nowrap">Serie</span></button>
                <button type="button" aria-pressed={watchedFilter === 'watched'} onClick={() => setWatchedFilter(watchedFilter === 'watched' ? 'all' : 'watched')} className={filterButtonClass(watchedFilter === 'watched')}><Eye className="h-4 w-4 shrink-0" /><span className="whitespace-nowrap">Watched</span></button>
                <button type="button" aria-pressed={watchedFilter === 'unwatched'} onClick={() => setWatchedFilter(watchedFilter === 'unwatched' ? 'all' : 'unwatched')} className={filterButtonClass(watchedFilter === 'unwatched')}><EyeOff className="h-4 w-4 shrink-0" /><span className="whitespace-nowrap">Unwatched</span></button>
                <button type="button" aria-pressed={likeFilter} onClick={() => setLikeFilter((current) => !current)} className={filterButtonClass(likeFilter)}><Heart className={`h-4 w-4 shrink-0 ${likeFilter ? 'fill-current' : ''}`} /><span className="whitespace-nowrap">Like</span></button>
                <button type="button" aria-pressed={watchlistFilter} onClick={() => setWatchlistFilter((current) => !current)} className={filterButtonClass(watchlistFilter)}><Bookmark className={`h-4 w-4 shrink-0 ${watchlistFilter ? 'fill-current' : ''}`} /><span className="whitespace-nowrap">Watchlist</span></button>
                <button type="button" aria-pressed={noFilters} onClick={clearFilters} className={`${filterButtonClass(noFilters)} col-start-2 sm:col-start-auto`}><span className="whitespace-nowrap">Todos</span></button>
              </div>
            </div>
          )}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500">Mostrando {movies.length} de {moviesQuery.data?.length || 0} títulos · {selectedIds.size} seleccionado{selectedIds.size === 1 ? '' : 's'}</p>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={selectAllVisible} disabled={!selectableVisible.length || allVisibleSelected} className="secondary-button h-8 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-40">Seleccionar todos</button>
              <button type="button" onClick={clearSelection} disabled={!selectedIds.size} className="secondary-button h-8 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-40">Quitar selección</button>
              <button type="button" onClick={clearFilters} disabled={noFilters} className="secondary-button h-8 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-40">Limpiar filtros</button>
            </div>
          </div>
        </div>
        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-5">
          {moviesQuery.isLoading ? (
            <div className="grid h-48 place-items-center"><Loader2 className="h-8 w-8 animate-spin text-aqua" /></div>
          ) : movies.length ? (
            <div className="grid min-w-0 grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
              {movies.map((movie) => {
                const poster = posterFor(movie);
                const inCollection = alreadyInCollection.has(movie.id);
                const selected = selectedIds.has(movie.id);
                return (
                  <button key={movie.id} type="button" onClick={() => toggle(movie)} disabled={inCollection} aria-pressed={selected} className={`group min-w-0 text-left ${inCollection ? 'cursor-not-allowed opacity-60' : ''}`} title={inCollection ? 'Ya está en la colección' : movie.spanishTitle || movie.originalTitle}>
                    <span className={`relative block aspect-[2/3] overflow-hidden rounded-md bg-slate-100 ring-2 transition ${selected ? 'ring-coral' : 'ring-transparent group-hover:ring-aqua'}`}>
                      {poster ? <img src={poster} alt={movie.originalTitle} className="h-full w-full object-cover" loading="lazy" /> : <span className="grid h-full place-items-center">{movie.type === 'series' ? <Tv className="h-8 w-8 text-aqua/70" /> : <Film className="h-8 w-8 text-aqua/70" />}</span>}
                      <span className={`absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded border-2 ${selected || inCollection ? 'border-coral bg-coral text-white' : 'border-white bg-white/90 text-transparent'}`}><Check className="h-3.5 w-3.5" strokeWidth={3} /></span>
                      {inCollection && <span className="absolute inset-x-0 bottom-0 bg-black/70 px-1 py-0.5 text-center text-[10px] font-semibold uppercase text-white">En la colección</span>}
                    </span>
                    <span className="mt-1.5 block truncate text-xs font-semibold text-ink">{movie.spanishTitle || movie.originalTitle}</span>
                    <span className="block truncate text-[11px] text-slate-500">{movie.year || ''}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="grid h-40 place-items-center text-sm text-slate-500">{moviesQuery.data?.length ? 'No hay coincidencias.' : 'Tu biblioteca está vacía.'}</p>
          )}
        </div>
        {error && <p className="mx-5 mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <footer className="flex justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4">
          <button type="button" onClick={onClose} className="secondary-button">Cancelar</button>
          <button type="button" onClick={() => void save()} disabled={!selectedIds.size || saving} className="primary-button">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Agregar{selectedIds.size ? ` ${selectedIds.size}` : ''}</button>
        </footer>
      </div>
      {addedTitles && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-ink/55 p-4" role="dialog" aria-modal="true" aria-labelledby="collection-added-titles-title">
          <div className="movie-detail-modal flex max-h-[88vh] w-full min-w-0 max-w-md flex-col overflow-hidden rounded-md border border-slate-200 bg-canvas shadow-2xl">
            <header className="shrink-0 border-b border-slate-200 bg-white px-5 py-4">
              <h2 id="collection-added-titles-title" className="font-bebas text-2xl uppercase tracking-wide text-ink">
                {addedTitles.length} {addedTitles.length === 1 ? 'título fue agregado' : 'títulos fueron agregados'} a la colección {collection.name}
              </h2>
            </header>
            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-5 text-sm text-slate-600">
              {addedTitles.map((movie) => (
                <li key={movie.id} className="truncate">• {movie.spanishTitle || movie.originalTitle}{movie.year ? ` (${movie.year})` : ''}</li>
              ))}
            </ul>
            {failedCount > 0 && <p className="mx-5 mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">No se pudieron agregar {failedCount} {failedCount === 1 ? 'título' : 'títulos'}. Quedaron seleccionados para reintentar.</p>}
            <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4">
              <button type="button" onClick={keepAdding} className="secondary-button">Seguir agregando</button>
              <button type="button" onClick={onClose} className="primary-button min-w-28">Finalizar</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};
