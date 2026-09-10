import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, Download, FileSpreadsheet, FileText, Film, Loader2, Plus, RefreshCw, Search, Star, Tv, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { api } from '@/services/api';
import type { ImdbSearchCandidate, MovieTypeFilter, TmdbSuggestionCandidate } from '@/types/movie';

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
  const [selectedIds, setSelectedIds] = useState<Record<number, string[]>>({});
  const [error, setError] = useState('');
  const [suggestionSearch, setSuggestionSearch] = useState('');
  const [appliedSuggestionSearch, setAppliedSuggestionSearch] = useState('');
  const [suggestionType, setSuggestionType] = useState<MovieTypeFilter>('all');
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const txtInputRef = useRef<HTMLInputElement>(null);
  const spreadsheetInputRef = useRef<HTMLInputElement>(null);

  const suggestions = useQuery({
    queryKey: ['tmdb-suggestions', appliedSuggestionSearch],
    queryFn: () => api.tmdb.suggestions(appliedSuggestionSearch),
  });
  const library = useQuery({ queryKey: ['movies'], queryFn: api.movies.getAll });
  const visibleSuggestions = useMemo(() => (suggestions.data || []).filter((candidate) => (
    suggestionType === 'all' || candidate.type === suggestionType
  )), [suggestionType, suggestions.data]);
  const movieAlreadyAdded = (candidate: TmdbSuggestionCandidate) => (library.data || []).some((movie) => (
    movie.tmdbId === candidate.tmdbId || movie.imdbId === candidate.imdbId
  ));

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
      setSelectedIds({});
      const failedCount = results.filter((group) => group.error).length;
      setError(failedCount ? `No se pudieron buscar ${failedCount} de ${results.length} títulos. Podés volver a intentarlo.` : '');
    },
    onError: (reason: Error) => setError(reason.message),
  });

  const selectedCandidates = useMemo(() => (groups || []).flatMap((group, index) => {
    const groupIds = selectedIds[index] || [];
    return group.candidates.filter((item) => groupIds.includes(item.imdbId));
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
        setSelectedIds((current) => Object.fromEntries(Object.entries(current).flatMap(([index, imdbIds]) => {
          const remaining = imdbIds.filter((imdbId) => !savedIds.includes(imdbId));
          return remaining.length ? [[index, remaining]] : [];
        })));
        setError(`${savedIds.length ? `${savedIds.length} agregadas. ` : ''}${failures.join(' | ')}`);
        return;
      }
      navigate('/');
    },
    onError: (reason: Error) => setError(reason.message),
  });

  const importSuggestion = useMutation({
    mutationFn: async (candidate: TmdbSuggestionCandidate) => {
      const data = await api.imdb.import({ imdbId: candidate.imdbId, type: candidate.type });
      return api.movies.create({ ...data, favorite: false, watched: false, watchlist: false, personalRating: null, collectionIds: [] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      queryClient.invalidateQueries({ queryKey: ['metadata'] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      setError('');
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

  const loadImportedTitles = (titles: string[]) => {
    const headerNames = new Set(['titulo', 'title', 'pelicula', 'movie']);
    const cleaned = titles.map((title) => title.trim()).filter((title, index) => title && !(index === 0 && headerNames.has(title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es'))));
    setQuery(cleaned.join('\n'));
    setGroups(null);
    setSelectedIds({});
    setError(cleaned.length ? '' : 'El archivo no contiene títulos para buscar.');
    setBulkMenuOpen(false);
    setBulkDialogOpen(true);
  };

  const importTextFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    loadImportedTitles((await file.text()).split(/\r?\n/));
  };

  const importSpreadsheet = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) return loadImportedTitles([]);
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false });
      loadImportedTitles(rows.map((row) => String(row.find((cell) => String(cell ?? '').trim()) ?? '')));
    } catch {
      setError('No se pudo leer la planilla. Revisá que sea un archivo XLS o XLSX válido.');
      setBulkMenuOpen(false);
      setBulkDialogOpen(true);
    }
  };

  return (
    <main className="min-h-screen bg-canvas">
      <Header />
      <section className="library-toolbar sticky top-[72px] z-30 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto grid max-w-[1500px] gap-3 px-4 py-3 sm:px-6 xl:grid-cols-[300px_minmax(280px,1fr)_auto] xl:items-center">
          <div className="min-w-0">
            <h1 className="font-bebas truncate text-xl font-normal uppercase text-ink sm:text-2xl">Agregar títulos</h1>
            <p className="mt-0.5 truncate text-xs text-slate-500">Mostrando {visibleSuggestions.length} sugerencias de TMDB</p>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); const next = suggestionSearch.trim(); if (next === appliedSuggestionSearch) void suggestions.refetch(); else setAppliedSuggestionSearch(next); }} className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input autoFocus type="search" value={suggestionSearch} onChange={(event) => setSuggestionSearch(event.target.value)} className="control w-full pl-9 pr-20" placeholder="Buscar películas o series en TMDB" />
            <button type="submit" className="absolute right-1 top-1/2 h-8 -translate-y-1/2 rounded px-3 text-xs font-semibold uppercase text-coral hover:bg-red-50">Buscar</button>
          </form>
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'movie', 'series'] as MovieTypeFilter[]).map((type) => <button key={type} type="button" onClick={() => setSuggestionType(type)} className={`inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold uppercase ${suggestionType === type ? 'border-coral bg-coral text-white' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>{type === 'movie' ? <Film className="h-4 w-4" /> : type === 'series' ? <Tv className="h-4 w-4" /> : null}{type === 'all' ? 'Todo' : type === 'movie' ? 'Películas' : 'Series'}</button>)}
            <button type="button" onClick={() => { setSuggestionSearch(''); if (appliedSuggestionSearch) setAppliedSuggestionSearch(''); else void suggestions.refetch(); }} className="icon-button h-9 w-9" title="Actualizar sugerencias" aria-label="Actualizar sugerencias"><RefreshCw className={`h-4 w-4 ${suggestions.isFetching ? 'animate-spin' : ''}`} /></button>
            <div className="relative shrink-0" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setBulkMenuOpen(false); }}>
              <button type="button" onClick={() => setBulkMenuOpen((current) => !current)} className="secondary-button h-9 gap-1.5 px-3 text-xs uppercase" aria-expanded={bulkMenuOpen}>Buscar títulos<ChevronDown className={`h-4 w-4 transition-transform ${bulkMenuOpen ? 'rotate-180' : ''}`} /></button>
              {bulkMenuOpen && <div className="library-toolbar-dropdown absolute right-0 top-10 z-50 w-56 rounded-md border border-slate-200 bg-white p-1.5 shadow-card">
                <button type="button" onClick={() => { setBulkMenuOpen(false); setBulkDialogOpen(true); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"><Search className="h-4 w-4" />Buscar por título</button>
                <button type="button" onClick={() => txtInputRef.current?.click()} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"><FileText className="h-4 w-4" />Importar TXT</button>
                <button type="button" onClick={() => spreadsheetInputRef.current?.click()} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"><FileSpreadsheet className="h-4 w-4" />Importar XLS</button>
              </div>}
              <input ref={txtInputRef} type="file" accept=".txt,text/plain" onChange={(event) => void importTextFile(event)} className="hidden" />
              <input ref={spreadsheetInputRef} type="file" accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => void importSpreadsheet(event)} className="hidden" />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8">
        {!appliedSuggestionSearch && <h2 className="font-bebas text-2xl uppercase text-ink">Sugerencias</h2>}
        {suggestions.isLoading ? <div className="grid min-h-[360px] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-aqua" /></div> : suggestions.isError ? <div className="mt-4 rounded-md border border-red-100 bg-red-50 p-5 text-center"><p className="text-sm text-red-700">No se pudieron cargar las sugerencias de TMDB.</p><button type="button" onClick={() => suggestions.refetch()} className="secondary-button mt-3">Reintentar</button></div> : visibleSuggestions.length ? (
          <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {visibleSuggestions.map((candidate) => {
              const added = movieAlreadyAdded(candidate);
              const adding = importSuggestion.isPending && importSuggestion.variables?.tmdbId === candidate.tmdbId;
              return <article key={`${candidate.type}-${candidate.tmdbId}`} className="movie-card flex min-w-0 flex-col overflow-hidden rounded-md bg-white shadow-card">
                <div className="relative aspect-[2/3] bg-mist">
                  {candidate.posterUrl ? <img src={candidate.posterUrl} alt={candidate.title} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-aqua/70">{candidate.type === 'movie' ? <Film className="h-12 w-12" /> : <Tv className="h-12 w-12" />}</div>}
                  <span className={`absolute left-2 top-2 rounded px-2 py-1 text-[9px] font-semibold uppercase text-white shadow-sm ${candidate.type === 'series' ? 'bg-aqua' : 'bg-coral'}`}>{candidate.type === 'movie' ? 'Película' : 'Serie'}</span>
                </div>
                <div className="flex flex-1 flex-col p-3">
                  <h2 className="font-bebas line-clamp-2 text-xl uppercase leading-6 text-ink">{candidate.title}</h2>
                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">{candidate.year && <span className="font-semibold">{candidate.year}</span>}{candidate.rating != null && candidate.rating > 0 && <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{candidate.rating.toFixed(1)}</span>}</div>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{candidate.genres.join(', ') || 'Sin género'}</p>
                  <div className="mt-auto flex justify-end pt-3"><button type="button" onClick={() => importSuggestion.mutate(candidate)} disabled={added || importSuggestion.isPending} className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-[11px] font-semibold uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${added ? 'text-[#218f4c]' : 'bg-coral text-white hover:bg-[#dc493a]'}`}>{adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : added ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}{added ? 'Agregada' : adding ? 'Agregando' : 'Agregar'}</button></div>
                </div>
              </article>;
            })}
          </section>
        ) : <div className="grid min-h-[280px] place-items-center text-center"><div><Film className="mx-auto h-12 w-12 text-aqua" /><p className="mt-3 font-semibold text-ink">No hay sugerencias para mostrar</p></div></div>}

        {!bulkDialogOpen && error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {bulkDialogOpen && <div className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/55 sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="bulk-search-title">
          <div className="max-h-[94vh] w-full overflow-hidden rounded-t-md bg-canvas shadow-xl sm:max-w-4xl sm:rounded-md">
            <header className="flex min-h-16 items-center border-b border-slate-200 bg-white px-4 sm:px-6">
              <div><h2 id="bulk-search-title" className="font-bebas text-2xl uppercase text-ink">Buscar títulos</h2><p className="text-xs text-slate-500">Ingresá títulos o revisá los cargados desde un archivo.</p></div>
              <button type="button" onClick={() => setBulkDialogOpen(false)} className="icon-button ml-auto border-0 shadow-none" title="Cerrar" aria-label="Cerrar"><X className="h-5 w-5" /></button>
            </header>
            <div className="max-h-[calc(94vh-64px)] overflow-y-auto p-4 sm:p-6">
        <form onSubmit={submit} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <label>
            <span className="field-label">Títulos a buscar</span>
            <textarea value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ingresá un título por línea" className="control min-h-32 w-full py-2" />
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

        {groups && (
          <div className="mt-6 space-y-4">
            {groups.map((group, groupIndex) => (
              <section key={`${group.name}-${groupIndex}`} className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                  <h2 className="min-w-0 flex-1 truncate font-semibold text-ink">Resultados para “{group.name}”</h2>
                  {selectedIds[groupIndex]?.length > 0 && (
                    <button type="button" onClick={() => setSelectedIds((current) => { const next = { ...current }; delete next[groupIndex]; return next; })} className="text-xs font-semibold text-slate-400 hover:text-coral">Omitir</button>
                  )}
                </div>
                {group.candidates.length ? (
                  <div className="divide-y divide-slate-100">
                    {group.candidates.slice(0, 5).map((candidate) => {
                      const selected = (selectedIds[groupIndex] || []).includes(candidate.imdbId);
                      return (
                        <label key={`${candidate.type}-${candidate.imdbId}`} className={`flex cursor-pointer items-center gap-4 p-3 sm:px-4 ${selected ? 'bg-mist' : 'hover:bg-slate-50'}`}>
                          <input type="checkbox" checked={selected} onChange={() => setSelectedIds((current) => { const groupIds = current[groupIndex] || []; return { ...current, [groupIndex]: selected ? groupIds.filter((imdbId) => imdbId !== candidate.imdbId) : [...groupIds, candidate.imdbId] }; })} className="h-4 w-4 shrink-0 rounded accent-aqua" />
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
        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="mt-6 flex justify-end border-t border-slate-200 pt-4">
          <button type="button" onClick={() => setBulkDialogOpen(false)} className="secondary-button">Finalizar</button>
        </div>
            </div>
          </div>
        </div>}
      </div>
    </main>
  );
};
