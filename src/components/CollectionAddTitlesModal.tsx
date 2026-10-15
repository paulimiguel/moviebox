import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Film, Loader2, Search, Tv, X } from 'lucide-react';
import { api, resolveMovieImageUrl } from '@/services/api';
import type { MovieCollection, MovieItem } from '@/types/movie';

const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('es');

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

  const alreadyInCollection = useMemo(() => new Set(collection.movieIds), [collection.movieIds]);
  const movies = useMemo(() => {
    const query = normalize(search.trim());
    return [...(moviesQuery.data || [])]
      .filter((movie) => !query || normalize(`${movie.originalTitle} ${movie.spanishTitle || ''}`).includes(query))
      .sort((left, right) => (left.spanishTitle || left.originalTitle).localeCompare(right.spanishTitle || right.originalTitle, 'es', { sensitivity: 'base' }));
  }, [moviesQuery.data, search]);

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
    setSaving(false);
    if (failed) {
      setError(`No se pudieron agregar ${failed} de ${targets.length} títulos. Los demás se agregaron.`);
      setSelectedIds(new Set(targets.filter((_, index) => results[index].status === 'rejected').map((movie) => movie.id)));
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-ink/55 p-3 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="collection-add-titles-title">
      <div className="movie-detail-modal flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-md bg-canvas shadow-xl">
        <header className="flex min-h-16 items-center gap-3 border-b border-slate-200 bg-white px-5">
          <h2 id="collection-add-titles-title" className="min-w-0 truncate font-bebas text-2xl uppercase text-ink">Agregar títulos a {collection.name}</h2>
          <button type="button" onClick={onClose} className="icon-button ml-auto shrink-0 border-0 shadow-none" title="Cerrar" aria-label="Cerrar"><X className="h-5 w-5" /></button>
        </header>
        <div className="border-b border-slate-200 p-3 sm:px-5">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input autoFocus type="search" value={search} onChange={(event) => setSearch(event.target.value)} className="control w-full pl-9" placeholder="Buscar en mi biblioteca" />
          </label>
          <p className="mt-2 text-xs text-slate-500">Mostrando {movies.length} de {moviesQuery.data?.length || 0} títulos · {selectedIds.size} seleccionado{selectedIds.size === 1 ? '' : 's'}</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
          {moviesQuery.isLoading ? (
            <div className="grid h-48 place-items-center"><Loader2 className="h-8 w-8 animate-spin text-aqua" /></div>
          ) : movies.length ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
              {movies.map((movie) => {
                const poster = posterFor(movie);
                const inCollection = alreadyInCollection.has(movie.id);
                const selected = selectedIds.has(movie.id);
                return (
                  <button key={movie.id} type="button" onClick={() => toggle(movie)} disabled={inCollection} aria-pressed={selected} className={`group text-left ${inCollection ? 'cursor-not-allowed opacity-60' : ''}`} title={inCollection ? 'Ya está en la colección' : movie.spanishTitle || movie.originalTitle}>
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
    </div>
  );
};
