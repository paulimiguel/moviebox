import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Header } from '@/components/Header';
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useNavigate, useLocation } from 'react-router-dom';
import { resolvePlatformLogoUrl } from '@/components/PlatformLogos';
import { MovieDetailModal } from '@/components/MovieDetailModal';
import { TinderSuggestions } from '@/components/TinderSuggestions';
import { Loader2, Film, Tv, ChevronLeft, ChevronRight, Plus, Check } from 'lucide-react';
import type { JustWatchTop10Item, MovieItem, TmdbSuggestionCandidate } from '@/types/movie';

const SUGGESTION_PLATFORMS = [
  { id: 'netflix', name: 'Netflix' },
  { id: 'prime', name: 'Prime Video' },
  { id: 'apple', name: 'Apple TV' },
  { id: 'disney', name: 'Disney+' },
  { id: 'max', name: 'HBO Max' },
  { id: 'flow', name: 'Flow' },
  { id: 'paramount', name: 'Paramount+' },
  { id: 'justwatch', name: 'JustWatch' },
];

const PLATFORMS = [
  { id: 'netflix', name: 'Netflix' },
  { id: 'prime', name: 'Prime Video' },
  { id: 'apple', name: 'Apple TV' },
  { id: 'disney', name: 'Disney+' },
  { id: 'justwatch', name: 'JustWatch' },
  { id: 'max', name: 'HBO Max' },
  { id: 'flow', name: 'Flow' },
  { id: 'paramount', name: 'Paramount+' },
  { id: 'stremio', name: 'Stremio' },
  { id: 'claro', name: 'Claro Video' },
];

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

const Top10Item = ({
  item,
  rank,
  onSelect,
  isAdded = false,
  isAdding = false,
  onAdd,
}: {
  item: TmdbSuggestionCandidate;
  rank: number;
  onSelect: (item: TmdbSuggestionCandidate) => void;
  isAdded?: boolean;
  isAdding?: boolean;
  onAdd?: (item: TmdbSuggestionCandidate) => void;
}) => {
  return (
    <article className="flex items-center gap-3 group/item">
      <div className="news-ranking-number relative flex shrink-0 items-center justify-center w-[52px] font-black text-[42px] tracking-tighter text-slate-400">
        {rank}
      </div>
      <div className="relative h-[84px] w-[58px] shrink-0">
        <button
          type="button"
          onClick={() => onSelect(item)}
          className="h-full w-full overflow-hidden rounded bg-mist relative text-left transition-transform group-hover/item:scale-105 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-coral block"
          title={`Ver características de ${item.title}`}
          aria-label={`Ver características de ${item.title}`}
        >
          {item.posterUrl ? (
            <img src={item.posterUrl} alt={item.title} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-aqua/50">
              {item.type === 'movie' ? <Film className="h-5 w-5" /> : <Tv className="h-5 w-5" />}
            </div>
          )}
        </button>
        {onAdd && (
          <div className="absolute bottom-1 right-1 z-10">
            <CoverAddButton
              item={item}
              isAdded={isAdded}
              isAdding={isAdding}
              onAdd={onAdd}
              size="sm"
            />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={() => onSelect(item)}
          className="text-left group/title focus:outline-none block w-full"
          title={`Ver características de ${item.title}`}
        >
          <h4 className="font-bebas text-xl uppercase leading-5 text-ink line-clamp-2 transition-colors group-hover/item:text-coral group-hover/title:text-coral">
            {item.title}
          </h4>
        </button>
        <p className="truncate text-xs text-slate-500 mt-0.5">{item.year || ''}</p>
      </div>
    </article>
  );
};

const Top10FeaturedSection = ({
  items,
  onSelect,
  isMovieInLibrary,
  isItemAdding,
  onAdd,
}: {
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
    <div className="relative group/carousel">
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollByAmount(-400)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-30 grid h-10 w-10 place-items-center rounded-full bg-black/70 text-white shadow-lg backdrop-blur hover:bg-coral hover:scale-110 transition-all opacity-0 group-hover/carousel:opacity-100"
          aria-label="Anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollByAmount(400)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-30 grid h-10 w-10 place-items-center rounded-full bg-black/70 text-white shadow-lg backdrop-blur hover:bg-coral hover:scale-110 transition-all opacity-0 group-hover/carousel:opacity-100"
          aria-label="Siguiente"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
      <div
        ref={containerRef}
        className="flex gap-6 sm:gap-10 overflow-x-auto pb-6 pt-2 hide-scrollbar scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => (
          <div
            key={`featured-${item.type}-${item.rank}-${item.tmdbId || item.jwId}`}
            onClick={() => onSelect(item)}
            className="relative flex items-end shrink-0 select-none group/jw cursor-pointer focus:outline-none"
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
            <span className="justwatch-rank-number font-sans font-black text-[130px] sm:text-[165px] leading-[0.8] tracking-tighter select-none -mr-2 sm:-mr-3 z-0 transition-all duration-200 group-hover/jw:scale-105 pointer-events-none">
              {item.rank}
            </span>

            {/* Tarjeta de póster */}
            <div className="relative z-10 w-[135px] sm:w-[160px] aspect-[2/3] overflow-hidden rounded-lg bg-mist shadow-md transition-all duration-200 group-hover/jw:scale-105 group-hover/jw:shadow-xl ring-1 ring-black/5 dark:ring-white/10">
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
                <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white shadow-sm ${item.type === 'series' ? 'bg-aqua' : 'bg-coral'}`}>
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
}: {
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
    <div className="relative group/carousel">
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollByAmount(-400)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-30 grid h-10 w-10 place-items-center rounded-full bg-black/70 text-white shadow-lg backdrop-blur hover:bg-coral hover:scale-110 transition-all opacity-0 group-hover/carousel:opacity-100"
          aria-label="Anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollByAmount(400)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-30 grid h-10 w-10 place-items-center rounded-full bg-black/70 text-white shadow-lg backdrop-blur hover:bg-coral hover:scale-110 transition-all opacity-0 group-hover/carousel:opacity-100"
          aria-label="Siguiente"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
      <div
        ref={containerRef}
        className="flex gap-4 overflow-x-auto pb-4 pt-2 hide-scrollbar scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
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
                <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white shadow-sm ${item.type === 'series' ? 'bg-aqua' : 'bg-coral'}`}>
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

export const NewsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

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
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<TmdbSuggestionCandidate | null>(null);

  const library = useQuery({ queryKey: ['movies'], queryFn: api.movies.getAll });
  const justwatchTop10Query = useQuery({
    queryKey: ['justwatchTop10'],
    queryFn: api.tmdb.justwatchTop10,
    staleTime: 1000 * 60 * 30,
  });

  const [activePopularPlatform, setActivePopularPlatform] = useState('netflix');

  const platformPopularQuery = useQuery({
    queryKey: ['justwatch-platform-popular', activePopularPlatform],
    queryFn: () => api.tmdb.justwatchPlatformPopular(activePopularPlatform),
    staleTime: 1000 * 60 * 30,
  });

  const currentPopularPlatformName = useMemo(() => {
    return SUGGESTION_PLATFORMS.find((p) => p.id === activePopularPlatform)?.name || 'la plataforma';
  }, [activePopularPlatform]);

  const [activeSuggestionPlatform, setActiveSuggestionPlatform] = useState('netflix');
  const [suggestionSeed, setSuggestionSeed] = useState(0);
  const [addedSuggestionMovieIds, setAddedSuggestionMovieIds] = useState<Record<string, string>>({});

  const suggestionsQuery = useQuery({
    queryKey: ['tmdb-platform-suggestions', activeSuggestionPlatform, suggestionSeed],
    queryFn: () => api.tmdb.platformSuggestions(activeSuggestionPlatform, suggestionSeed),
    staleTime: 1000 * 60 * 5,
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
    queries: PLATFORMS.map((platform) => ({
      queryKey: ['newReleases', platform.id],
      queryFn: () => api.tmdb.newReleases(platform.id),
      staleTime: 1000 * 60 * 5,
    })),
  });

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

  const allCandidatesInActivePlatform = useMemo(() => {
    if (!selectedCandidate) return [];
    if (platformPopularQuery.data) {
      const all = [
        ...(platformPopularQuery.data.featuredMovies || []),
        ...(platformPopularQuery.data.featuredSeries || []),
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
  }, [selectedCandidate, platformPopularQuery.data, queries, justwatchTop10Query.data]);

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

  const updateScrollState = () => {
    const el = contentScrollRef.current;
    if (!el) return;
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = el.scrollLeft;
    }
    setCanScrollLeft(el.scrollLeft > 5);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
  };

  useEffect(() => {
    const el = contentScrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, []);

  useEffect(() => {
    updateScrollState();
  }, [queries]);

  const scrollLeft = () => {
    const el = contentScrollRef.current;
    if (!el) return;
    const amount = el.clientWidth;
    el.scrollBy({ left: -amount, behavior: 'smooth' });
    setTimeout(updateScrollState, 400);
  };

  const scrollRight = () => {
    const el = contentScrollRef.current;
    if (!el) return;
    const amount = el.clientWidth;
    el.scrollBy({ left: amount, behavior: 'smooth' });
    setCanScrollLeft(true);
    setTimeout(updateScrollState, 400);
  };

  return (
    <main className="news-page min-h-screen bg-canvas pb-20 relative">
      <Header />



      {/* Sección principal superior: Populares por plataforma (JustWatch) */}
      <section id="populares-plataforma" className="scroll-mt-20 mx-auto max-w-[1500px] px-4 pt-6 pb-12 sm:px-6 sm:pt-8 sm:pb-14 border-b border-slate-200/50">
        <h1 className="font-bebas text-3xl sm:text-4xl font-normal text-ink uppercase text-center mb-4">
          Populares por plataforma
        </h1>

        {/* Iconos de plataformas */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 mb-8">
          {SUGGESTION_PLATFORMS.map((p) => {
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
                items={platformPopularQuery.data.featuredSeries || []}
                onSelect={setSelectedCandidate}
                isMovieInLibrary={isMovieInLibrary}
                isItemAdding={isItemAdding}
                onAdd={(cand) => importMutation.mutate(cand)}
              />
            </div>

            {/* 3. Todas las películas de la plataforma (las 50 más populares) */}
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
                items={platformPopularQuery.data.popularMovies || []}
                onSelect={setSelectedCandidate}
                isMovieInLibrary={isMovieInLibrary}
                isItemAdding={isItemAdding}
                onAdd={(cand) => importMutation.mutate(cand)}
              />
            </div>

            {/* 4. Todas las series de la plataforma (las 50 más populares) */}
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

      <section id="top-10-plataforma" className="scroll-mt-20 mx-auto max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="font-bebas text-3xl font-normal text-ink uppercase text-center mb-4">
          Top 10 por plataforma
        </h1>

        {/* Barra superior con logos y títulos centrados (no fija) */}
        <div className="news-sticky-header bg-canvas pt-3 pb-3 border-b border-slate-200/50 -mx-4 px-4 sm:-mx-6 sm:px-6">
          <div
            ref={headerScrollRef}
            className="flex gap-6 overflow-x-hidden hide-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {PLATFORMS.map((platform) => {
              const logoUrl = resolvePlatformLogoUrl({ name: platform.name, logoPath: null });
              return (
                <div
                  key={`header-${platform.id}`}
                  className="w-[calc(100%-32px)] sm:w-[calc((100%-24px)/2)] lg:w-[calc((100%-72px)/4)] min-w-[260px] shrink-0 flex items-center justify-center px-2"
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/novedades/${platform.id}`)}
                    className="flex items-center justify-center gap-3 hover:opacity-80 transition-opacity text-center w-full py-1 group/btn"
                  >
                    {logoUrl && <img src={logoUrl} alt={platform.name} className="h-10 w-auto rounded object-contain shrink-0 transition-transform group-hover/btn:scale-105" />}
                    <h3 className="font-bebas text-2xl sm:text-[28px] leading-none text-ink tracking-wide truncate">{platform.name}</h3>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Carrusel de contenido: 4 columnas por página en desktop */}
        <div className="relative group/carousel">
          {canScrollLeft && (
            <button
              type="button"
              onClick={scrollLeft}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-30 grid h-10 w-10 place-items-center rounded-full bg-black/70 text-white shadow-lg backdrop-blur hover:bg-coral hover:scale-110 transition-all opacity-0 group-hover/carousel:opacity-100"
              aria-label="Anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          {canScrollRight && (
            <button
              type="button"
              onClick={scrollRight}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-30 grid h-10 w-10 place-items-center rounded-full bg-black/70 text-white shadow-lg backdrop-blur hover:bg-coral hover:scale-110 transition-all opacity-0 group-hover/carousel:opacity-100"
              aria-label="Siguiente"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
          <div
            ref={contentScrollRef}
            className="flex gap-6 overflow-x-auto pt-6 pb-8 snap-x snap-mandatory hide-scrollbar relative [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {PLATFORMS.map((platform, index) => {
              const query = queries[index];
              const top10 = getTop10(query.data);
              return (
                <div
                  key={`content-${platform.id}`}
                  className="w-[calc(100%-32px)] sm:w-[calc((100%-24px)/2)] lg:w-[calc((100%-72px)/4)] min-w-[260px] shrink-0 snap-start flex flex-col"
                >
                  {query.isLoading ? (
                    <div className="grid h-64 place-items-center">
                      <Loader2 className="h-8 w-8 animate-spin text-aqua" />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {top10.map((item, itemIndex) => (
                        <Top10Item
                          key={`${item.type}-${item.tmdbId}`}
                          item={item}
                          rank={itemIndex + 1}
                          onSelect={setSelectedCandidate}
                          isAdded={isMovieInLibrary(item)}
                          isAdding={isItemAdding(item)}
                          onAdd={(cand) => importMutation.mutate(cand)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sección: Top 10 en AR */}
        <div id="top-10-ar" className="scroll-mt-20 mt-14 border-t border-slate-200/40 pt-8">
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
        </div>

        {/* Sección: Sugerencias debajo del todo */}
        <div id="sugerencias-plataforma" className="scroll-mt-20 mt-14 border-t border-slate-200/40 pt-8 pb-10 space-y-3">
          <div className="space-y-3">
            <div className="text-center">
              <h2 className="font-bebas text-2xl uppercase text-ink sm:text-3xl">Sugerencias por plataforma</h2>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
              {SUGGESTION_PLATFORMS.map((p) => {
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
                No se pudieron cargar las sugerencias de {SUGGESTION_PLATFORMS.find((p) => p.id === activeSuggestionPlatform)?.name || 'la plataforma'}.
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
          onCollections={() => {}}
        />
      )}
    </main>
  );
};
