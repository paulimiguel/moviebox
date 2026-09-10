import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Film, Loader2, Search, Tv, X } from 'lucide-react';
import { api } from '@/services/api';
import type { ImdbSearchCandidate, MovieItem } from '@/types/movie';

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
    return <div className="grid h-20 w-14 shrink-0 place-items-center bg-slate-100 text-slate-400">{candidate.type === 'movie' ? <Film className="h-5 w-5" /> : <Tv className="h-5 w-5" />}</div>;
  }
  return <img src={candidate.posterUrl} alt="" className="h-20 w-14 shrink-0 object-cover" onError={() => setFailed(true)} />;
};

export const MovieImportModal = ({ onClose, onSaved }: { onClose: () => void; onSaved: (movie?: MovieItem) => void }) => {
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
        setError(`${savedIds.length ? `${savedIds.length} importadas. ` : ''}${failures.join(' | ')}`);
        return;
      }
      onSaved();
    },
    onError: (reason: Error) => setError(reason.message),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!names.length) return;
    if (names.length > MAX_NAMES) {
      setError(`Podes importar hasta ${MAX_NAMES} peliculas o series por vez.`);
      return;
    }
    setError('');
    setGroups(null);
    search.mutate(names);
  };

  const clearList = () => {
    setQuery('');
    setGroups(null);
    setSelectedIds({});
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/55 sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="movie-import-title">
      <div className="max-h-[94vh] w-full overflow-hidden rounded-t-md bg-canvas shadow-xl sm:max-w-3xl sm:rounded-md">
        <div className="flex h-16 items-center border-b border-slate-200 bg-white px-4 sm:px-6">
          <div><h2 id="movie-import-title" className="text-lg font-semibold text-ink">Importar películas y series</h2><p className="text-xs text-slate-500">Ingresá un nombre por línea. Máximo {MAX_NAMES}.</p></div>
          <button type="button" onClick={onClose} className="icon-button ml-auto border-0 shadow-none" title="Cerrar" aria-label="Cerrar"><X className="h-5 w-5" /></button>
        </div>

        <div className="max-h-[calc(94vh-64px)] overflow-y-auto p-4 sm:p-6">
          <form onSubmit={submit}>
            <label><span className="field-label">Nombres, uno por línea</span><textarea autoFocus value={query} onChange={(event) => setQuery(event.target.value)} className="control min-h-36 w-full py-2" /></label>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className={`text-xs ${names.length > MAX_NAMES ? 'font-semibold text-red-600' : 'text-slate-500'}`}>{names.length} de {MAX_NAMES}</span>
              <div className="flex gap-2">
                <button type="button" onClick={clearList} className="secondary-button" disabled={!query && !groups}>Limpiar lista</button>
                <button type="submit" className="primary-button" disabled={!names.length || names.length > MAX_NAMES || search.isPending || importMovies.isPending}>{search.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}Buscar</button>
              </div>
            </div>
          </form>

          {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          {groups && <div className="mt-5 space-y-4">
            {groups.map((group, groupIndex) => (
              <section key={`${group.name}-${groupIndex}`} className="overflow-hidden rounded-md border border-slate-200 bg-white">
                <div className="flex items-center gap-3 border-b border-slate-100 px-3 py-2"><h3 className="min-w-0 flex-1 truncate font-semibold text-ink">{group.name}</h3>{selectedIds[groupIndex] && <button type="button" onClick={() => setSelectedIds((current) => { const next = { ...current }; delete next[groupIndex]; return next; })} className="text-xs font-semibold text-slate-400 hover:text-coral">Omitir</button>}</div>
                {group.candidates.length ? <div className="divide-y divide-slate-100">
                  {group.candidates.slice(0, 5).map((candidate) => {
                    const selected = selectedIds[groupIndex] === candidate.imdbId;
                    return <label key={`${candidate.type}-${candidate.imdbId}`} className={`flex cursor-pointer items-center gap-3 p-2.5 ${selected ? 'bg-mist' : 'hover:bg-slate-50'}`}>
                      <input type="radio" name={`import-result-${groupIndex}`} checked={selected} onChange={() => setSelectedIds((current) => ({ ...current, [groupIndex]: candidate.imdbId }))} className="h-4 w-4 shrink-0 accent-aqua" />
                      <PosterThumbnail candidate={candidate} />
                      <span className="min-w-0 flex-1"><span className="block font-semibold text-ink">{candidate.title}</span>{candidate.originalTitle !== candidate.title && <span className="block truncate text-sm text-slate-500">{candidate.originalTitle}</span>}<span className="mt-1 block text-xs font-medium uppercase text-slate-400">{candidate.type === 'movie' ? 'Película' : 'Serie'}{candidate.year ? ` · ${candidate.year}` : ''}</span></span>
                    </label>;
                  })}
                </div> : <p className={`px-3 py-4 text-sm ${group.error ? 'text-red-600' : 'text-slate-500'}`}>{group.error || 'No se encontraron coincidencias.'}</p>}
              </section>
            ))}

            <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-slate-200 bg-canvas py-3">
              <span className="text-sm text-slate-500">{selectedCandidates.length} seleccionadas</span>
              <button type="button" onClick={() => { setError(''); importMovies.mutate(selectedCandidates); }} className="primary-button" disabled={!selectedCandidates.length || importMovies.isPending}>{importMovies.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Importar {selectedCandidates.length}</button>
            </div>
          </div>}
        </div>
      </div>
    </div>
  );
};
