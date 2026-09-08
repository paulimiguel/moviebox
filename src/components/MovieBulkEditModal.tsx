import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2, X } from 'lucide-react';
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
  const [genre, setGenre] = useState('');
  const [platform, setPlatform] = useState('');
  const [collectionId, setCollectionId] = useState('');
  const [error, setError] = useState('');
  const mutation = useMutation({
    mutationFn: () => Promise.all(movies.map((movie) => {
      const input = movieToInput(movie);
      if (type) input.type = type;
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
          <label><span className="field-label">Tipo</span><select className="control w-full" value={type} onChange={(event) => setType(event.target.value as '' | MovieType)}><option value="">No cambiar</option><option value="movie">Pelicula</option><option value="series">Serie</option></select></label>
          <label><span className="field-label">Agregar genero</span><select className="control w-full" value={genre} onChange={(event) => setGenre(event.target.value)}><option value="">No agregar</option>{genres.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
          <label><span className="field-label">Agregar plataforma</span><select className="control w-full" value={platform} onChange={(event) => setPlatform(event.target.value)}><option value="">No agregar</option>{platforms.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
          <label><span className="field-label">Agregar a coleccion</span><select className="control w-full" value={collectionId} onChange={(event) => setCollectionId(event.target.value)}><option value="">No agregar</option>{collections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{error}</p>}
        </div>
        <footer className="flex h-16 items-center justify-end gap-2 border-t border-slate-200 px-4 sm:px-6"><button type="button" onClick={onClose} className="secondary-button">Cancelar</button><button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending || (!type && !genre && !platform && !collectionId)} className="primary-button">{mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Aplicar cambios</button></footer>
      </div>
    </div>
  );
};
