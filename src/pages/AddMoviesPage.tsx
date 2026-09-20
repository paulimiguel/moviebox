import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, Download, FileSpreadsheet, FileText, Film, Loader2, Plus, Search, Star, Tv, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { TinderSuggestions } from '@/components/TinderSuggestions';
import { api } from '@/services/api';
import type { ImdbSearchCandidate, MovieItem, TmdbSuggestionCandidate } from '@/types/movie';

const MAX_NAMES = 50;
const SEARCH_BATCH_SIZE = 4;

const PLATFORMS = [
  { id: 'justwatch', name: 'JustWatch' },
  { id: 'netflix', name: 'Netflix' },
  { id: 'prime', name: 'Amazon Prime' },
  { id: 'apple', name: 'Apple TV' }
];

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
  const [activePlatform, setActivePlatform] = useState('justwatch');
  const [addedMovieIds, setAddedMovieIds] = useState<Record<string, string>>({});
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const txtInputRef = useRef<HTMLInputElement>(null);
  const spreadsheetInputRef = useRef<HTMLInputElement>(null);

  const searchResultsQuery = useQuery({
    queryKey: ['tmdb-search-by-name', appliedSuggestionSearch],
    queryFn: () => api.tmdb.suggestions(appliedSuggestionSearch),
    enabled: Boolean(appliedSuggestionSearch),
  });

  const tinderQuery = useQuery({
    queryKey: ['tmdb-tinder-suggestions', activePlatform],
    queryFn: async () => {
      if (activePlatform === 'justwatch') {
        return api.tmdb.suggestions('');
      }
      const data = await api.tmdb.newReleases(activePlatform);
      return [...data.movies, ...data.series];
    },
  });

  const library = useQuery({ queryKey: ['movies'], queryFn: api.movies.getAll });
  const searchResults = useMemo(() => searchResultsQuery.data || [], [searchResultsQuery.data]);
  const tinderCandidates = useMemo(() => tinderQuery.data || [], [tinderQuery.data]);

  const suggestionKey = (candidate: TmdbSuggestionCandidate) => `${candidate.type}-${candidate.tmdbId}-${candidate.imdbId}`;
  const addedMovieIdFor = (candidate: TmdbSuggestionCandidate) => addedMovieIds[suggestionKey(candidate)] || (library.data || []).find((movie) => (
    movie.tmdbId === candidate.tmdbId || movie.imdbId === candidate.imdbId
  ))?.id;

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
    onSuccess: (saved, candidate) => {
      setAddedMovieIds((current) => ({ ...current, [suggestionKey(candidate)]: saved.id }));
      queryClient.setQueryData<MovieItem[]>(['movies'], (current = []) => current.some((movie) => movie.id === saved.id) ? current : [saved, ...current]);
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

  const pasteSuggestionSearch = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim().replace(/\s+/g, ' ');
      if (text) setSuggestionSearch(text);
    } catch {
      setError('No se pudo leer el portapapeles. Revisá el permiso del navegador.');
    }
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
            <h1 className="font-bebas truncate text-xl font-normal uppercase text-ink sm:text-2xl">Agregar título por nombre</h1>
            <p className="mt-0.5 truncate text-xs text-slate-500">Buscá un título para agregarlo a tu biblioteca</p>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); const next = suggestionSearch.trim(); if (next === appliedSuggestionSearch) void searchResultsQuery.refetch(); else setAppliedSuggestionSearch(next); }} className="flex min-w-0 items-center gap-2">
            <label className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input autoFocus type="search" value={suggestionSearch} onChange={(event) => setSuggestionSearch(event.target.value)} className={`control w-full pl-9 ${suggestionSearch ? '' : 'pr-16'}`} placeholder="Escribí el título a buscar" title="Escribí el título y presioná Enter para buscar" />
              {!suggestionSearch && <button type="button" onClick={() => void pasteSuggestionSearch()} className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase text-slate-600 transition-colors hover:bg-slate-200 hover:text-ink">Pegar</button>}
            </label>
            <button type="submit" className="inline-flex h-10 shrink-0 items-center rounded-md border border-coral bg-coral px-3 text-xs font-semibold uppercase text-white transition-colors hover:bg-[#dc493a]">Buscar</button>
          </form>
          <div className="flex items-center justify-end">
            <div className="relative shrink-0" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setBulkMenuOpen(false); }}>
              <button type="button" onClick={() => setBulkMenuOpen((current) => !current)} className="primary-button h-9 gap-1.5 px-3 text-xs uppercase" aria-expanded={bulkMenuOpen}>
                Agregar varios títulos
                <ChevronDown className={`h-4 w-4 transition-transform ${bulkMenuOpen ? 'rotate-180' : ''}`} />
              </button>
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
        {appliedSuggestionSearch && (
          <section className="mb-12">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-bebas text-2xl uppercase text-ink sm:text-3xl">
                  Resultados para “{appliedSuggestionSearch}”
                </h2>
                <p className="text-xs text-slate-500">
                  {searchResultsQuery.isLoading
                    ? 'Buscando títulos en TMDB...'
                    : searchResults.length
                      ? `${searchResults.length} títulos encontrados`
                      : 'Sin coincidencias'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSuggestionSearch('');
                  setAppliedSuggestionSearch('');
                }}
                className="text-xs font-semibold text-slate-500 hover:text-coral"
              >
                Limpiar búsqueda
              </button>
            </div>

            {searchResultsQuery.isLoading ? (
              <div className="grid min-h-[240px] place-items-center">
                <Loader2 className="h-8 w-8 animate-spin text-aqua" />
              </div>
            ) : searchResultsQuery.isError ? (
              <div className="rounded-md border border-red-100 bg-red-50 p-5 text-center">
                <p className="text-sm text-red-700">No se pudieron cargar los resultados de TMDB.</p>
                <button type="button" onClick={() => searchResultsQuery.refetch()} className="secondary-button mt-3">Reintentar</button>
              </div>
            ) : searchResults.length ? (
              <div className="grid grid-cols-2 gap-3 min-[520px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 sm:gap-4 2xl:grid-cols-7">
                {searchResults.map((candidate) => {
                  const inLibraryId = addedMovieIdFor(candidate);
                  const isAddingThis = importSuggestion.isPending && importSuggestion.variables?.tmdbId === candidate.tmdbId;

                  return (
                    <article
                      key={suggestionKey(candidate)}
                      className="movie-card group relative flex h-full min-w-0 flex-col overflow-hidden rounded-md bg-white shadow-card transition-transform hover:-translate-y-0.5"
                    >
                      <div className="relative aspect-[2/3]">
                        <div className="h-full overflow-hidden rounded-t-md bg-slate-100">
                          {candidate.posterUrl ? (
                            <img
                              src={candidate.posterUrl}
                              alt={candidate.title}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                              loading="lazy"
                            />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-slate-400">
                              {candidate.type === 'movie' ? <Film className="h-8 w-8" /> : <Tv className="h-8 w-8" />}
                            </div>
                          )}
                        </div>
                        <span
                          className={`absolute left-2 top-2 rounded px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase text-white shadow-sm ${
                            candidate.type === 'series' ? 'bg-aqua' : 'bg-coral'
                          }`}
                        >
                          {candidate.type === 'series' ? 'SERIE' : 'PELÍCULA'}
                        </span>
                      </div>

                      <div className="flex flex-1 flex-col p-2.5">
                        <h3
                          className="font-bebas line-clamp-2 text-[23px] font-normal uppercase leading-6 text-ink"
                          title={candidate.title}
                        >
                          {candidate.title}
                        </h3>
                        {candidate.originalTitle && candidate.originalTitle !== candidate.title && (
                          <p className="mt-0.5 line-clamp-2 text-xs font-medium text-slate-600" title={candidate.originalTitle}>
                            {candidate.originalTitle}
                          </p>
                        )}
                        {(candidate.year || candidate.rating != null) && (
                          <div className="mt-1 flex items-center justify-between gap-1.5">
                            <div className="flex flex-wrap items-center gap-2 text-slate-500">
                              {candidate.year && <span className="text-base font-bold text-slate-500">{candidate.year}</span>}
                              {candidate.rating != null && (
                                <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500">
                                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                                  {candidate.rating.toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        {candidate.genres && candidate.genres.length > 0 && (
                          <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                            {candidate.genres.join(', ')}
                          </p>
                        )}

                        <div className="mt-auto pt-3">
                          {inLibraryId ? (
                            <button
                              type="button"
                              onClick={() => navigate(`/titulo/${inLibraryId}`)}
                              className="secondary-button w-full justify-center gap-1.5 border-[#2cbc63]/40 text-xs font-semibold text-[#2cbc63] hover:bg-[#2cbc63]/10"
                              title="Ver en biblioteca"
                            >
                              <Check className="h-4 w-4" />
                              En biblioteca
                            </button>
                          ) : isAddingThis ? (
                            <button
                              type="button"
                              disabled
                              className="primary-button w-full justify-center gap-1.5 text-xs opacity-75"
                            >
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Agregando...
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => importSuggestion.mutate(candidate)}
                              disabled={importSuggestion.isPending}
                              className="primary-button w-full justify-center gap-1.5 text-xs"
                            >
                              <Plus className="h-4 w-4" />
                              Agregar
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-md border border-slate-200 bg-white p-8 text-center shadow-sm">
                <Film className="mx-auto h-10 w-10 text-aqua" />
                <p className="mt-3 font-semibold text-ink">No se encontraron títulos con ese nombre</p>
                <p className="mt-1 text-xs text-slate-500">Probá con otro término o revisá la ortografía.</p>
              </div>
            )}
          </section>
        )}

        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bebas text-2xl uppercase text-ink sm:text-3xl">Tinder</h2>
              <p className="text-xs text-slate-500">Deslizá o explorá las sugerencias de cada plataforma para agregarlas a tu biblioteca</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => {
                const active = activePlatform === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActivePlatform(p.id)}
                    className={`inline-flex items-center rounded-md border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                      active
                        ? 'border-coral bg-coral text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>

          {tinderQuery.isLoading ? (
            <div className="grid min-h-[360px] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-aqua" /></div>
          ) : tinderQuery.isError ? (
            <div className="mt-4 rounded-md border border-red-100 bg-red-50 p-5 text-center">
              <p className="text-sm text-red-700">No se pudieron cargar las sugerencias de {PLATFORMS.find(p => p.id === activePlatform)?.name || 'la plataforma'}.</p>
              <button type="button" onClick={() => tinderQuery.refetch()} className="secondary-button mt-3">Reintentar</button>
            </div>
          ) : tinderCandidates.length ? (
            <TinderSuggestions 
              key={activePlatform}
              initialCandidates={tinderCandidates}
              onAdd={(candidate) => {
                if (!addedMovieIdFor(candidate)) {
                  importSuggestion.mutate(candidate);
                }
              }}
              isAdding={importSuggestion.isPending}
              addingTmdbId={importSuggestion.variables?.tmdbId || null}
            />
          ) : (
            <div className="grid min-h-[280px] place-items-center text-center">
              <div>
                <Film className="mx-auto h-12 w-12 text-aqua" />
                <p className="mt-3 font-semibold text-ink">No hay sugerencias para mostrar</p>
              </div>
            </div>
          )}
        </section>

        {!bulkDialogOpen && error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {bulkDialogOpen && (
          <div className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/55 sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="bulk-search-title">
            <div className="movie-detail-modal max-h-[94vh] w-full overflow-hidden rounded-t-md bg-canvas shadow-xl sm:max-w-4xl sm:rounded-md">
              <header className="flex min-h-16 items-center border-b border-slate-200 bg-white px-4 sm:px-6">
                <div>
                  <h2 id="bulk-search-title" className="font-bebas text-2xl uppercase text-ink">Buscar títulos</h2>
                  <p className="text-xs text-slate-500">Ingresá títulos o revisá los cargados desde un archivo.</p>
                </div>
                <button type="button" onClick={() => setBulkDialogOpen(false)} className="icon-button ml-auto border-0 shadow-none" title="Cerrar" aria-label="Cerrar">
                  <X className="h-5 w-5" />
                </button>
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
                                <div key={`${candidate.type}-${candidate.imdbId}`} className={`flex items-center gap-4 p-3 sm:px-4 ${selected ? 'bg-mist' : 'hover:bg-slate-50'}`}>
                                  <input type="checkbox" checked={selected} onChange={() => setSelectedIds((current) => { const groupIds = current[groupIndex] || []; return { ...current, [groupIndex]: selected ? groupIds.filter((imdbId) => imdbId !== candidate.imdbId) : [...groupIds, candidate.imdbId] }; })} className="h-4 w-4 shrink-0 cursor-pointer rounded accent-aqua" aria-label={`Seleccionar ${candidate.title}`} />
                                  <a href={`https://www.imdb.com/title/${candidate.imdbId}/`} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 items-center gap-4" title="Abrir IMDb en una pestaña nueva">
                                    <PosterThumbnail candidate={candidate} />
                                    <span className="min-w-0 flex-1">
                                      <span className="block font-semibold text-ink">{candidate.title}</span>
                                      {candidate.originalTitle !== candidate.title && <span className="block truncate text-sm text-slate-500">{candidate.originalTitle}</span>}
                                      <span className="mt-1 block text-xs font-medium uppercase text-slate-400">{candidate.type === 'movie' ? 'Película' : 'Serie'}{candidate.year ? ` · ${candidate.year}` : ''}</span>
                                    </span>
                                  </a>
                                </div>
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
          </div>
        )}
      </div>
    </main>
  );
};
