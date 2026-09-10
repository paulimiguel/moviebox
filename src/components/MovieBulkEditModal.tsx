import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Bookmark, Eye, Heart, Loader2, X } from 'lucide-react';
import { api } from '@/services/api';
import { movieToInput } from '@/utils/movieInput';
import type { MovieCollection, MovieItem, MovieType } from '@/types/movie';

export const MovieBulkEditModal = ({ movies, genres, platforms, collections, onClose, onSaved }: {
  movies: MovieItem[];
  genres: { id: string; name: string }[];
  platforms: { id: string; name: string }[];
  collections: MovieCollection[];
  onClose: () => void;
  onSaved: () => void;
}) => {
  const [type, setType] = useState<'' | MovieType>('');
  const [year, setYear] = useState('');
  const [genre, setGenre] = useState('');
  const [platform, setPlatform] = useState('');
  const [collectionId, setCollectionId] = useState('');
  const [markWatched, setMarkWatched] = useState(false);
  const [markFavorite, setMarkFavorite] = useState(false);
  const [markWatchlist, setMarkWatchlist] = useState(false);
  const [error, setError] = useState('');
  const numericYear = year ? Number(year) : null;
  const validYear = numericYear === null || (Number.isInteger(numericYear) && numericYear >= 1888 && numericYear <= 2200);
  const mutation = useMutation({
    mutationFn: () => Promise.all(movies.map((movie) => {
      const input = movieToInput(movie);
      if (type) input.type = type;
      if (numericYear !== null) input.year = numericYear;
      if (markWatched) input.watched = true;
      if (markFavorite) input.favorite = true;
      if (markWatchlist) input.watchlist = true;
      if (genre && !input.genres?.some((item) => item.name === genre)) input.genres = [...(input.genres || []), { name: genre, order: input.genres?.length || 0 }];
      if (platform && !input.platforms?.some((item) => item.name === platform)) input.platforms = [...(input.platforms || []), { name: platform, order: input.platforms?.length || 0, isPrimary: !input.platforms?.length }];
      if (collectionId && !input.collectionIds?.includes(collectionId)) input.collectionIds = [...(input.collectionIds || []), collectionId];
      return api.movies.update(movie.id, input);
    })),
    onSuccess: onSaved,
    onError: (reason: Error) => setError(reason.message),
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/55 sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="bulk-edit-title">
      <div className="w-full rounded-t-md bg-white shadow-xl sm:max-w-xl sm:rounded-md">
        <header className="flex h-16 items-center border-b border-slate-200 px-4 sm:px-6"><div><h2 id="bulk-edit-title" className="font-semibold text-ink">Editar movies</h2><p className="text-xs text-slate-500">{movies.length} seleccionadas</p></div><button type="button" onClick={onClose} className="icon-button ml-auto border-0 shadow-none" title="Cerrar" aria-label="Cerrar"><X className="h-5 w-5" /></button></header>
        <div className="grid gap-4 bg-canvas p-4 sm:grid-cols-2 sm:p-6">
          <label><span className="field-label">Tipo</span><select className="control w-full" value={type} onChange={(event) => setType(event.target.value as '' | MovieType)}><option value="">No cambiar</option><option value="movie">Película</option><option value="series">Serie</option></select></label>
          <label><span className="field-label">Año</span><input className="control w-full" type="number" min="1888" max="2200" value={year} onChange={(event) => setYear(event.target.value)} placeholder="No cambiar" /></label>
          <label><span className="field-label">Género</span><select className="control w-full" value={genre} onChange={(event) => setGenre(event.target.value)}><option value="">No cambiar</option>{genres.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
          <label><span className="field-label">Plataforma</span><select className="control w-full" value={platform} onChange={(event) => setPlatform(event.target.value)}><option value="">No cambiar</option>{platforms.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
          <label><span className="field-label">Colección</span><select className="control w-full" value={collectionId} onChange={(event) => setCollectionId(event.target.value)}><option value="">No cambiar</option>{collections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <div>
            <span className="field-label">Estado</span>
            <div className="flex flex-wrap gap-2">
              <button type="button" aria-pressed={markWatched} onClick={() => setMarkWatched((current) => !current)} className={`inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-semibold transition-colors ${markWatched ? 'border-coral bg-coral text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}><Eye className="h-4 w-4" />Vista</button>
              <button type="button" aria-pressed={markFavorite} onClick={() => setMarkFavorite((current) => !current)} className={`inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-semibold transition-colors ${markFavorite ? 'border-coral bg-coral text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}><Heart className={`h-4 w-4 ${markFavorite ? 'fill-current' : ''}`} />Like</button>
              <button type="button" aria-pressed={markWatchlist} onClick={() => setMarkWatchlist((current) => !current)} className={`inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-semibold transition-colors ${markWatchlist ? 'border-aqua bg-aqua text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}><Bookmark className={`h-4 w-4 ${markWatchlist ? 'fill-current' : ''}`} />Watchlist</button>
            </div>
          </div>
          {!validYear && <p className="text-sm text-red-600 sm:col-span-2">El año debe estar entre 1888 y 2200.</p>}
          {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{error}</p>}
        </div>
        <footer className="flex h-16 items-center justify-end gap-2 border-t border-slate-200 px-4 sm:px-6"><button type="button" onClick={onClose} className="secondary-button">Cancelar</button><button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending || !validYear || (!type && !year && !genre && !platform && !collectionId && !markWatched && !markFavorite && !markWatchlist)} className="primary-button">{mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Aplicar cambios</button></footer>
      </div>
    </div>
  );
};
