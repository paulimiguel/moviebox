import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Film,
  Loader2,
  Plus,
  Search,
  Star,
  Tv,
  X,
} from 'lucide-react';
import { api } from '@/services/api';
import type { ImdbSearchCandidate, MovieItem, TmdbSuggestionCandidate } from '@/types/movie';

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

interface AddMovieModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddMovieModal = ({ isOpen, onClose }: AddMovieModalProps) => {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  // Bulk search states
  const [bulkQuery, setBulkQuery] = useState('');
  const [groups, setGroups] = useState<SearchGroup[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<Record<number, string[]>>({});
  const [error, setError] = useState('');

  const [addedMovieIds, setAddedMovieIds] = useState<Record<string, string>>({});

  const txtInputRef = useRef<HTMLInputElement>(null);
  const spreadsheetInputRef = useRef<HTMLInputElement>(null);
  const bulkMenuRef = useRef<HTMLDivElement>(null);

  const library = useQuery({ queryKey: ['movies'], queryFn: api.movies.getAll, enabled: isOpen });
  const libraryMovies = useMemo(() => (library.data || []) as MovieItem[], [library.data]);

  const searchResultsQuery = useQuery({
    queryKey: ['tmdb-search-by-name', appliedSearch],
    queryFn: () => api.tmdb.suggestions(appliedSearch),
    enabled: isOpen && !bulkDialogOpen && Boolean(appliedSearch),
  });

  const suggestionKey = (candidate: TmdbSuggestionCandidate) =>
    candidate.imdbId || `${candidate.type}-${candidate.tmdbId}`;

  const addedMovieIdFor = (candidate: TmdbSuggestionCandidate) => {
    const key = suggestionKey(candidate);
    if (addedMovieIds[key]) return addedMovieIds[key];
    const match = libraryMovies.find((movie) => {
      if (candidate.imdbId && movie.imdbId) return movie.imdbId === candidate.imdbId;
      if (candidate.tmdbId && movie.tmdbId) return movie.tmdbId === candidate.tmdbId;
      const normalize = (val?: string | null) => (val || '').trim().toLocaleLowerCase('es');
      const titleMatch = normalize(movie.originalTitle) === normalize(candidate.title) || normalize(movie.spanishTitle) === normalize(candidate.title);
      const yearMatch = !movie.year || !candidate.year || movie.year === candidate.year;
      return titleMatch && yearMatch;
    });
    return match?.id || null;
  };

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

  // Bulk names processing
  const bulkNames = useMemo(() => {
    const seen = new Set<string>();
    return bulkQuery.split(/\r?\n/).map((name) => name.trim()).filter((name) => {
      const normalized = name.toLocaleLowerCase('es');
      if (!name || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
  }, [bulkQuery]);

  const bulkSearch = useMutation({
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

  const importBulkMovies = useMutation({
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
      setBulkDialogOpen(false);
      setBulkQuery('');
      setGroups(null);
      setSelectedIds({});
    },
    onError: (reason: Error) => setError(reason.message),
  });

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setAppliedSearch('');
      return;
    }
    const timer = setTimeout(() => {
      setAppliedSearch(trimmed);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!bulkMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (bulkMenuRef.current && !bulkMenuRef.current.contains(e.target as Node)) {
        setBulkMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [bulkMenuOpen]);

  const pasteSearch = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim().replace(/\s+/g, ' ');
      if (text) {
        setSearchQuery(text);
        setAppliedSearch(text);
      }
    } catch {
      setError('No se pudo leer el portapapeles. Revisá el permiso del navegador.');
    }
  };

  const handleSearchSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    const queryToSearch = searchQuery.trim();
    if (!queryToSearch) return;
    setAppliedSearch(queryToSearch);
  };

  const loadImportedTitles = (titles: string[]) => {
    const headerNames = new Set(['titulo', 'title', 'pelicula', 'movie']);
    const cleaned = titles.map((title) => title.trim()).filter((title, index) => title && !(index === 0 && headerNames.has(title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es'))));
    setBulkQuery(cleaned.join('\n'));
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

  const handleClose = () => {
    setSearchQuery('');
    setAppliedSearch('');
    setBulkMenuOpen(false);
    setBulkDialogOpen(false);
    setGroups(null);
    setSelectedIds({});
    setError('');
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (bulkMenuOpen) {
          setBulkMenuOpen(false);
        } else {
          handleClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, bulkMenuOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6 bg-ink/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-movie-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        className="movie-detail-modal flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-canvas shadow-2xl border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            {bulkDialogOpen && (
              <button
                type="button"
                onClick={() => setBulkDialogOpen(false)}
                className="icon-button -ml-1 border-0 shadow-none text-slate-500 hover:text-ink"
                title="Volver a búsqueda por título"
                aria-label="Volver a búsqueda por título"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div className="min-w-0">
              <h2 id="add-movie-modal-title" className="font-bebas text-2xl sm:text-3xl uppercase tracking-wide text-ink truncate">
                {bulkDialogOpen ? 'Buscar varios títulos' : 'Agregar títulos'}
              </h2>
              <p className="truncate text-xs text-slate-500">
                {bulkDialogOpen
                  ? 'Ingresá títulos o cargalos desde un archivo para buscarlos y agregarlos en lote'
                  : 'Buscá una película o serie por nombre o agregá varias a la vez'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="icon-button border-0 shadow-none text-slate-400 hover:text-ink shrink-0 ml-2"
            title="Cerrar"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <input ref={txtInputRef} type="file" accept=".txt,text/plain" className="hidden" onChange={importTextFile} />
          <input ref={spreadsheetInputRef} type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" className="hidden" onChange={importSpreadsheet} />

          {bulkDialogOpen ? (
            /* Diálogo / Modo Carga Masiva */
            <div className="space-y-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!bulkNames.length) return;
                  if (bulkNames.length > MAX_NAMES) {
                    setError(`Podés buscar hasta ${MAX_NAMES} películas o series por vez.`);
                    return;
                  }
                  setError('');
                  bulkSearch.mutate(bulkNames);
                }}
                className="rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
              >
                <label>
                  <span className="field-label">Títulos a buscar</span>
                  <textarea
                    value={bulkQuery}
                    onChange={(e) => setBulkQuery(e.target.value)}
                    placeholder="Ingresá un título por línea"
                    className="control min-h-32 w-full py-2"
                  />
                </label>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <span className={`text-xs ${bulkNames.length > MAX_NAMES ? 'font-semibold text-red-600' : 'text-slate-500'}`}>
                    {bulkNames.length} de {MAX_NAMES} títulos
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setBulkQuery(''); setGroups(null); setSelectedIds({}); setError(''); }}
                      className="secondary-button"
                      disabled={!bulkQuery && !groups}
                    >
                      Limpiar
                    </button>
                    <button
                      type="submit"
                      className="primary-button"
                      disabled={!bulkNames.length || bulkNames.length > MAX_NAMES || bulkSearch.isPending || importBulkMovies.isPending}
                    >
                      {bulkSearch.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      Buscar
                    </button>
                  </div>
                </div>
              </form>

              {groups && (
                <div className="space-y-4">
                  {groups.map((group, groupIndex) => (
                    <section key={`${group.name}-${groupIndex}`} className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
                      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                        <h3 className="min-w-0 flex-1 truncate font-semibold text-ink">Resultados para “{group.name}”</h3>
                        {selectedIds[groupIndex]?.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedIds((current) => { const next = { ...current }; delete next[groupIndex]; return next; })}
                            className="text-xs font-semibold text-slate-400 hover:text-coral"
                          >
                            Omitir
                          </button>
                        )}
                      </div>
                      {group.candidates.length ? (
                        <div className="divide-y divide-slate-100">
                          {group.candidates.slice(0, 5).map((candidate) => {
                            const selected = (selectedIds[groupIndex] || []).includes(candidate.imdbId);
                            return (
                              <div key={`${candidate.type}-${candidate.imdbId}`} className={`flex items-center gap-4 p-3 sm:px-4 ${selected ? 'bg-mist' : 'hover:bg-slate-50'}`}>
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() => setSelectedIds((current) => {
                                    const groupIds = current[groupIndex] || [];
                                    return {
                                      ...current,
                                      [groupIndex]: selected ? groupIds.filter((imdbId) => imdbId !== candidate.imdbId) : [...groupIds, candidate.imdbId],
                                    };
                                  })}
                                  className="h-4 w-4 shrink-0 cursor-pointer rounded accent-aqua"
                                  aria-label={`Seleccionar ${candidate.title}`}
                                />
                                <div className="flex min-w-0 flex-1 items-center gap-4">
                                  <PosterThumbnail candidate={candidate} />
                                  <div className="min-w-0 flex-1">
                                    <span className="block font-semibold text-ink">{candidate.title}</span>
                                    {candidate.originalTitle !== candidate.title && (
                                      <span className="block truncate text-sm text-slate-500">{candidate.originalTitle}</span>
                                    )}
                                    <span className="mt-1 block text-xs font-medium uppercase text-slate-400">
                                      {candidate.type === 'movie' ? 'Película' : 'Serie'}{candidate.year ? ` · ${candidate.year}` : ''}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className={`px-4 py-5 text-sm ${group.error ? 'text-red-600' : 'text-slate-500'}`}>
                          {group.error || 'No se encontraron coincidencias.'}
                        </p>
                      )}
                    </section>
                  ))}

                  <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 bg-canvas/95 py-4 backdrop-blur">
                    <span className="text-sm text-slate-500">{selectedCandidates.length} seleccionadas</span>
                    <button
                      type="button"
                      onClick={() => { setError(''); importBulkMovies.mutate(selectedCandidates); }}
                      className="primary-button"
                      disabled={!selectedCandidates.length || importBulkMovies.isPending}
                    >
                      {importBulkMovies.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      Agregar {selectedCandidates.length}
                    </button>
                  </div>
                </div>
              )}

              {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

              <div className="flex justify-end border-t border-slate-200 pt-4">
                <button type="button" onClick={() => setBulkDialogOpen(false)} className="secondary-button">
                  Volver al buscador
                </button>
              </div>
            </div>
          ) : (
            /* Modo Búsqueda de Título */
            <div className="space-y-6">
              {/* Barra de búsqueda y botón con menú */}
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <form onSubmit={handleSearchSubmit} className="relative flex flex-1 gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="movie-search-modal-input"
                      type="text"
                      placeholder="Escribí el título a buscar..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="control w-full pl-9 pr-16"
                      autoFocus
                    />
                    {!searchQuery ? (
                      <button
                        type="button"
                        onClick={() => void pasteSearch()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase text-slate-600 transition-colors hover:bg-slate-200 hover:text-ink"
                      >
                        Pegar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setAppliedSearch('');
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-ink"
                        title="Limpiar"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={!searchQuery.trim()}
                    className="primary-button shrink-0"
                  >
                    <Search className="h-4 w-4" />
                    <span className="hidden sm:inline">Buscar</span>
                  </button>
                </form>

                {/* Botón Buscar varios títulos con dropdown */}
                <div className="relative shrink-0" ref={bulkMenuRef}>
                  <button
                    type="button"
                    onClick={() => setBulkMenuOpen((c) => !c)}
                    className="secondary-button w-full sm:w-auto justify-between sm:justify-center gap-2 border-slate-200 font-semibold"
                    aria-expanded={bulkMenuOpen}
                  >
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4 text-aqua" />
                      <span>Buscar varios títulos</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${bulkMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {bulkMenuOpen && (
                    <div className="header-dropdown absolute right-0 top-full mt-1.5 z-40 w-full sm:w-72 rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setBulkMenuOpen(false);
                          setBulkDialogOpen(true);
                        }}
                        className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-ink"
                      >
                        <Plus className="h-4 w-4 text-aqua shrink-0" />
                        <span>Pegar texto con títulos</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBulkMenuOpen(false);
                          txtInputRef.current?.click();
                        }}
                        className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-ink"
                      >
                        <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                        <span>Cargar archivo de texto (.txt)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBulkMenuOpen(false);
                          spreadsheetInputRef.current?.click();
                        }}
                        className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-ink"
                      >
                        <FileSpreadsheet className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>Cargar archivo Excel (.xlsx, .xls)</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

              {/* Títulos encontrados debajo */}
              {appliedSearch ? (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink">
                      Resultados para “{appliedSearch}”
                    </span>
                    {searchResultsQuery.data && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                        {searchResultsQuery.data.length} {searchResultsQuery.data.length === 1 ? 'título' : 'títulos'}
                      </span>
                    )}
                  </div>

                  {searchResultsQuery.isLoading ? (
                    <div className="grid min-h-[260px] place-items-center">
                      <div className="text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-aqua" />
                        <p className="mt-3 text-sm text-slate-500">Buscando coincidencias para “{appliedSearch}”...</p>
                      </div>
                    </div>
                  ) : searchResultsQuery.isError ? (
                    <div className="rounded-md border border-red-100 bg-red-50 p-6 text-center">
                      <p className="text-sm text-red-700">No se pudo realizar la búsqueda.</p>
                      <button
                        type="button"
                        onClick={() => searchResultsQuery.refetch()}
                        className="secondary-button mt-3"
                      >
                        Reintentar
                      </button>
                    </div>
                  ) : searchResultsQuery.data?.length ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-4">
                      {searchResultsQuery.data.map((candidate) => {
                        const inLibraryId = addedMovieIdFor(candidate);
                        const isAddingThis =
                          importSuggestion.isPending &&
                          importSuggestion.variables &&
                          suggestionKey(importSuggestion.variables) === suggestionKey(candidate);

                        const typeBadge =
                          candidate.type === 'movie' ? (
                            <span className="rounded border border-coral/20 bg-red-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-coral">
                              Película
                            </span>
                          ) : (
                            <span className="rounded border border-aqua/20 bg-[#f0fbfb] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#1c646b]">
                              Serie
                            </span>
                          );

                        return (
                          <article
                            key={suggestionKey(candidate)}
                            className="movie-card group flex flex-col overflow-hidden rounded-md border border-slate-200 bg-white transition-shadow hover:shadow-md"
                          >
                            <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-100">
                              {candidate.posterUrl ? (
                                <img
                                  src={candidate.posterUrl}
                                  alt={candidate.title}
                                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="grid h-full place-items-center text-slate-300">
                                  {candidate.type === 'movie' ? <Film className="h-10 w-10" /> : <Tv className="h-10 w-10" />}
                                </div>
                              )}
                              <div className="absolute left-2 top-2">{typeBadge}</div>
                            </div>

                            <div className="flex flex-1 flex-col justify-between p-3">
                              <div>
                                <h4 className="font-bebas text-lg uppercase leading-5 text-ink line-clamp-1" title={candidate.title}>
                                  {candidate.title}
                                </h4>
                                {candidate.originalTitle && candidate.originalTitle !== candidate.title && (
                                  <p className="truncate text-xs text-slate-400" title={candidate.originalTitle}>
                                    {candidate.originalTitle}
                                  </p>
                                )}
                                <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                                  <span>{candidate.year || 'S/D'}</span>
                                  {candidate.rating ? (
                                    <span className="inline-flex items-center gap-0.5 font-semibold text-amber-500">
                                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                      {candidate.rating.toFixed(1)}
                                    </span>
                                  ) : null}
                                </div>
                              </div>

                              <div className="mt-3">
                                {inLibraryId ? (
                                  <button
                                    type="button"
                                    disabled
                                    className="secondary-button w-full justify-center gap-1.5 border-[#2cbc63]/40 text-xs font-semibold text-[#2cbc63]"
                                    title="Título ya incorporado a la biblioteca"
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
                </div>
              ) : (
                /* Estado inicial sin búsqueda */
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
                  <Film className="mx-auto h-12 w-12 text-slate-300" />
                  <p className="mt-3 text-sm font-semibold text-ink">Buscador de películas y series</p>
                  <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                    Ingresá una palabra clave para buscar títulos y agregarlos a tu biblioteca, o usá <strong>Buscar varios títulos</strong> para importar por lista o archivo.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
