import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Download, Film, Loader2, Search, Tv, X } from 'lucide-react';
import { api } from '@/services/api';
import type { ImdbSearchCandidate, MovieItem } from '@/types/movie';

const PosterThumbnail = ({ candidate }: { candidate: ImdbSearchCandidate }) => {
  const [failed, setFailed] = useState(false);
  if (!candidate.posterUrl || failed) {
    return (
      <div className="grid h-24 w-16 shrink-0 place-items-center rounded bg-slate-100 text-slate-400">
        {candidate.type === 'movie' ? <Film className="h-6 w-6" /> : <Tv className="h-6 w-6" />}
      </div>
    );
  }

  return (
    <img
      src={candidate.posterUrl}
      alt=""
      className="h-24 w-16 shrink-0 rounded object-cover"
      onError={() => setFailed(true)}
    />
  );
};

export const MovieImportModal = ({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (movie: MovieItem) => void;
}) => {
  const [query, setQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState('');

  const search = useMutation({
    mutationFn: api.imdb.search,
    onSuccess: () => setHasSearched(true),
    onError: (reason: Error) => setError(reason.message),
  });
  const importMovie = useMutation({
    mutationFn: async (candidate: ImdbSearchCandidate) => {
      const data = await api.imdb.import({
        imdbId: candidate.imdbId,
        type: candidate.type,
      });
      return api.movies.create({
        ...data,
        favorite: false,
        watched: false,
        personalRating: null,
        collectionIds: [],
      });
    },
    onSuccess: onSaved,
    onError: (reason: Error) => setError(reason.message),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    setError('');
    search.mutate(value);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/55 sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="movie-import-title"
    >
      <div className="max-h-[92vh] w-full overflow-hidden rounded-t-md bg-canvas shadow-xl sm:max-w-2xl sm:rounded-md">
        <div className="flex h-16 items-center border-b border-slate-200 bg-white px-4 sm:px-6">
          <h2 id="movie-import-title" className="text-lg font-semibold text-ink">Importar movie</h2>
          <button type="button" onClick={onClose} className="icon-button ml-auto border-0 shadow-none" title="Cerrar" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(92vh-64px)] overflow-y-auto p-4 sm:p-6">
          <form onSubmit={submit} className="flex gap-2">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Nombre de la pelicula o serie</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="control w-full pl-9"
                placeholder="Nombre de la pelicula o serie"
              />
            </label>
            <button type="submit" className="primary-button" disabled={!query.trim() || search.isPending || importMovie.isPending} aria-label="Buscar">
              {search.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="hidden sm:inline">Buscar</span>
            </button>
          </form>

          {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          <div className="mt-5 space-y-2">
            {search.data?.map((candidate) => {
              const importing = importMovie.isPending && importMovie.variables?.imdbId === candidate.imdbId;
              return (
                <div key={`${candidate.type}-${candidate.imdbId}`} className="flex min-h-24 items-center gap-3 rounded-md border border-slate-200 bg-white p-2.5">
                  <PosterThumbnail candidate={candidate} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">{candidate.title}</p>
                    {candidate.originalTitle !== candidate.title && <p className="truncate text-sm text-slate-500">{candidate.originalTitle}</p>}
                    <p className="mt-1 text-xs font-medium uppercase text-slate-400">
                      {candidate.type === 'movie' ? 'Pelicula' : 'Serie'}{candidate.year ? ` · ${candidate.year}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setError(''); importMovie.mutate(candidate); }}
                    className="secondary-button shrink-0 gap-2 px-3"
                    disabled={importMovie.isPending}
                    aria-label={`Importar ${candidate.title}`}
                  >
                    {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    <span className="hidden sm:inline">Importar</span>
                  </button>
                </div>
              );
            })}
          </div>

          {hasSearched && !search.isPending && search.data?.length === 0 && (
            <div className="grid min-h-48 place-items-center text-center text-sm text-slate-500">
              No encontramos peliculas o series con ese nombre.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
