import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Film, Loader2, Search, Tv } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { api } from '@/services/api';
import type { ImdbSearchCandidate } from '@/types/movie';

const MAX_NAMES = 50;
const SEARCH_BATCH_SIZE = 4;

interface SearchGroup {
  name: string;
  candidates: ImdbSearchCandidate[];
  error?: string;
}

const PosterThumbnail = ({ candidate }: { candidate: ImdbSearchCandidate }) => {
  const [failed, setFailed] = useState(false);

  if (!candidate.posterUrl || failed) {
    return (
      <div className="grid h-24 w-16 shrink-0 place-items-center rounded-sm bg-slate-100 text-slate-400">
        {candidate.type === 'movie' ? <Film className="h-6 w-6" /> : <Tv className="h-6 w-6" />}
      </div>
    );
  }

  return <img src={candidate.posterUrl} alt="" className="h-24 w-16 shrink-0 rounded-sm object-cover" onError={() => setFailed(true)} />;
};

export const AddMoviesPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [groups, setGroups] = useState<SearchGroup[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<Record<number, string>>({});
  const [error, setError] = useState('');

  const names = useMemo(() => {
    const seen = new Set<string>();
    return query.split(/\r?\n/).map((name) => name.trim()).filter((name) => {
      const normalized = name.toLocaleLowerCase('es');
      if (!name || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
  }, [query]);

  const search = useMutation({
    mutationFn: async (movieNames: string[]) => {
      const results: SearchGroup[] = [];
      for (let index = 0; index < movieNames.length; index += SEARCH_BATCH_SIZE) {
        const batch = movieNames.slice(index, index + SEARCH_BATCH_SIZE);
        results.push(...await Promise.all(batch.map(async (name) => {
          try {
            return { name, candidates: await api.imdb.search(name) };
          } catch (reason) {
            return {
              name,
              candidates: [],
              error: reason instanceof Error ? reason.message : 'No se pudo realizar la búsqueda',
            };
          }
        })));
      }
      return results;
    },
    onSuccess: (results) => {
      setGroups(results);
      setSelectedIds(Object.fromEntries(results.flatMap((group, index) => group.candidates[0] ? [[index, group.candidates[0].imdbId]] : [])));
      const failedCount = results.filter((group) => group.error).length;
      setError(failedCount ? `No se pudieron buscar ${failedCount} de ${results.length} títulos. Podés volver a intentarlo.` : '');
    },
    onError: (reason: Error) => setError(reason.message),
  });

  const selectedCandidates = useMemo(() => (groups || []).flatMap((group, index) => {
    const candidate = group.candidates.find((item) => item.imdbId === selectedIds[index]);
    return candidate ? [candidate] : [];
  }), [groups, selectedIds]);

  const importMovies = useMutation({
    mutationFn: async (candidates: ImdbSearchCandidate[]) => {
      const failures: string[] = [];
      const savedIds: string[] = [];
      for (const candidate of candidates) {
        try {
          const data = await api.imdb.import({ imdbId: candidate.imdbId, type: candidate.type });
          await api.movies.create({ ...data, favorite: false, watched: false, watchlist: false, personalRating: null, collectionIds: [] });
          savedIds.push(candidate.imdbId);
        } catch (reason) {
          failures.push(`${candidate.title}: ${reason instanceof Error ? reason.message : 'No se pudo importar'}`);
        }
      }
      return { savedIds, failures };
    },
    onSuccess: ({ savedIds, failures }) => {
      if (savedIds.length) {
        queryClient.invalidateQueries({ queryKey: ['movies'] });
        queryClient.invalidateQueries({ queryKey: ['metadata'] });
        queryClient.invalidateQueries({ queryKey: ['collections'] });
      }
      if (failures.length) {
        setSelectedIds((current) => Object.fromEntries(Object.entries(current).filter(([, imdbId]) => !savedIds.includes(imdbId))));
        setError(`${savedIds.length ? `${savedIds.length} agregadas. ` : ''}${failures.join(' | ')}`);
        return;
      }
      navigate('/');
    },
    onError: (reason: Error) => setError(reason.message),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!names.length) return;
    if (names.length > MAX_NAMES) {
      setError(`Podés buscar hasta ${MAX_NAMES} películas o series por vez.`);
      return;
    }
    setError('');
    setGroups(null);
    search.mutate(names);
  };

  const clearSearch = () => {
    setQuery('');
    setGroups(null);
    setSelectedIds({});
    setError('');
  };

  return (
    <main className="min-h-screen bg-canvas">
      <Header />
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Agregar películas y series</h1>
          <p className="mt-1 text-sm text-slate-500">Buscá títulos nuevos y agregalos a tu biblioteca.</p>
        </div>

        <form onSubmit={submit} className="mt-6 rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <label>
            <span className="field-label">Títulos a buscar</span>
            <textarea autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ingresá un título por línea" className="control min-h-32 w-full py-2" />
          </label>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className={`text-xs ${names.length > MAX_NAMES ? 'font-semibold text-red-600' : 'text-slate-500'}`}>{names.length} de {MAX_NAMES} títulos</span>
            <div className="flex gap-2">
              <button type="button" onClick={clearSearch} className="secondary-button" disabled={!query && !groups}>Limpiar</button>
              <button type="submit" className="primary-button" disabled={!names.length || names.length > MAX_NAMES || search.isPending || importMovies.isPending}>
                {search.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Buscar
              </button>
            </div>
          </div>
        </form>

        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {groups && (
          <div className="mt-6 space-y-4">
            {groups.map((group, groupIndex) => (
              <section key={`${group.name}-${groupIndex}`} className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                  <h2 className="min-w-0 flex-1 truncate font-semibold text-ink">Resultados para “{group.name}”</h2>
                  {selectedIds[groupIndex] && (
                    <button type="button" onClick={() => setSelectedIds((current) => { const next = { ...current }; delete next[groupIndex]; return next; })} className="text-xs font-semibold text-slate-400 hover:text-coral">Omitir</button>
                  )}
                </div>
                {group.candidates.length ? (
                  <div className="divide-y divide-slate-100">
                    {group.candidates.slice(0, 5).map((candidate) => {
                      const selected = selectedIds[groupIndex] === candidate.imdbId;
                      return (
                        <label key={`${candidate.type}-${candidate.imdbId}`} className={`flex cursor-pointer items-center gap-4 p-3 sm:px-4 ${selected ? 'bg-mist' : 'hover:bg-slate-50'}`}>
                          <input type="radio" name={`add-result-${groupIndex}`} checked={selected} onChange={() => setSelectedIds((current) => ({ ...current, [groupIndex]: candidate.imdbId }))} className="h-4 w-4 shrink-0 accent-aqua" />
                          <PosterThumbnail candidate={candidate} />
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold text-ink">{candidate.title}</span>
                            {candidate.originalTitle !== candidate.title && <span className="block truncate text-sm text-slate-500">{candidate.originalTitle}</span>}
                            <span className="mt-1 block text-xs font-medium uppercase text-slate-400">{candidate.type === 'movie' ? 'Película' : 'Serie'}{candidate.year ? ` · ${candidate.year}` : ''}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : <p className={`px-4 py-5 text-sm ${group.error ? 'text-red-600' : 'text-slate-500'}`}>{group.error || 'No se encontraron coincidencias.'}</p>}
              </section>
            ))}

            <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 bg-canvas/95 py-4 backdrop-blur">
              <span className="text-sm text-slate-500">{selectedCandidates.length} seleccionadas</span>
              <button type="button" onClick={() => { setError(''); importMovies.mutate(selectedCandidates); }} className="primary-button" disabled={!selectedCandidates.length || importMovies.isPending}>
                {importMovies.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Agregar {selectedCandidates.length}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};
