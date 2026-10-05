import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Check,
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
import { MovieDetailModal } from '@/components/MovieDetailModal';
import type { ImdbSearchCandidate, MovieItem, TmdbSuggestionCandidate } from '@/types/movie';

const MAX_NAMES = 100;
const SEARCH_BATCH_SIZE = 4;

interface SearchGroup {
  name: string;
  candidates: ImdbSearchCandidate[];
  error?: string;
}

interface BulkContinuationPrompt {
  imported: number;
  remaining: number;
}

interface BulkImportResult {
  added: ImdbSearchCandidate[];
  rejectedCount: number;
  rejectedReasons: string[];
}

const normalizeImportedTitle = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('es')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const parseImportedTitle = (value: string) => {
  const trimmed = value.trim();
  const match = trimmed.match(/^(.*?)\s*(?:\((\d{4})\)|[-–—,;|]\s*(\d{4})|(\d{4}))\s*$/);
  const year = Number(match?.[2] || match?.[3] || match?.[4] || 0);
  const title = match?.[1]?.trim();
  const validYear = year >= 1888 && year <= new Date().getFullYear() + 2;
  return validYear && title ? { title, year } : { title: trimmed, year: null };
};

const PosterThumbnail = ({ candidate }: { candidate: ImdbSearchCandidate }) => {
  const [failed, setFailed] = useState(false);

  if (!candidate.posterUrl || failed) {
    return (
      <div className="grid aspect-[2/3] w-full place-items-center bg-slate-100 text-slate-400">
        {candidate.type === 'movie' ? <Film className="h-6 w-6" /> : <Tv className="h-6 w-6" />}
      </div>
    );
  }

  return <img src={candidate.posterUrl} alt="" className="aspect-[2/3] w-full object-cover" onError={() => setFailed(true)} />;
};

const CoverAddButton = ({
  isAdded,
  isAdding,
  onAdd,
  size = 'md',
}: {
  isAdded: boolean;
  isAdding: boolean;
  onAdd: () => void;
  size?: 'sm' | 'md';
}) => {
  const isSm = size === 'sm';
  const sizeClasses = isSm ? 'h-4 w-4' : 'h-6 w-6';
  const iconSize = isSm ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5';

  if (isAdded) {
    return (
      <div
        className={`grid ${sizeClasses} place-items-center rounded-sm bg-[#2cbc63] text-white shadow-md cursor-default pointer-events-auto transition-transform hover:scale-105`}
        title="En tu biblioteca"
        aria-label="En tu biblioteca"
        onClick={(e) => e.stopPropagation()}
      >
        <Check className={iconSize} strokeWidth={3} />
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={isAdding}
      onClick={(e) => {
        e.stopPropagation();
        onAdd();
      }}
      className={`grid ${sizeClasses} place-items-center rounded-sm bg-red-600 text-white shadow-md hover:bg-red-500 hover:scale-110 active:scale-95 transition-all disabled:opacity-50 pointer-events-auto`}
      title="Agregar a la biblioteca"
      aria-label="Agregar a la biblioteca"
    >
      {isAdding ? (
        <Loader2 className={`${iconSize} animate-spin`} />
      ) : (
        <Plus className={iconSize} strokeWidth={2.8} />
      )}
    </button>
  );
};

interface AddMovieModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  initialBulkQuery?: string;
}

export const AddMovieModal = ({ isOpen, onClose, initialQuery = '', initialBulkQuery = '' }: AddMovieModalProps) => {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [bulkOptionsOpen, setBulkOptionsOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<TmdbSuggestionCandidate | null>(null);

  // Bulk search states
  const [bulkQuery, setBulkQuery] = useState('');
  const [groups, setGroups] = useState<SearchGroup[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<Record<number, string[]>>({});
  const [error, setError] = useState('');
  const [bulkContinuationPrompt, setBulkContinuationPrompt] = useState<BulkContinuationPrompt | null>(null);
  const [bulkImportResult, setBulkImportResult] = useState<BulkImportResult | null>(null);

  const [addedMovieIds, setAddedMovieIds] = useState<Record<string, string>>({});

  const searchInputRef = useRef<HTMLInputElement>(null);
  const txtInputRef = useRef<HTMLInputElement>(null);
  const spreadsheetInputRef = useRef<HTMLInputElement>(null);
  const autoImportFromFileRef = useRef(false);
  const autoImportPendingReviewCountRef = useRef(0);
  const automaticImportInFlightRef = useRef(false);
  const remainingBulkTitlesRef = useRef<string[]>([]);
  const bulkBatchAutoImportRef = useRef(false);
  const totalBulkImportedRef = useRef(0);
  const bulkImportTotalsRef = useRef<BulkImportResult>({ added: [], rejectedCount: 0, rejectedReasons: [] });

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

  const existingMovie = useMemo(() => {
    if (!selectedCandidate || !library.data) return null;
    return library.data.find(
      (m) => (selectedCandidate.tmdbId && m.tmdbId === selectedCandidate.tmdbId) ||
             (selectedCandidate.imdbId && m.imdbId === selectedCandidate.imdbId)
    ) || null;
  }, [selectedCandidate, library.data]);

  const candidateDetails = useQuery({
    queryKey: ['candidateDetails', selectedCandidate?.imdbId],
    queryFn: () => (selectedCandidate?.imdbId ? api.imdb.import({ imdbId: selectedCandidate.imdbId, type: selectedCandidate.type }) : null),
    enabled: Boolean(selectedCandidate?.imdbId && !existingMovie),
    staleTime: 1000 * 60 * 30,
  });

  const activeMovie: MovieItem | null = useMemo(() => {
    if (!selectedCandidate) return null;
    if (existingMovie) return existingMovie;

    const details = candidateDetails.data;
    return {
      id: 'preview-' + selectedCandidate.tmdbId,
      userId: 'preview',
      type: selectedCandidate.type,
      originalTitle: details?.originalTitle || selectedCandidate.title,
      spanishTitle: details?.spanishTitle || selectedCandidate.title,
      year: details?.year || selectedCandidate.year || null,
      synopsis: details?.synopsis || selectedCandidate.overview || 'Sin descripción disponible.',
      durationMinutes: details?.durationMinutes ?? null,
      seasons: details?.seasons ?? null,
      totalEpisodes: details?.totalEpisodes ?? null,
      watched: false,
      favorite: false,
      watchlist: false,
      instagramRecommendation: false,
      personalRating: null,
      imdbRating: details?.imdbRating || selectedCandidate.rating || null,
      tmdbId: selectedCandidate.tmdbId || null,
      imdbId: selectedCandidate.imdbId || null,
      imdbUrl: selectedCandidate.imdbId ? `https://www.imdb.com/title/${selectedCandidate.imdbId}` : null,
      tmdbUrl: selectedCandidate.tmdbId ? `https://www.themoviedb.org/${selectedCandidate.type === 'movie' ? 'movie' : 'tv'}/${selectedCandidate.tmdbId}` : null,
      justwatchUrl: null,
      trailerUrl: details?.trailerUrl || null,
      tmdbCollectionId: details?.tmdbCollectionId ?? null,
      tmdbCollectionName: details?.tmdbCollectionName ?? null,
      tmdbImportedAt: null,
      tmdbLastSyncedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      images: details?.images?.length
        ? details.images.map((img, i) => ({ id: String(i), url: img.url, localPath: null, tmdbFilePath: null, order: i, isPrimary: i === 0, altText: null }))
        : selectedCandidate.posterUrl
          ? [{ id: '1', url: selectedCandidate.posterUrl, localPath: null, tmdbFilePath: null, order: 0, isPrimary: true, altText: null }]
          : [],
      genres: (details?.genres || (selectedCandidate.genres || []).map((g) => ({ name: g }))).map((g, i) => ({
        id: String(i),
        name: typeof g === 'string' ? g : g.name,
        normalizedName: (typeof g === 'string' ? g : g.name).toLowerCase(),
        tmdbGenreId: null,
        tmdbMediaType: selectedCandidate.type,
        imagePath: null,
        order: i,
      })),
      platforms: [],
      keywords: [],
      credits: (details?.credits || []).map((cr, i) => ({
        id: String(i),
        name: cr.name,
        creditType: cr.creditType,
        order: cr.order ?? i,
        characterName: cr.characterName ?? null,
        tmdbPersonId: cr.tmdbPersonId ?? null,
        profilePath: cr.profilePath ?? null,
        tmdbCreditId: null,
      })),
      countries: (details?.countries || []).map((c, i) => ({
        id: String(i),
        name: typeof c === 'string' ? c : c.name,
        normalizedName: (typeof c === 'string' ? c : c.name).toLowerCase(),
        isoCode: typeof c === 'string' ? null : ((c as any).isoCode ?? null),
        order: i,
      })),
      collections: [],
    };
  }, [selectedCandidate, existingMovie, candidateDetails.data]);

  const updatePersonal = useMutation({
    mutationFn: ({ movie, field }: { movie: MovieItem; field: 'favorite' | 'watched' | 'watchlist' }) =>
      api.movies.updatePersonal(movie.id, { [field]: !movie[field] }),
    onSuccess: (updated) => {
      queryClient.setQueryData<MovieItem[]>(['movies'], (current = []) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
      queryClient.invalidateQueries({ queryKey: ['movies'] });
    },
  });

  const updateRating = useMutation({
    mutationFn: ({ movie, rating }: { movie: MovieItem; rating: number | null }) =>
      api.movies.updatePersonal(movie.id, { personalRating: rating }),
    onSuccess: (updated) => {
      queryClient.setQueryData<MovieItem[]>(['movies'], (current = []) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
      queryClient.invalidateQueries({ queryKey: ['movies'] });
    },
  });

  const importSuggestion = useMutation({
    mutationFn: async (candidate: TmdbSuggestionCandidate) => {
      let data = (candidateDetails.data && candidateDetails.data.imdbId === candidate.imdbId) ? candidateDetails.data : null;
      if (!data && candidate.imdbId) {
        try {
          data = await api.imdb.import({ imdbId: candidate.imdbId, type: candidate.type });
        } catch {
          // fallback to manual creation below
        }
      }
      if (data) {
        return api.movies.create({
          ...data,
          favorite: false,
          watched: false,
          watchlist: false,
          personalRating: null,
          collectionIds: [],
        });
      }
      return api.movies.create({
        type: candidate.type,
        originalTitle: candidate.title,
        spanishTitle: candidate.title,
        year: candidate.year || null,
        synopsis: candidate.overview || 'Sin descripción disponible.',
        durationMinutes: null,
        seasons: null,
        totalEpisodes: null,
        watched: false,
        favorite: false,
        watchlist: false,
        instagramRecommendation: false,
        personalRating: null,
        imdbRating: candidate.rating || null,
        tmdbId: candidate.tmdbId || null,
        imdbId: candidate.imdbId || null,
        imdbUrl: candidate.imdbId ? `https://www.imdb.com/title/${candidate.imdbId}` : null,
        tmdbUrl: candidate.tmdbId ? `https://www.themoviedb.org/${candidate.type === 'movie' ? 'movie' : 'tv'}/${candidate.tmdbId}` : null,
        justwatchUrl: (candidate as any).justwatchUrl || null,
        trailerUrl: null,
        tmdbCollectionId: null,
        tmdbCollectionName: null,
        images: candidate.posterUrl ? [{ url: candidate.posterUrl, isPrimary: true, order: 0 }] : [],
        genres: (candidate.genres || []).map((g) => ({ name: g })),
        platforms: [],
        keywords: [],
        credits: [],
        countries: [],
        collectionIds: [],
      });
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
            return { name, candidates: await api.imdb.search(parseImportedTitle(name).title) };
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
      if (autoImportFromFileRef.current) {
        autoImportFromFileRef.current = false;
        const automaticCandidates: ImdbSearchCandidate[] = [];
        const pendingGroups: SearchGroup[] = [];

        results.forEach((group) => {
          const parsed = parseImportedTitle(group.name);
          if (!parsed.year || group.error) {
            pendingGroups.push(group);
            return;
          }

          const candidatesForYear = group.candidates.filter((candidate) => candidate.year === parsed.year);
          const normalizedExpectedTitle = normalizeImportedTitle(parsed.title);
          const exactTitleCandidates = candidatesForYear.filter((candidate) =>
            normalizeImportedTitle(candidate.title) === normalizedExpectedTitle ||
            normalizeImportedTitle(candidate.originalTitle) === normalizedExpectedTitle
          );
          const candidate = exactTitleCandidates.length === 1
            ? exactTitleCandidates[0]
            : candidatesForYear.length === 1
              ? candidatesForYear[0]
              : null;

          if (candidate) automaticCandidates.push(candidate);
          else pendingGroups.push(group);
        });

        setGroups(pendingGroups.length ? pendingGroups : null);
        setSelectedIds({});
        autoImportPendingReviewCountRef.current = pendingGroups.length;

        if (automaticCandidates.length) {
          automaticImportInFlightRef.current = true;
          importBulkMovies.mutate(automaticCandidates);
        } else {
          setError(pendingGroups.length
            ? `${pendingGroups.length} ${pendingGroups.length === 1 ? 'título requiere' : 'títulos requieren'} selección manual.`
            : 'No se encontraron títulos para importar.');
        }
        return;
      }

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
      const duplicateIds: string[] = [];
      const duplicates: string[] = [];
      for (const candidate of candidates) {
        try {
          const data = await api.imdb.import({ imdbId: candidate.imdbId, type: candidate.type });
          await api.movies.create({ ...data, favorite: false, watched: false, watchlist: false, personalRating: null, collectionIds: [] });
          savedIds.push(candidate.imdbId);
        } catch (reason) {
          const message = reason instanceof Error ? reason.message : 'No se pudo importar';
          const normalizedMessage = message.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
          if (normalizedMessage.includes('ya esta en tu biblioteca')) {
            duplicateIds.push(candidate.imdbId);
            duplicates.push(candidate.title);
          } else {
            failures.push(`${candidate.title}: ${message}`);
          }
        }
      }
      return { savedIds, duplicateIds, duplicates, failures };
    },
    onSuccess: ({ savedIds, duplicateIds, duplicates, failures }, candidates) => {
      const wasAutomaticImport = automaticImportInFlightRef.current;
      const pendingReviewCount = autoImportPendingReviewCountRef.current;
      automaticImportInFlightRef.current = false;
      totalBulkImportedRef.current += savedIds.length;
      const savedIdSet = new Set(savedIds);
      const totals = bulkImportTotalsRef.current;
      bulkImportTotalsRef.current = {
        added: [...totals.added, ...candidates.filter((candidate) => savedIdSet.has(candidate.imdbId))],
        rejectedCount: totals.rejectedCount + duplicates.length + failures.length,
        rejectedReasons: [
          ...totals.rejectedReasons,
          ...duplicates.map((title) => `${title}: ya está en la biblioteca de MovieBox.`),
          ...failures,
        ],
      };
      if (savedIds.length) {
        queryClient.invalidateQueries({ queryKey: ['movies'] });
        queryClient.invalidateQueries({ queryKey: ['metadata'] });
        queryClient.invalidateQueries({ queryKey: ['collections'] });
      }
      const handledIds = new Set([...savedIds, ...duplicateIds]);
      setSelectedIds((current) => Object.fromEntries(Object.entries(current).flatMap(([index, imdbIds]) => {
        const remaining = imdbIds.filter((imdbId) => !handledIds.has(imdbId));
        return remaining.length ? [[index, remaining]] : [];
      })));

      const rejectedCount = duplicates.length + failures.length;
      const summary = [
        `${savedIds.length} ${savedIds.length === 1 ? 'título aceptado' : 'títulos aceptados'}. ${rejectedCount} ${rejectedCount === 1 ? 'título rechazado' : 'títulos rechazados'}.`,
        ...(duplicates.length
          ? [`Rechazados porque ya están en la biblioteca de MovieBox: ${duplicates.join(', ')}.`]
          : []),
        ...(failures.length ? [`No se pudieron agregar: ${failures.join(' | ')}`] : []),
        ...(autoImportPendingReviewCountRef.current
          ? [`${autoImportPendingReviewCountRef.current} ${autoImportPendingReviewCountRef.current === 1 ? 'título requiere' : 'títulos requieren'} selección manual.`]
          : []),
      ];
      autoImportPendingReviewCountRef.current = 0;
      setError(summary.join('\n'));
      if (remainingBulkTitlesRef.current.length && (!wasAutomaticImport || pendingReviewCount === 0)) {
        setBulkContinuationPrompt({
          imported: totalBulkImportedRef.current,
          remaining: remainingBulkTitlesRef.current.length,
        });
      } else if (!remainingBulkTitlesRef.current.length && (!wasAutomaticImport || pendingReviewCount === 0)) {
        setBulkImportResult(bulkImportTotalsRef.current);
      }
    },
    onError: (reason: Error) => setError(reason.message),
  });

  const startBulkBatches = (titles: string[], autoImport: boolean) => {
    const firstBatch = titles.slice(0, MAX_NAMES);
    remainingBulkTitlesRef.current = titles.slice(MAX_NAMES);
    bulkBatchAutoImportRef.current = autoImport;
    totalBulkImportedRef.current = 0;
    bulkImportTotalsRef.current = { added: [], rejectedCount: 0, rejectedReasons: [] };
    setBulkContinuationPrompt(null);
    setBulkImportResult(null);
    setBulkQuery(firstBatch.join('\n'));
    setGroups(null);
    setSelectedIds({});
    setError('');
    setBulkOptionsOpen(false);
    setBulkDialogOpen(true);
    autoImportPendingReviewCountRef.current = 0;
    automaticImportInFlightRef.current = false;
    autoImportFromFileRef.current = autoImport;
    if (firstBatch.length) bulkSearch.mutate(firstBatch);
  };

  const continueBulkImport = () => {
    const nextBatch = remainingBulkTitlesRef.current.slice(0, MAX_NAMES);
    remainingBulkTitlesRef.current = remainingBulkTitlesRef.current.slice(MAX_NAMES);
    setBulkContinuationPrompt(null);
    setBulkQuery(nextBatch.join('\n'));
    setGroups(null);
    setSelectedIds({});
    setError('');
    autoImportPendingReviewCountRef.current = 0;
    automaticImportInFlightRef.current = false;
    autoImportFromFileRef.current = bulkBatchAutoImportRef.current;
    if (nextBatch.length) bulkSearch.mutate(nextBatch);
  };

  const stopBulkImport = () => {
    remainingBulkTitlesRef.current = [];
    setBulkContinuationPrompt(null);
    setBulkImportResult(bulkImportTotalsRef.current);
  };

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
    if (cleaned.length) {
      startBulkBatches(cleaned, true);
    } else {
      remainingBulkTitlesRef.current = [];
      setBulkContinuationPrompt(null);
      setBulkQuery('');
      setGroups(null);
      setSelectedIds({});
      setError('El archivo no contiene títulos para buscar.');
      setBulkOptionsOpen(false);
      setBulkDialogOpen(true);
    }
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
      const headers = (rows[0] || []).map((cell) => normalizeImportedTitle(String(cell ?? '')));
      const titleColumn = headers.findIndex((header) => ['titulo', 'title', 'pelicula', 'movie'].includes(header));
      const yearColumn = headers.findIndex((header) => ['ano', 'year'].includes(header));
      const dataRows = titleColumn >= 0 ? rows.slice(1) : rows;
      loadImportedTitles(dataRows.map((row) => {
        const year = yearColumn >= 0
          ? String(row[yearColumn] ?? '').trim()
          : String(row.find((cell) => /^\d{4}$/.test(String(cell ?? '').trim())) ?? '').trim();
        const title = String((titleColumn >= 0
          ? row[titleColumn]
          : row.find((cell) => {
            const value = String(cell ?? '').trim();
            return value && value !== year;
          })) ?? '').trim();
        return title && /^\d{4}$/.test(year) ? `${title} (${year})` : title;
      }));
    } catch {
      setError('No se pudo leer la planilla. Revisá que sea un archivo XLS o XLSX válido.');
      setBulkOptionsOpen(false);
      setBulkDialogOpen(true);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setAppliedSearch('');
    setBulkOptionsOpen(false);
    setBulkDialogOpen(false);
    setGroups(null);
    setSelectedIds({});
    setError('');
    setBulkContinuationPrompt(null);
    setBulkImportResult(null);
    autoImportFromFileRef.current = false;
    autoImportPendingReviewCountRef.current = 0;
    automaticImportInFlightRef.current = false;
    remainingBulkTitlesRef.current = [];
    totalBulkImportedRef.current = 0;
    bulkImportTotalsRef.current = { added: [], rejectedCount: 0, rejectedReasons: [] };
    onClose();
  };

  const handleNewSearch = () => {
    setBulkOptionsOpen(false);
    setBulkDialogOpen(false);
    setBulkQuery('');
    setGroups(null);
    setSelectedIds({});
    setSelectedCandidate(null);
    setError('');
    setBulkContinuationPrompt(null);
    setBulkImportResult(null);
    setSearchQuery('');
    setAppliedSearch('');
    autoImportFromFileRef.current = false;
    autoImportPendingReviewCountRef.current = 0;
    automaticImportInFlightRef.current = false;
    remainingBulkTitlesRef.current = [];
    totalBulkImportedRef.current = 0;
    bulkImportTotalsRef.current = { added: [], rejectedCount: 0, rejectedReasons: [] };
    requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  const openEmptyBulkDialog = () => {
    setBulkQuery('');
    setGroups(null);
    setSelectedIds({});
    setError('');
    setBulkContinuationPrompt(null);
    setBulkImportResult(null);
    autoImportFromFileRef.current = false;
    autoImportPendingReviewCountRef.current = 0;
    automaticImportInFlightRef.current = false;
    remainingBulkTitlesRef.current = [];
    totalBulkImportedRef.current = 0;
    bulkImportTotalsRef.current = { added: [], rejectedCount: 0, rejectedReasons: [] };
    setBulkOptionsOpen(false);
    setBulkDialogOpen(true);
  };

  useEffect(() => {
    const titles = initialBulkQuery.split(/\r?\n/).map((title) => title.trim()).filter(Boolean);
    if (!isOpen || !titles.length) return;

    setSearchQuery('');
    setAppliedSearch('');
    setSelectedCandidate(null);
    startBulkBatches(titles, false);
  }, [initialBulkQuery, isOpen]);

  useEffect(() => {
    const query = initialQuery.trim();
    if (!isOpen || initialBulkQuery.trim() || !query) return;

    setBulkOptionsOpen(false);
    setBulkDialogOpen(false);
    setGroups(null);
    setSelectedIds({});
    setSelectedCandidate(null);
    setError('');
    setSearchQuery(query);
    setAppliedSearch(query);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }, [initialBulkQuery, initialQuery, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (bulkOptionsOpen) {
          setBulkOptionsOpen(false);
        } else {
          handleClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, bulkOptionsOpen]);

  if (!isOpen) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-ink/60 backdrop-blur-sm"
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
                onClick={handleNewSearch}
                className="icon-button -ml-1 border-0 shadow-none text-slate-500 hover:text-ink"
                title="Volver a búsqueda por título"
                aria-label="Volver a búsqueda por título"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div className="min-w-0">
              <h2 id="add-movie-modal-title" className="font-bebas text-2xl sm:text-3xl uppercase tracking-wide text-ink dark:text-white truncate">
                {bulkDialogOpen ? 'Buscar varios títulos' : 'Agregar títulos'}
              </h2>
              <p className="truncate text-xs text-slate-500">
                {bulkDialogOpen
                  ? `Ingresá un título por línea o pegalos en el recuadro (Máximo ${MAX_NAMES} títulos por lote)`
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
                  startBulkBatches(bulkNames, false);
                }}
                className="rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
              >
                <label>
                  <span className="field-label">Títulos a buscar</span>
                  <textarea
                    value={bulkQuery}
                    onChange={(e) => setBulkQuery(e.target.value)}
                    placeholder="Ingresá un título por línea (podés escribirlos o pegar texto del portapapeles)"
                    className="control min-h-32 w-full py-2"
                  />
                </label>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">
                    {bulkNames.length > MAX_NAMES
                      ? `${MAX_NAMES} títulos en el primer lote · ${bulkNames.length - MAX_NAMES} pendientes`
                      : `${bulkNames.length} de ${MAX_NAMES} títulos`}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setBulkQuery('');
                        setGroups(null);
                        setSelectedIds({});
                        setError('');
                        setBulkContinuationPrompt(null);
                        remainingBulkTitlesRef.current = [];
                      }}
                      className="secondary-button"
                      disabled={!bulkQuery && !groups}
                    >
                      Limpiar
                    </button>
                    <button
                      type="submit"
                      className="primary-button"
                      disabled={!bulkNames.length || bulkSearch.isPending || importBulkMovies.isPending}
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
                        <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 sm:p-4 md:grid-cols-4 lg:grid-cols-5">
                          {group.candidates.slice(0, 5).map((candidate) => {
                            const selected = (selectedIds[groupIndex] || []).includes(candidate.imdbId);
                            return (
                              <div key={`${candidate.type}-${candidate.imdbId}`} className={`relative min-w-0 overflow-hidden rounded-md border transition-colors ${selected ? 'border-aqua bg-mist' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
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
                                  className="absolute left-2 top-2 z-10 h-4 w-4 cursor-pointer rounded bg-white accent-aqua shadow"
                                  aria-label={`Seleccionar ${candidate.title}`}
                                />
                                <PosterThumbnail candidate={candidate} />
                                <div className="min-w-0 p-2.5">
                                  <span className="block truncate text-sm font-semibold text-ink" title={candidate.title}>{candidate.title}</span>
                                  <span className="mt-1 block text-xs font-medium uppercase text-slate-400">
                                    {candidate.type === 'movie' ? 'Película' : 'Serie'}{candidate.year ? ` · ${candidate.year}` : ''}
                                  </span>
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

                </div>
              )}

            </div>
          ) : (
            /* Modo Búsqueda de Título */
            <div className="space-y-6">
              {/* Barra de búsqueda y acceso a carga múltiple */}
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <form onSubmit={handleSearchSubmit} className="relative flex flex-1 gap-2" autoComplete="off">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      ref={searchInputRef}
                      id="movie-search-modal-input"
                      type="search"
                      name="moviebox_search_query"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      placeholder="Escribí el título a buscar..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="control w-full pl-9 pr-16 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
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

                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setBulkOptionsOpen(true)}
                    className="secondary-button w-full justify-center gap-2 border-slate-200 font-semibold sm:w-auto"
                    aria-haspopup="dialog"
                  >
                    <Plus className="h-4 w-4 text-aqua" />
                    <span>Agregar varios títulos</span>
                  </button>
                </div>
              </div>

              {error && <p className="movie-import-feedback rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

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

                        return (
                          <article
                            key={suggestionKey(candidate)}
                            className="movie-card group flex flex-col overflow-hidden rounded-md border border-slate-200 bg-white transition-shadow hover:shadow-md"
                          >
                            <div
                              className="relative aspect-[2/3] w-full overflow-hidden bg-slate-100 cursor-pointer"
                              onClick={() => setSelectedCandidate(candidate)}
                              title={`Ver características de ${candidate.title}`}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setSelectedCandidate(candidate);
                                }
                              }}
                            >
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
                              <div className="absolute bottom-2 right-2 z-10">
                                <CoverAddButton
                                  isAdded={Boolean(inLibraryId)}
                                  isAdding={Boolean(isAddingThis)}
                                  onAdd={() => importSuggestion.mutate(candidate)}
                                />
                              </div>
                            </div>

                            <div className="flex flex-1 flex-col justify-between p-3">
                              <div>
                                <h4
                                  className="line-clamp-1 cursor-pointer text-sm font-semibold leading-5 text-ink transition-colors hover:text-coral dark:text-white"
                                  title={candidate.title}
                                  onClick={() => setSelectedCandidate(candidate)}
                                >
                                  {candidate.title}
                                </h4>
                                <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                                  <span className="font-medium uppercase">
                                    {candidate.type === 'movie' ? 'Película' : 'Serie'} · {candidate.year || 'S/D'}
                                  </span>
                                  {candidate.rating ? (
                                    <span className="inline-flex items-center gap-0.5 font-semibold text-amber-500">
                                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                      {candidate.rating.toFixed(1)}
                                    </span>
                                  ) : null}
                                </div>
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
                    Ingresá una palabra clave para buscar títulos y agregarlos a tu biblioteca, o usá <strong>Agregar varios títulos</strong> para importar por lista o archivo.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {bulkDialogOpen && groups && (
          <div className="flex min-h-16 shrink-0 flex-wrap items-center justify-end gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
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
        )}

        {bulkDialogOpen && error && (
          <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
            <p className="movie-import-feedback max-h-32 whitespace-pre-line overflow-y-auto rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          </div>
        )}

        {/* Footer */}
        <footer className="flex h-16 shrink-0 items-center justify-end gap-2 border-t border-slate-200 bg-white px-4 sm:px-6">
          <button
            type="button"
            onClick={handleClose}
            className="secondary-button min-w-28"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleNewSearch}
            className="secondary-button min-w-32"
          >
            Nueva búsqueda
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="primary-button min-w-28"
          >
            Finalizar
          </button>
        </footer>
      </div>
    </div>
    {bulkOptionsOpen && (
      <div
        className="fixed inset-0 z-[110] grid place-items-center bg-ink/60 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-options-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) setBulkOptionsOpen(false);
        }}
      >
        <div className="movie-detail-modal w-full max-w-lg overflow-hidden rounded-md border border-slate-200 bg-canvas shadow-2xl">
          <header className="flex min-h-16 items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
            <div className="min-w-0 flex-1">
              <h2 id="bulk-options-title" className="font-bebas text-2xl uppercase tracking-wide text-ink">
                Agregar varios títulos
              </h2>
              <p className="text-xs text-slate-500">Elegí cómo querés cargar los títulos.</p>
            </div>
            <button
              type="button"
              onClick={() => setBulkOptionsOpen(false)}
              className="icon-button border-0 shadow-none"
              title="Cerrar"
              aria-label="Cerrar"
              autoFocus
            >
              <X className="h-5 w-5" />
            </button>
          </header>
          <div className="grid gap-3 p-4 sm:p-5">
            <button
              type="button"
              onClick={openEmptyBulkDialog}
              className="flex w-full items-center gap-3 rounded-md border border-slate-200 bg-white px-4 py-4 text-left font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-ink"
            >
              <Plus className="h-5 w-5 shrink-0 text-aqua" />
              Pegar texto o escribir títulos
            </button>
            <button
              type="button"
              onClick={() => {
                setBulkOptionsOpen(false);
                txtInputRef.current?.click();
              }}
              className="flex w-full items-center gap-3 rounded-md border border-slate-200 bg-white px-4 py-4 text-left font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-ink"
            >
              <FileText className="h-5 w-5 shrink-0 text-slate-400" />
              Importar archivo de texto
            </button>
            <button
              type="button"
              onClick={() => {
                setBulkOptionsOpen(false);
                spreadsheetInputRef.current?.click();
              }}
              className="flex w-full items-center gap-3 rounded-md border border-slate-200 bg-white px-4 py-4 text-left font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-ink"
            >
              <FileSpreadsheet className="h-5 w-5 shrink-0 text-emerald-500" />
              Importar archivo de excel
            </button>
          </div>
          <footer className="flex justify-end border-t border-slate-200 bg-white px-4 py-3 sm:px-5">
            <button
              type="button"
              onClick={() => setBulkOptionsOpen(false)}
              className="secondary-button min-w-28"
            >
              Cancelar
            </button>
          </footer>
        </div>
      </div>
    )}
    {bulkContinuationPrompt && (
      <div className="fixed inset-0 z-[120] grid place-items-center bg-ink/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="continue-bulk-import-title">
        <div className="movie-detail-modal w-full max-w-md overflow-hidden rounded-md border border-slate-200 bg-canvas shadow-2xl">
          <header className="flex min-h-16 items-center justify-between border-b border-slate-200 bg-white px-5">
            <h2 id="continue-bulk-import-title" className="font-bebas text-2xl uppercase tracking-wide text-ink">
              Continuar importación
            </h2>
          </header>
          <div className="space-y-3 p-5">
            <p className="text-sm leading-6 text-slate-600">
              Hasta ahora se importaron <strong className="text-ink">{bulkContinuationPrompt.imported}</strong> títulos.
            </p>
            <p className="text-sm leading-6 text-slate-600">
              Quedan <strong className="text-ink">{bulkContinuationPrompt.remaining}</strong> títulos por procesar. ¿Deseás seguir importando el resto?
            </p>
          </div>
          <footer className="flex justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4">
            <button type="button" onClick={stopBulkImport} className="secondary-button">
              No continuar
            </button>
            <button type="button" onClick={continueBulkImport} className="primary-button">
              Sí, continuar
            </button>
          </footer>
        </div>
      </div>
    )}
    {bulkImportResult && (
      <div className="fixed inset-0 z-[130] grid place-items-center bg-ink/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="bulk-import-result-title">
        <div className="movie-detail-modal flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-md border border-slate-200 bg-canvas shadow-2xl">
          <header className="shrink-0 border-b border-slate-200 bg-white px-5 py-4">
            <h2 id="bulk-import-result-title" className="font-bebas text-2xl uppercase tracking-wide text-ink">
              Resultado de la importación
            </h2>
            <div className="bulk-import-result-summary mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
              <span>Número de títulos aceptados: <strong className="text-ink">{bulkImportResult.added.length}</strong></span>
              <span>Número de títulos rechazados: <strong className="text-ink">{bulkImportResult.rejectedCount}</strong></span>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {bulkImportResult.added.length ? (
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8">
                {bulkImportResult.added.map((candidate, index) => (
                  <div key={`${candidate.imdbId}-${index}`} className="min-w-0">
                    <div className="aspect-[2/3] overflow-hidden rounded-sm bg-slate-100">
                      {candidate.posterUrl ? (
                        <img src={candidate.posterUrl} alt={candidate.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full place-items-center text-slate-300">
                          {candidate.type === 'movie' ? <Film className="h-6 w-6" /> : <Tv className="h-6 w-6" />}
                        </div>
                      )}
                    </div>
                    <p className="mt-1 truncate text-[11px] font-medium text-ink" title={candidate.title}>{candidate.title}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-500">No se aceptaron títulos nuevos.</p>
            )}

            {bulkImportResult.rejectedReasons.length > 0 && (
              <div className="movie-import-feedback mt-4 rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-600">
                <strong className="text-ink">Motivos de rechazo:</strong>
                <ul className="mt-2 space-y-1">
                  {bulkImportResult.rejectedReasons.map((reason, index) => <li key={`${reason}-${index}`}>• {reason}</li>)}
                </ul>
              </div>
            )}
          </div>

          <footer className="flex shrink-0 justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4">
            <button type="button" onClick={handleNewSearch} className="secondary-button min-w-32">
              Nueva búsqueda
            </button>
            <button type="button" onClick={handleClose} className="primary-button min-w-28">
              Finalizar
            </button>
          </footer>
        </div>
      </div>
    )}
    {activeMovie && (
      <MovieDetailModal
        movie={activeMovie}
        onClose={() => setSelectedCandidate(null)}
        onAdd={!existingMovie ? () => selectedCandidate && importSuggestion.mutate(selectedCandidate) : undefined}
        onPersonal={(movie, field) => updatePersonal.mutate({ movie, field })}
        onRating={(movie, rating) => updateRating.mutate({ movie, rating })}
        onCollections={() => {}}
      />
    )}
  </>,
  document.body
);
};
