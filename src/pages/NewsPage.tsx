import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Header } from '@/components/Header';
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useNavigate, useLocation } from 'react-router-dom';
import { resolvePlatformLogoUrl } from '@/components/PlatformLogos';
import { MovieDetailModal } from '@/components/MovieDetailModal';
import { TinderSuggestions } from '@/components/TinderSuggestions';
import { Loader2, Film, Tv, ChevronLeft, ChevronRight, ChevronDown, ChevronsUpDown, Filter, LayoutGrid, Tags, Plus, Check, Search, X } from 'lucide-react';
import type { JustWatchTop10Item, MovieItem, TmdbSuggestionCandidate } from '@/types/movie';
import { PLATFORM_PREFERENCES } from '@/constants/platformPreferences';
import { useAuth } from '@/contexts/AuthContext';
import { getGenreIconImage } from '@/utils/genreIcons';
import { FilterPlatformIcon, FilterSelect } from '@/components/FilterSelect';

const getTop10 = (data: any): TmdbSuggestionCandidate[] => {
  if (!data) return [];
  const candidates: TmdbSuggestionCandidate[] = [...(data.movies || []), ...(data.series || [])];
  candidates.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  return candidates.slice(0, 10);
};

const CoverAddButton = ({
  item,
  isAdded,
  isAdding,
  onAdd,
  size = 'md',
}: {
  item: TmdbSuggestionCandidate;
  isAdded: boolean;
  isAdding: boolean;
  onAdd: (item: TmdbSuggestionCandidate) => void;
  size?: 'sm' | 'md';
}) => {
  const isSm = size === 'sm';
  const sizeClasses = isSm ? 'h-4 w-4' : 'h-5 w-5';
  const iconSize = isSm ? 'h-2.5 w-2.5' : 'h-3 w-3';

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
        onAdd(item);
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

const Top10FeaturedSection = ({
  items,
  onSelect,
  isMovieInLibrary,
  isItemAdding,
  onAdd,
  compact = false,
  hideTypeBadge = false,
}: {
  compact?: boolean;
  hideTypeBadge?: boolean;
  items: JustWatchTop10Item[];
  onSelect: (item: TmdbSuggestionCandidate) => void;
  isMovieInLibrary: (item: TmdbSuggestionCandidate) => boolean;
  isItemAdding: (item: TmdbSuggestionCandidate) => boolean;
  onAdd: (item: TmdbSuggestionCandidate) => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [items]);

  const scrollByAmount = (amount: number) => {
    containerRef.current?.scrollBy({ left: amount, behavior: 'smooth' });
    setTimeout(checkScroll, 350);
  };

  return (
    <div className="relative group/carousel -mx-4 sm:-mx-6">
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollByAmount(-400)}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-30 grid h-8 w-8 place-items-center rounded-full bg-black/70 text-white shadow-lg backdrop-blur hover:bg-coral hover:scale-110 transition-all opacity-0 group-hover/carousel:opacity-100"
          aria-label="Anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollByAmount(400)}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-30 grid h-8 w-8 place-items-center rounded-full bg-black/70 text-white shadow-lg backdrop-blur hover:bg-coral hover:scale-110 transition-all opacity-0 group-hover/carousel:opacity-100"
          aria-label="Siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
      <div
        ref={containerRef}
        className={compact
          ? 'flex gap-0.5 sm:gap-2 overflow-x-auto pb-4 pt-2 px-4 sm:px-6 lg:grid lg:grid-cols-10 lg:gap-1 lg:overflow-visible hide-scrollbar scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'
          : 'flex gap-6 sm:gap-10 overflow-x-auto pb-6 pt-2 px-4 sm:px-6 hide-scrollbar scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'}
      >
        {items.map((item) => (
          <div
            key={`featured-${item.type}-${item.rank}-${item.tmdbId || item.jwId}`}
            onClick={() => onSelect(item)}
            className={`relative flex items-end shrink-0 select-none group/jw cursor-pointer focus:outline-none ${compact ? 'lg:min-w-0 lg:shrink' : ''}`}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(item);
              }
            }}
            title={`Ver características de ${item.title}`}
            aria-label={`Ver características de ${item.title}`}
          >
            {/* Número de ranking amplio y visible a la izquierda con sutil solapamiento */}
            <span className={`justwatch-rank-number font-sans font-black leading-[0.8] tracking-tighter select-none z-0 transition-all duration-200 group-hover/jw:scale-105 pointer-events-none ${compact ? 'shrink-0 text-right text-[44px] -mr-1 sm:w-[54px] lg:w-[38px] lg:text-[34px] xl:w-[46px] xl:text-[40px]' : 'text-[130px] sm:text-[165px] -mr-2 sm:-mr-3'}`}>
              {item.rank}
            </span>

            {/* Tarjeta de póster */}
            <div className={`relative z-10 aspect-[2/3] overflow-hidden rounded-lg bg-mist shadow-md transition-all duration-200 group-hover/jw:scale-105 group-hover/jw:shadow-xl ring-1 ring-black/5 dark:ring-white/10 ${compact ? 'w-[104px] lg:w-auto lg:min-w-0 lg:flex-1' : 'w-[135px] sm:w-[160px]'}`}>
              {item.posterUrl ? (
                <img src={item.posterUrl} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="grid h-full place-items-center text-aqua/50">
                  {item.type === 'movie' ? <Film className="h-8 w-8" /> : <Tv className="h-8 w-8" />}
                </div>
              )}

              {/* Cinta / Bookmark superior izquierda */}
              <div className="absolute top-0 left-2 z-20 pointer-events-none drop-shadow-sm opacity-80 group-hover/jw:opacity-100 transition-opacity">
                <svg viewBox="0 0 24 32" className="w-4 h-6 sm:w-5 sm:h-7 fill-black/45 text-white/90">
                  <path d="M0 0h24v32l-12-7-12 7z" />
                </svg>
              </div>

              {/* Badges inferiores izquierdos */}
              <div className="absolute bottom-2 left-2 z-20 flex flex-col items-start gap-1 pointer-events-none">
                {item.subBadge && (
                  <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-tight shadow">
                    {item.subBadge}
                  </span>
                )}
                <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white shadow-sm ${compact ? 'hidden xl:inline-block' : ''} ${hideTypeBadge ? 'hidden' : ''} ${item.type === 'series' ? 'bg-aqua' : 'bg-coral'}`}>
                  {item.type === 'series' ? 'Serie' : 'Película'}
                </span>
              </div>

              {/* Botón inferior derecho: Agregar a biblioteca (+) o ya agregado (tilde verde) */}
              <div className="absolute bottom-2 right-2 z-20">
                <CoverAddButton
                  item={item}
                  isAdded={isMovieInLibrary(item)}
                  isAdding={isItemAdding(item)}
                  onAdd={onAdd}
                  size={compact ? 'sm' : 'md'}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const HorizontalScrollSection = ({
  items,
  onSelect,
  isMovieInLibrary,
  isItemAdding,
  onAdd,
  wrap = false,
  hideTypeBadge = false,
}: {
  wrap?: boolean;
  hideTypeBadge?: boolean;
  items: (JustWatchTop10Item | (TmdbSuggestionCandidate & { subBadge?: string | null; jwId?: string }))[];
  onSelect: (item: TmdbSuggestionCandidate) => void;
  isMovieInLibrary: (item: TmdbSuggestionCandidate) => boolean;
  isItemAdding: (item: TmdbSuggestionCandidate) => boolean;
  onAdd: (item: TmdbSuggestionCandidate) => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [items]);

  const scrollByAmount = (amount: number) => {
    containerRef.current?.scrollBy({ left: amount, behavior: 'smooth' });
    setTimeout(checkScroll, 350);
  };

  return (
    <div className="relative group/carousel -mx-4 sm:-mx-6">
      {!wrap && canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollByAmount(-400)}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-30 grid h-8 w-8 place-items-center rounded-full bg-black/70 text-white shadow-lg backdrop-blur hover:bg-coral hover:scale-110 transition-all opacity-0 group-hover/carousel:opacity-100"
          aria-label="Anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      {!wrap && canScrollRight && (
        <button
          type="button"
          onClick={() => scrollByAmount(400)}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-30 grid h-8 w-8 place-items-center rounded-full bg-black/70 text-white shadow-lg backdrop-blur hover:bg-coral hover:scale-110 transition-all opacity-0 group-hover/carousel:opacity-100"
          aria-label="Siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
      <div
        ref={containerRef}
        className={wrap
          ? 'flex flex-wrap gap-4 pb-4 pt-2 px-4 sm:px-6'
          : 'flex gap-4 overflow-x-auto pb-4 pt-2 px-4 sm:px-6 hide-scrollbar scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'}
      >
        {items.map((item, idx) => (
          <div
            key={`pop-${item.type}-${item.tmdbId || item.jwId || idx}`}
            onClick={() => onSelect(item)}
            className="w-[125px] sm:w-[145px] shrink-0 select-none group/card cursor-pointer focus:outline-none flex flex-col"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(item);
              }
            }}
            title={`Ver características de ${item.title}`}
          >
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-mist shadow-md transition-all duration-200 group-hover/card:scale-105 group-hover/card:shadow-xl ring-1 ring-black/5 dark:ring-white/10">
              {item.posterUrl ? (
                <img src={item.posterUrl} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="grid h-full place-items-center text-aqua/50">
                  {item.type === 'movie' ? <Film className="h-8 w-8" /> : <Tv className="h-8 w-8" />}
                </div>
              )}
              {item.rating && (
                <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-white shadow backdrop-blur-sm">
                  <span className="text-amber-400">★</span>
                  <span>{item.rating.toFixed(1)}</span>
                </div>
              )}

              {/* Badges inferiores izquierdos */}
              <div className="absolute bottom-2 left-2 z-10 flex flex-col items-start gap-1 pointer-events-none">
                {item.subBadge && (
                  <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-tight shadow">
                    {item.subBadge}
                  </span>
                )}
                <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white shadow-sm ${hideTypeBadge ? 'hidden' : ''} ${item.type === 'series' ? 'bg-aqua' : 'bg-coral'}`}>
                  {item.type === 'series' ? 'Serie' : 'Película'}
                </span>
              </div>

              {/* Botón inferior derecho: Agregar a biblioteca (+) o ya agregado (tilde verde) */}
              <div className="absolute bottom-2 right-2 z-10">
                <CoverAddButton
                  item={item}
                  isAdded={isMovieInLibrary(item)}
                  isAdding={isItemAdding(item)}
                  onAdd={onAdd}
                />
              </div>
            </div>
            <div className="mt-2 flex flex-col min-w-0">
              <h4 className="font-bebas text-lg leading-tight uppercase text-ink line-clamp-1 transition-colors group-hover/card:text-coral">
                {item.title}
              </h4>
              <p className="text-xs text-slate-500 truncate mt-0.5">{item.year || ''}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const quickTypeButtonClass = (active: boolean) => `library-filter-button moviebox-translucent-action inline-flex h-10 w-full md:w-auto items-center justify-center gap-1.5 rounded-md border px-3 text-[11px] font-semibold uppercase transition-colors shrink-0 ${active ? 'border-coral bg-coral text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`;

export const NewsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const visiblePlatforms = useMemo(
    () => PLATFORM_PREFERENCES.filter((platform) => user?.preferredPlatforms.includes(platform.id)),
    [user?.preferredPlatforms],
  );

  useEffect(() => {
    if (location.hash) {
      const targetId = location.hash.replace('#', '');
      const scroll = () => {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      };
      scroll();
      const timer = setTimeout(scroll, 200);
      return () => clearTimeout(timer);
    }
  }, [location.hash]);
  const newsSearchInputRef = useRef<HTMLInputElement>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<TmdbSuggestionCandidate | null>(null);
  const [newsSearch, setNewsSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'movie' | 'series'>('all');
  const [genreFilter, setGenreFilter] = useState<string[]>([]);
  const [platformFilter, setPlatformFilter] = useState<string[]>([]);
  const [yearFilter, setYearFilter] = useState<number[]>([]);
  const [yearDraft, setYearDraft] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const pasteNewsSearch = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim().replace(/\s+/g, ' ');
      if (text) setNewsSearch(text);
    } catch {
      // El navegador puede bloquear el portapapeles; mantenemos el campo disponible.
    } finally {
      newsSearchInputRef.current?.focus();
    }
  };

  const library = useQuery({ queryKey: ['movies'], queryFn: api.movies.getAll });
  const justwatchTop10Query = useQuery({
    queryKey: ['justwatchTop10'],
    queryFn: api.tmdb.justwatchTop10,
    staleTime: 0,
    refetchOnMount: 'always',
    enabled: user?.preferredPlatforms.includes('justwatch') ?? false,
  });

  const [activePopularPlatform, setActivePopularPlatform] = useState(visiblePlatforms[0]?.id || '');

  useEffect(() => {
    if (!visiblePlatforms.some((platform) => platform.id === activePopularPlatform)) {
      setActivePopularPlatform(visiblePlatforms[0]?.id || '');
    }
  }, [activePopularPlatform, visiblePlatforms]);

  const platformPopularQuery = useQuery({
    queryKey: ['justwatch-platform-popular', activePopularPlatform],
    queryFn: () => api.tmdb.justwatchPlatformPopular(activePopularPlatform),
    staleTime: 1000 * 60 * 30,
    enabled: Boolean(activePopularPlatform),
  });

  const currentPopularPlatformName = useMemo(() => {
    return visiblePlatforms.find((p) => p.id === activePopularPlatform)?.name || 'la plataforma';
  }, [activePopularPlatform, visiblePlatforms]);

  const platformNewReleasesQuery = useQuery({
    queryKey: ['newReleases', activePopularPlatform],
    queryFn: () => api.tmdb.newReleases(activePopularPlatform),
    staleTime: 1000 * 60 * 5,
    enabled: Boolean(activePopularPlatform),
  });

  const currentPlatformNewReleases = useMemo(() => {
    if (!platformNewReleasesQuery.data) return [];
    const movies = platformNewReleasesQuery.data.movies || [];
    const series = platformNewReleasesQuery.data.series || [];
    const combined: (TmdbSuggestionCandidate & { subBadge?: string | null })[] = [];
    const maxLen = Math.max(movies.length, series.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < movies.length) combined.push({ ...movies[i], subBadge: 'Novedad' });
      if (i < series.length) combined.push({ ...series[i], subBadge: 'Novedad' });
    }
    return combined;
  }, [platformNewReleasesQuery.data]);

  const [activeSuggestionPlatform, setActiveSuggestionPlatform] = useState(visiblePlatforms[0]?.id || '');
  const [suggestionSeed, setSuggestionSeed] = useState(0);
  const [addedSuggestionMovieIds, setAddedSuggestionMovieIds] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!visiblePlatforms.some((platform) => platform.id === activeSuggestionPlatform)) {
      setActiveSuggestionPlatform(visiblePlatforms[0]?.id || '');
      setSuggestionSeed(0);
    }
  }, [activeSuggestionPlatform, visiblePlatforms]);

  const suggestionsQuery = useQuery({
    queryKey: ['tmdb-platform-suggestions', activeSuggestionPlatform, suggestionSeed],
    queryFn: () => api.tmdb.platformSuggestions(activeSuggestionPlatform, suggestionSeed),
    staleTime: 1000 * 60 * 5,
    enabled: Boolean(activeSuggestionPlatform),
  });

  const libraryMovies = useMemo(() => (library.data || []) as MovieItem[], [library.data]);
  const [addedMovieKeys, setAddedMovieKeys] = useState<Record<string, boolean>>({});

  const suggestionKey = (candidate: TmdbSuggestionCandidate) =>
    candidate.imdbId || `${candidate.type}-${candidate.tmdbId}`;

  const isMovieInLibrary = useCallback(
    (candidate: TmdbSuggestionCandidate) => {
      const key = suggestionKey(candidate);
      if (addedMovieKeys[key] || addedSuggestionMovieIds[key]) return true;
      return libraryMovies.some((movie) => {
        if (candidate.imdbId && movie.imdbId) return movie.imdbId === candidate.imdbId;
        if (candidate.tmdbId && movie.tmdbId && movie.tmdbId < 80000000) return movie.tmdbId === candidate.tmdbId;
        const normalize = (val?: string | null) => (val || '').trim().toLocaleLowerCase('es');
        const titleMatch =
          normalize(movie.originalTitle) === normalize(candidate.title) ||
          normalize(movie.spanishTitle) === normalize(candidate.title);
        const yearMatch = !movie.year || !candidate.year || movie.year === candidate.year;
        return titleMatch && yearMatch;
      });
    },
    [addedMovieKeys, addedSuggestionMovieIds, libraryMovies]
  );

  const isSuggestionCandidateAdded = (candidate: TmdbSuggestionCandidate) => isMovieInLibrary(candidate);

  const suggestionCandidates = useMemo(() => {
    const raw = (suggestionsQuery.data || []) as TmdbSuggestionCandidate[];
    return raw.filter((c) => !isSuggestionCandidateAdded(c));
  }, [suggestionsQuery.data, isMovieInLibrary]);

  const importSuggestionMutation = useMutation({
    mutationFn: async (candidate: TmdbSuggestionCandidate) => {
      const data = await api.imdb.import({ imdbId: candidate.imdbId, type: candidate.type });
      return api.movies.create({ ...data, favorite: false, watched: false, watchlist: false, personalRating: null, collectionIds: [] });
    },
    onSuccess: (saved, candidate) => {
      setAddedSuggestionMovieIds((current) => ({ ...current, [suggestionKey(candidate)]: saved.id }));
      queryClient.setQueryData<MovieItem[]>(['movies'], (current = []) => current.some((movie) => movie.id === saved.id) ? current : [saved, ...current]);
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      queryClient.invalidateQueries({ queryKey: ['metadata'] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });

  const queries = useQueries({
    queries: visiblePlatforms.map((platform) => ({
      queryKey: ['newReleases', platform.id],
      queryFn: () => api.tmdb.newReleases(platform.id),
      staleTime: 1000 * 60 * 5,
    })),
  });

  const hasNewsFilters = Boolean(newsSearch.trim()) || typeFilter !== 'all' || genreFilter.length > 0 || platformFilter.length > 0 || yearFilter.length > 0;

  const availableGenres = useMemo(() => {
    const names = new Set<string>();
    queries.forEach((query) => {
      const data = query.data as { movies?: TmdbSuggestionCandidate[]; series?: TmdbSuggestionCandidate[] } | undefined;
      [...(data?.movies || []), ...(data?.series || [])].forEach((candidate) => (candidate.genres || []).forEach((genre) => names.add(genre)));
    });
    return [...names].sort((left, right) => left.localeCompare(right, 'es'));
  }, [queries]);

  const allNewsCount = useMemo(() => {
    const keys = new Set<string>();
    queries.forEach((query) => {
      const data = query.data as { movies?: TmdbSuggestionCandidate[]; series?: TmdbSuggestionCandidate[] } | undefined;
      [...(data?.movies || []), ...(data?.series || [])].forEach((candidate) => keys.add(`${candidate.type}-${candidate.tmdbId}`));
    });
    return keys.size;
  }, [queries]);

  const newsSearchResults = useMemo(() => {
    const normalizeSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
    const search = normalizeSearch(newsSearch.trim());
    if (!hasNewsFilters) return [];
    const unique = new Map<string, TmdbSuggestionCandidate>();
    queries.forEach((query, index) => {
      if (platformFilter.length && !platformFilter.includes(visiblePlatforms[index].id)) return;
      const data = query.data as { movies?: TmdbSuggestionCandidate[]; series?: TmdbSuggestionCandidate[] } | undefined;
      [...(data?.movies || []), ...(data?.series || [])].forEach((candidate) => {
        if (typeFilter !== 'all' && candidate.type !== typeFilter) return;
        if (genreFilter.length && !(candidate.genres || []).some((genre) => genreFilter.includes(genre))) return;
        if (yearFilter.length && !(candidate.year && yearFilter.includes(candidate.year))) return;
        if (search && !normalizeSearch(`${candidate.title} ${candidate.originalTitle || ''}`).includes(search)) return;
        unique.set(`${candidate.type}-${candidate.tmdbId}`, candidate);
      });
    });
    return [...unique.values()];
  }, [hasNewsFilters, newsSearch, typeFilter, genreFilter, platformFilter, yearFilter, queries, visiblePlatforms]);

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

  const selectedCandidateSourcePlatforms = useMemo(() => {
    if (!selectedCandidate) return [];

    const matchesSelected = (candidate: TmdbSuggestionCandidate) =>
      candidate.type === selectedCandidate.type && (
        (candidate.tmdbId && candidate.tmdbId === selectedCandidate.tmdbId) ||
        (candidate.imdbId && candidate.imdbId === selectedCandidate.imdbId)
      );
    const platformIds = new Set<string>();
    const containsSelected = (items: TmdbSuggestionCandidate[] | undefined) =>
      Boolean(items?.some(matchesSelected));

    queries.forEach((query, index) => {
      const data = query.data as { movies?: TmdbSuggestionCandidate[]; series?: TmdbSuggestionCandidate[] } | undefined;
      const platformId = visiblePlatforms[index].id;
      const queryIsProviderFiltered = platformId !== 'justwatch' && platformId !== 'stremio';
      if (queryIsProviderFiltered && containsSelected([...(data?.movies || []), ...(data?.series || [])])) {
        platformIds.add(visiblePlatforms[index].id);
      }
    });

    const popularData = platformPopularQuery.data;
    const activePopularItems = popularData ? [
      ...(popularData.featuredMovies || []),
      ...(popularData.featuredSeries || []),
      ...(popularData.top10Week || []),
      ...(popularData.popularPicks || []),
      ...(popularData.fanFavorites || []),
      ...(popularData.popularMovies || []),
      ...(popularData.popularSeries || []),
    ] : [];
    if (containsSelected(activePopularItems)) platformIds.add(activePopularPlatform);
    if (containsSelected(suggestionsQuery.data)) platformIds.add(activeSuggestionPlatform);
    if (containsSelected(justwatchTop10Query.data)) platformIds.add('justwatch');

    return [...platformIds].map((id, order) => {
      const platform = PLATFORM_PREFERENCES.find((item) => item.id === id);
      return {
        id: `preview-platform-${id}`,
        name: platform?.name || id,
        tmdbProviderId: null,
        logoPath: null,
        isPrimary: order === 0,
        order,
      };
    });
  }, [selectedCandidate, queries, visiblePlatforms, platformPopularQuery.data, activePopularPlatform, suggestionsQuery.data, activeSuggestionPlatform, justwatchTop10Query.data]);

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
      imdbRating: details?.imdbRating ?? null,
      tmdbId: selectedCandidate.tmdbId || null,
      imdbId: selectedCandidate.imdbId || null,
      imdbUrl: selectedCandidate.imdbId ? `https://www.imdb.com/title/${selectedCandidate.imdbId}` : null,
      tmdbUrl: selectedCandidate.tmdbId ? `https://www.themoviedb.org/${selectedCandidate.type === 'movie' ? 'movie' : 'tv'}/${selectedCandidate.tmdbId}` : null,
      justwatchUrl: details?.justwatchUrl || null,
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
      platforms: (() => {
        const platformKey = (name: string) => {
          const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').replace(/[^a-z0-9]+/g, ' ').trim();
          if (normalized.includes('amazon prime') || normalized.includes('prime video')) return 'prime';
          if (normalized.includes('disney')) return 'disney';
          if (normalized.includes('hbo') || normalized === 'max') return 'max';
          if (normalized.includes('apple tv')) return 'apple';
          if (normalized.includes('paramount')) return 'paramount';
          return normalized;
        };
        const detailPlatforms = (details?.platforms || []).map((platform, index) => ({
          id: `preview-platform-${platform.tmdbProviderId || index}`,
          name: platform.name,
          tmdbProviderId: platform.tmdbProviderId ?? null,
          logoPath: platform.logoPath ?? null,
          isPrimary: platform.isPrimary ?? index === 0,
          order: platform.order ?? index,
        }));
        const merged = [...detailPlatforms];
        const normalizedNames = new Set(detailPlatforms.map((platform) => platformKey(platform.name)));
        selectedCandidateSourcePlatforms.forEach((platform) => {
          const normalizedName = platformKey(platform.name);
          if (!normalizedNames.has(normalizedName)) {
            normalizedNames.add(normalizedName);
            merged.push({ ...platform, isPrimary: merged.length === 0, order: merged.length });
          }
        });
        return merged;
      })(),
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
  }, [selectedCandidate, existingMovie, candidateDetails.data, selectedCandidateSourcePlatforms]);

  const allCandidatesInActivePlatform = useMemo(() => {
    if (!selectedCandidate) return [];
    if (platformPopularQuery.data) {
      const all = [
        ...(platformPopularQuery.data.featuredMovies || []),
        ...(platformPopularQuery.data.featuredSeries || []),
        ...(platformPopularQuery.data.top10Week || []),
        ...currentPlatformNewReleases,
        ...(platformPopularQuery.data.fanFavorites || []),
        ...(platformPopularQuery.data.popularMovies || []),
        ...(platformPopularQuery.data.popularSeries || []),
      ];
      if (all.some((c) => (c.tmdbId && c.tmdbId === selectedCandidate.tmdbId) || c.title === selectedCandidate.title)) {
        return all;
      }
    }
    if (justwatchTop10Query.data?.some((c) => c.tmdbId === selectedCandidate.tmdbId)) {
      return justwatchTop10Query.data;
    }
    for (const q of queries) {
      const list = getTop10(q.data);
      if (list.some((c) => c.tmdbId === selectedCandidate.tmdbId)) {
        return list;
      }
    }
    return [];
  }, [selectedCandidate, platformPopularQuery.data, currentPlatformNewReleases, queries, justwatchTop10Query.data]);

  const activeIndex = useMemo(() => {
    if (!selectedCandidate || !allCandidatesInActivePlatform.length) return -1;
    return allCandidatesInActivePlatform.findIndex((c) => c.tmdbId === selectedCandidate.tmdbId);
  }, [selectedCandidate, allCandidatesInActivePlatform]);

  const handlePrevious = activeIndex > 0 ? () => setSelectedCandidate(allCandidatesInActivePlatform[activeIndex - 1]) : undefined;
  const handleNext = activeIndex >= 0 && activeIndex < allCandidatesInActivePlatform.length - 1 ? () => setSelectedCandidate(allCandidatesInActivePlatform[activeIndex + 1]) : undefined;

  const importMutation = useMutation({
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
        imdbRating: null,
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
      const key = candidate.imdbId || `${candidate.type}-${candidate.tmdbId}`;
      setAddedMovieKeys((current) => ({ ...current, [key]: true, [saved.id]: true }));
      queryClient.setQueryData<MovieItem[]>(['movies'], (current = []) =>
        current.some((m) => m.id === saved.id) ? current : [saved, ...current]
      );
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      queryClient.invalidateQueries({ queryKey: ['metadata'] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });

  const isItemAdding = useCallback(
    (candidate: TmdbSuggestionCandidate) => {
      if (!importMutation.isPending || !importMutation.variables) return false;
      const v = importMutation.variables;
      return (
        (Boolean(v.imdbId) && v.imdbId === candidate.imdbId) ||
        (Boolean(v.tmdbId) && v.tmdbId === candidate.tmdbId) ||
        v.title === candidate.title
      );
    },
    [importMutation.isPending, importMutation.variables]
  );

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

  if (!visiblePlatforms.length) {
    return (
      <main className="news-page min-h-screen bg-canvas pb-20">
        <Header />
        <section className="grid min-h-[65vh] place-items-center px-4 py-12 text-center">
          <div className="max-w-lg">
            <Tv className="mx-auto h-14 w-14 text-aqua" />
            <h1 className="mt-4 font-bebas text-3xl uppercase text-ink sm:text-4xl">Elegí tus plataformas</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">Seleccioná las plataformas que utilizás para ver solamente sus contenidos en Novedades.</p>
            <button type="button" onClick={() => window.dispatchEvent(new Event('moviebox:open-platform-preferences'))} className="primary-button mt-6">Seleccionar plataformas</button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="news-page min-h-screen bg-canvas pb-20 relative">
      <Header />
      <section id="buscar-novedades" className="library-toolbar scroll-mt-20 border-b border-slate-200/70 bg-canvas px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-[1500px]">
          <h1 className="mb-4 text-center font-bebas text-3xl font-normal uppercase text-ink sm:text-4xl">Buscar novedades</h1>
          <div className="flex flex-col gap-3">
            <div className="order-2 min-w-0">
              <p className="truncate text-xs text-slate-500">Mostrando {hasNewsFilters ? newsSearchResults.length : allNewsCount} de {allNewsCount} títulos</p>
              {(genreFilter.length > 0 || platformFilter.length > 0 || yearFilter.length > 0 || typeFilter !== 'all') && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {genreFilter.map((genre) => <button key={`active-genre-${genre}`} type="button" onClick={() => setGenreFilter((current) => current.filter((name) => name !== genre))} className="inline-flex max-w-full items-center gap-1 rounded bg-mist px-1.5 py-0.5 text-[11px] font-medium text-slate-600" title={`Quitar género ${genre}`}><span className="truncate">{genre}</span><X className="h-3 w-3 shrink-0" /></button>)}
                  {platformFilter.map((id) => {
                    const platformName = visiblePlatforms.find((platform) => platform.id === id)?.name || id;
                    return <button key={`active-platform-${id}`} type="button" onClick={() => setPlatformFilter((current) => current.filter((value) => value !== id))} className="inline-flex max-w-full items-center gap-1 rounded bg-mist px-1.5 py-0.5 text-[11px] font-medium text-slate-600" title={`Quitar plataforma ${platformName}`}><span className="truncate">{platformName}</span><X className="h-3 w-3 shrink-0" /></button>;
                  })}
                  {yearFilter.map((year) => <button key={`active-year-${year}`} type="button" onClick={() => setYearFilter((current) => current.filter((value) => value !== year))} className="inline-flex max-w-full items-center gap-1 rounded bg-mist px-1.5 py-0.5 text-[11px] font-medium text-slate-600" title={`Quitar año ${year}`}>{year}<X className="h-3 w-3" /></button>)}
                  {typeFilter !== 'all' && <button type="button" onClick={() => setTypeFilter('all')} className="inline-flex max-w-full items-center gap-1 rounded bg-mist px-1.5 py-0.5 text-[11px] font-medium text-slate-600" title="Quitar filtro de tipo">{typeFilter === 'movie' ? 'Película' : 'Serie'}<X className="h-3 w-3" /></button>}
                  <button type="button" onClick={() => { setTypeFilter('all'); setGenreFilter([]); setPlatformFilter([]); setYearFilter([]); setYearDraft(''); }} className="ml-1 px-1 py-0.5 text-[11px] font-semibold uppercase text-coral hover:underline">Limpiar</button>
                </div>
              )}
            </div>
            <div className="order-1 flex min-w-0 flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              ref={newsSearchInputRef}
              type="text"
              value={newsSearch}
              onChange={(event) => setNewsSearch(event.target.value)}
              placeholder="Buscar películas o series en novedades..."
              className="news-search-input control h-10 w-full pl-12 pr-16 text-sm"
              aria-label="Buscar en novedades"
            />
            {newsSearch ? (
              <button type="button" onClick={() => { setNewsSearch(''); newsSearchInputRef.current?.focus(); }} className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-mist hover:text-ink" aria-label="Borrar búsqueda"><X className="h-4 w-4" /></button>
            ) : (
              <button
                type="button"
                onClick={() => void pasteNewsSearch()}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase text-slate-600 transition-colors hover:bg-slate-200 hover:text-ink"
              >
                Pegar
              </button>
            )}
          </div>
            <div className="grid w-full grid-cols-3 gap-1.5 md:flex md:w-auto md:shrink-0 md:items-center">
                <button type="button" aria-pressed={typeFilter === 'all'} onClick={() => setTypeFilter('all')} className={quickTypeButtonClass(typeFilter === 'all')}>
                  <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Todos</span>
                </button>
                <button type="button" aria-pressed={typeFilter === 'movie'} onClick={() => setTypeFilter(typeFilter === 'movie' ? 'all' : 'movie')} className={quickTypeButtonClass(typeFilter === 'movie')}>
                  <Film className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Películas</span>
                </button>
                <button type="button" aria-pressed={typeFilter === 'series'} onClick={() => setTypeFilter(typeFilter === 'series' ? 'all' : 'series')} className={quickTypeButtonClass(typeFilter === 'series')}>
                  <Tv className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Series</span>
                </button>
            </div>
              <button type="button" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((current) => !current)} className="library-toolbar-menu-button inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold uppercase text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 md:w-auto">
                <Filter className="h-3.5 w-3.5 shrink-0" />
                <span>Filtrar</span>
                <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
          {filtersOpen && (
            <div className="relative mt-3 rounded-md border border-slate-200 bg-canvas">
              <button type="button" onClick={() => setFiltersOpen(false)} className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:bg-slate-200 hover:text-ink" title="Cerrar filtros" aria-label="Cerrar filtros"><X className="h-4 w-4" /></button>
              <div className="flex flex-col gap-3 px-4 py-3.5 pr-12">
                <div className="grid w-full grid-cols-1 gap-1.5 sm:flex sm:flex-row sm:items-end sm:gap-2">
                  <FilterSelect
                    label="Género"
                    placeholder="Filtrar por género"
                    searchPlaceholder="Buscar género..."
                    plural="seleccionado{s}"
                    options={availableGenres.map((genre) => {
                      const iconImage = getGenreIconImage(genre);
                      return {
                        id: genre,
                        label: genre,
                        icon: iconImage
                          ? <img src={iconImage} alt="" className="h-6 w-6 shrink-0 object-contain" loading="lazy" />
                          : <span className="grid h-6 w-6 shrink-0 place-items-center" aria-hidden="true"><Tags className="h-4 w-4 text-aqua" /></span>,
                      };
                    })}
                    selected={genreFilter}
                    onToggle={(id) => setGenreFilter((current) => current.includes(id) ? current.filter((name) => name !== id) : [...current, id])}
                  />
                  <FilterSelect
                    label="Plataforma"
                    placeholder="Filtrar por plataforma"
                    searchPlaceholder="Buscar plataforma..."
                    plural="seleccionada{s}"
                    options={visiblePlatforms.map((platform) => ({ id: platform.id, label: platform.name, icon: <FilterPlatformIcon name={platform.name} /> }))}
                    selected={platformFilter}
                    onToggle={(id) => setPlatformFilter((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id])}
                  />
                  <div className="min-w-0 flex-1">
                    <label htmlFor="news-year-filter" className="field-label">Año</label>
                    <input id="news-year-filter" className="control w-full" type="text" inputMode="numeric" value={yearDraft} onChange={(event) => setYearDraft(event.target.value.replace(/\D/g, '').slice(0, 4))} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); const value = Number(yearDraft); if (yearDraft.length === 4 && !yearFilter.includes(value)) setYearFilter((current) => [...current, value]); setYearDraft(''); } }} placeholder="Escribir y Enter" aria-label="Agregar año" />
                  </div>
                </div>
              </div>
            </div>
          )}
          {hasNewsFilters && (
            <div className="mt-5 border-t border-slate-200/70 pt-5">
              <div className="mb-3 flex items-baseline justify-between gap-4">
                <h2 className="font-bebas text-2xl uppercase text-ink">{newsSearch.trim() ? `Resultados para “${newsSearch.trim()}”` : 'Resultados'}</h2>
                <span className="text-xs text-slate-500">{newsSearchResults.length} {newsSearchResults.length === 1 ? 'título' : 'títulos'}</span>
              </div>
              {queries.some((query) => query.isLoading) && !newsSearchResults.length ? (
                <div className="grid h-36 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-aqua" /></div>
              ) : newsSearchResults.length ? (
                <HorizontalScrollSection wrap items={newsSearchResults} onSelect={setSelectedCandidate} isMovieInLibrary={isMovieInLibrary} isItemAdding={isItemAdding} onAdd={(item) => importMutation.mutate(item)} />
              ) : (
                <p className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">No se encontraron novedades con esos filtros.</p>
              )}
            </div>
          )}
        </div>
      </section>
      {/* Sección principal superior: Populares por plataforma (JustWatch) */}
      <section id="populares-plataforma" className="scroll-mt-20 w-full px-4 pt-6 pb-12 sm:px-6 sm:pt-8 sm:pb-14 border-b border-slate-200/50">
        <h1 className="font-bebas text-3xl sm:text-4xl font-normal text-ink uppercase text-center mb-4">
          Populares por plataforma
        </h1>

        {/* Iconos de plataformas */}
        <div className="w-fit mx-auto grid grid-cols-5 gap-2.5 sm:gap-3 sm:w-auto sm:flex sm:flex-wrap sm:items-center sm:justify-center mb-8">
          {visiblePlatforms.map((p) => {
            const active = activePopularPlatform === p.id;
            const logoUrl = resolvePlatformLogoUrl({ name: p.name, logoPath: null });
            return (
              <button
                key={`popular-${p.id}`}
                type="button"
                onClick={() => setActivePopularPlatform(p.id)}
                title={p.name}
                aria-label={p.name}
                className={`news-suggestion-platform-btn group relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl transition-all p-0 ${
                  active
                    ? 'active ring-2 ring-coral ring-offset-2 ring-offset-canvas shadow-md scale-105 opacity-100'
                    : 'opacity-75 hover:opacity-100 hover:scale-105'
                }`}
              >
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={p.name}
                    className="h-full w-full rounded-xl object-contain shrink-0"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center rounded-xl bg-slate-800 text-sm font-bold text-white">
                    {p.name.slice(0, 2)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Contenido de acuerdo a la plataforma elegida */}
        {platformPopularQuery.isLoading ? (
          <div className="grid h-64 place-items-center">
            <Loader2 className="h-8 w-8 animate-spin text-aqua" />
          </div>
        ) : platformPopularQuery.data ? (
          <div className="space-y-10">
            {/* 1. Las 10 películas más destacadas */}
            <div>
              <div className="relative flex items-center justify-between mb-3">
                <h2 className="font-bebas text-2xl sm:text-3xl text-ink uppercase tracking-wide">
                  Las 10 películas más destacadas en {currentPopularPlatformName}
                </h2>
              </div>
              <Top10FeaturedSection
                hideTypeBadge
                items={platformPopularQuery.data.featuredMovies || []}
                onSelect={setSelectedCandidate}
                isMovieInLibrary={isMovieInLibrary}
                isItemAdding={isItemAdding}
                onAdd={(cand) => importMutation.mutate(cand)}
              />
            </div>

            {/* 2. Las 10 series más destacadas */}
            <div>
              <div className="relative flex items-center justify-between mb-3">
                <h2 className="font-bebas text-2xl sm:text-3xl text-ink uppercase tracking-wide">
                  Las 10 series más destacadas en {currentPopularPlatformName}
                </h2>
              </div>
              <Top10FeaturedSection
                hideTypeBadge
                items={platformPopularQuery.data.featuredSeries || []}
                onSelect={setSelectedCandidate}
                isMovieInLibrary={isMovieInLibrary}
                isItemAdding={isItemAdding}
                onAdd={(cand) => importMutation.mutate(cand)}
              />
            </div>

            {/* 3. Novedades en la plataforma seleccionada */}
            <div>
              <div className="relative flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-bebas text-2xl sm:text-3xl text-ink uppercase tracking-wide">
                    Novedades en {currentPopularPlatformName}
                  </h2>
                  <p className="text-xs text-slate-500">Últimas incorporaciones</p>
                </div>
              </div>
              {platformNewReleasesQuery.isLoading ? (
                <div className="grid h-40 place-items-center">
                  <Loader2 className="h-6 w-6 animate-spin text-aqua" />
                </div>
              ) : currentPlatformNewReleases.length > 0 ? (
                <HorizontalScrollSection
                  items={currentPlatformNewReleases}
                  onSelect={setSelectedCandidate}
                  isMovieInLibrary={isMovieInLibrary}
                  isItemAdding={isItemAdding}
                  onAdd={(cand) => importMutation.mutate(cand)}
                />
              ) : (
                <p className="text-sm text-slate-400 py-4">No hay novedades recientes para mostrar en esta plataforma.</p>
              )}
            </div>

            {/* 4 y 5. Todas las películas y todas las series */}
                {/* 4. Todas las películas de la plataforma (las 50 más populares) */}
                <div>
                  <div className="relative flex items-center justify-between mb-3">
                    <div>
                      <h2 className="font-bebas text-2xl sm:text-3xl text-ink uppercase tracking-wide">
                        Todas las películas en {currentPopularPlatformName}
                      </h2>
                      <p className="text-xs text-slate-500">Las 50 más populares</p>
                    </div>
                  </div>
                  <HorizontalScrollSection
                    hideTypeBadge
                    items={platformPopularQuery.data.popularMovies || []}
                    onSelect={setSelectedCandidate}
                    isMovieInLibrary={isMovieInLibrary}
                    isItemAdding={isItemAdding}
                    onAdd={(cand) => importMutation.mutate(cand)}
                  />
                </div>

                {/* 5. Todas las series de la plataforma (las 50 más populares) */}
                <div>
                  <div className="relative flex items-center justify-between mb-3">
                    <div>
                      <h2 className="font-bebas text-2xl sm:text-3xl text-ink uppercase tracking-wide">
                        Todas las series en {currentPopularPlatformName}
                      </h2>
                      <p className="text-xs text-slate-500">Las 50 más populares</p>
                    </div>
                  </div>
                  <HorizontalScrollSection
                    hideTypeBadge
                    items={platformPopularQuery.data.popularSeries || []}
                    onSelect={setSelectedCandidate}
                    isMovieInLibrary={isMovieInLibrary}
                    isItemAdding={isItemAdding}
                    onAdd={(cand) => importMutation.mutate(cand)}
                  />
                </div>
          </div>
        ) : (
          <p className="text-center text-sm text-slate-400 py-8">
            No se pudieron cargar los títulos populares para {currentPopularPlatformName}.
          </p>
        )}
      </section>

      {/* Sección: Top 10 en AR */}
        {user?.preferredPlatforms.includes('justwatch') && <section id="top-10-ar" className="scroll-mt-20 w-full px-4 pt-6 sm:px-6 sm:pt-8">
          <div className="relative flex items-center justify-center mb-4">
            <h2 className="font-bebas text-2xl sm:text-3xl font-normal text-ink uppercase tracking-wide text-center">
              Top 10 en AR
            </h2>
          </div>

          {justwatchTop10Query.isLoading ? (
            <div className="grid h-48 place-items-center">
              <Loader2 className="h-8 w-8 animate-spin text-aqua" />
            </div>
          ) : justwatchTop10Query.data?.length ? (
            <Top10FeaturedSection
              items={justwatchTop10Query.data}
              onSelect={setSelectedCandidate}
              isMovieInLibrary={isMovieInLibrary}
              isItemAdding={isItemAdding}
              onAdd={(cand) => importMutation.mutate(cand)}
            />
          ) : (
            <p className="text-sm text-slate-400 py-6">No se pudieron cargar los títulos destacados.</p>
          )}
      </section>}

      <section id="top-10-plataforma" className="scroll-mt-20 w-full px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="font-bebas text-3xl font-normal text-ink uppercase text-center mb-4">
          Top 10 por plataforma
        </h1>

        <div className="space-y-10 pt-6 pb-8">
          {visiblePlatforms.map((platform, index) => {
            const query = queries[index];
            const top10 = getTop10(query.data).map((item, itemIndex): JustWatchTop10Item => ({ ...item, rank: itemIndex + 1, jwId: `${platform.id}-${item.tmdbId}` }));
            const logoUrl = resolvePlatformLogoUrl({ name: platform.name, logoPath: null });
            return (
              <section key={`content-${platform.id}`} className="min-w-0">
                <button
                  type="button"
                  onClick={() => navigate(`/novedades/${platform.id}`)}
                  className="mb-3 flex items-center gap-3 py-1 text-left transition-opacity hover:opacity-80 group/btn"
                >
                  {logoUrl && <img src={logoUrl} alt={platform.name} className="h-10 w-auto shrink-0 rounded object-contain transition-transform group-hover/btn:scale-105" />}
                  <h3 className="truncate font-bebas text-2xl leading-none tracking-wide text-ink sm:text-[28px]">{platform.name}</h3>
                </button>
                {query.isLoading ? (
                  <div className="grid h-48 place-items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-aqua" />
                  </div>
                ) : top10.length ? (
                  <Top10FeaturedSection
                    compact
                    items={top10}
                    onSelect={setSelectedCandidate}
                    isMovieInLibrary={isMovieInLibrary}
                    isItemAdding={isItemAdding}
                    onAdd={(cand) => importMutation.mutate(cand)}
                  />
                ) : (
                  <p className="py-6 text-sm text-slate-400">No hay títulos para mostrar en esta plataforma.</p>
                )}
              </section>
            );
          })}
        </div>

        {/* Sección: Sugerencias debajo del todo */}
        <div id="sugerencias-plataforma" className="scroll-mt-20 mt-14 border-t border-slate-200/40 pt-8 pb-10 space-y-3">
          <div className="space-y-3">
            <div className="text-center">
              <h2 className="font-bebas text-2xl uppercase text-ink sm:text-3xl">Sugerencias por plataforma</h2>
            </div>
            <div className="w-fit mx-auto grid grid-cols-5 gap-2.5 sm:gap-3 sm:w-auto sm:flex sm:flex-wrap sm:items-center sm:justify-center">
              {visiblePlatforms.map((p) => {
                const active = activeSuggestionPlatform === p.id;
                const logoUrl = resolvePlatformLogoUrl({ name: p.name, logoPath: null });
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      if (activeSuggestionPlatform === p.id) {
                        setSuggestionSeed((s) => s + 1);
                      } else {
                        setActiveSuggestionPlatform(p.id);
                        setSuggestionSeed(0);
                      }
                    }}
                    title={p.name}
                    aria-label={p.name}
                    className={`news-suggestion-platform-btn group relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl transition-all p-0 ${
                      active
                        ? 'active ring-2 ring-coral ring-offset-2 ring-offset-canvas shadow-md scale-105 opacity-100'
                        : 'opacity-75 hover:opacity-100 hover:scale-105'
                    }`}
                  >
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt={p.name}
                        className="h-full w-full rounded-xl object-contain shrink-0"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center rounded-xl bg-slate-800 text-sm font-bold text-white">{p.name.slice(0, 2)}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {suggestionsQuery.isLoading ? (
            <div className="grid min-h-[360px] place-items-center">
              <Loader2 className="h-8 w-8 animate-spin text-aqua" />
            </div>
          ) : suggestionsQuery.isError ? (
            <div className="mt-4 rounded-md border border-red-100 bg-red-50 p-5 text-center">
              <p className="text-sm text-red-700">
                No se pudieron cargar las sugerencias de {visiblePlatforms.find((p) => p.id === activeSuggestionPlatform)?.name || 'la plataforma'}.
              </p>
              <button type="button" onClick={() => suggestionsQuery.refetch()} className="secondary-button mt-3">
                Reintentar
              </button>
            </div>
          ) : suggestionCandidates.length ? (
            <TinderSuggestions
              key={`${activeSuggestionPlatform}-${suggestionSeed}`}
              initialCandidates={suggestionCandidates}
              onSelect={(candidate) => setSelectedCandidate(candidate)}
              onAdd={(candidate) => {
                if (!isSuggestionCandidateAdded(candidate)) {
                  importSuggestionMutation.mutate(candidate);
                }
              }}
              isAdding={importSuggestionMutation.isPending}
              addingTmdbId={importSuggestionMutation.variables ? Number(importSuggestionMutation.variables.tmdbId) : null}
            />
          ) : (
            <div className="grid min-h-[280px] place-items-center text-center">
              <div>
                <Film className="mx-auto h-12 w-12 text-aqua" />
                <p className="mt-3 font-semibold text-ink">No hay sugerencias para mostrar</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Modal con las características completas de la película */}
      {activeMovie && (
        <MovieDetailModal
          movie={activeMovie}
          onClose={() => setSelectedCandidate(null)}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onAdd={!existingMovie ? () => selectedCandidate && importMutation.mutate(selectedCandidate) : undefined}
          onPersonal={(movie, field) => updatePersonal.mutate({ movie, field })}
          onRating={(movie, rating) => updateRating.mutate({ movie, rating })}
        />
      )}
    </main>
  );
};
