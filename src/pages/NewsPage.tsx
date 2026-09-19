import { useEffect, useMemo, useRef, useState } from 'react';
import { Header } from '@/components/Header';
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useNavigate } from 'react-router-dom';
import { resolvePlatformLogoUrl } from '@/components/PlatformLogos';
import { MovieDetailModal } from '@/components/MovieDetailModal';
import { Loader2, Film, Tv, ChevronLeft, ChevronRight } from 'lucide-react';
import type { JustWatchTop10Item, MovieItem, TmdbSuggestionCandidate } from '@/types/movie';

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

const Top10Item = ({
  item,
  rank,
  onSelect,
}: {
  item: TmdbSuggestionCandidate;
  rank: number;
  onSelect: (item: TmdbSuggestionCandidate) => void;
}) => {
  return (
    <article className="flex items-center gap-3 group/item">
      <div className="news-ranking-number relative flex shrink-0 items-center justify-center w-[52px] font-black text-[42px] tracking-tighter text-slate-400">
        {rank}
      </div>
      <button
        type="button"
        onClick={() => onSelect(item)}
        className="h-[84px] w-[58px] shrink-0 overflow-hidden rounded bg-mist relative text-left transition-transform group-hover/item:scale-105 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-coral"
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

export const NewsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
  }, [selectedCandidate, queries, justwatchTop10Query.data]);

  const activeIndex = useMemo(() => {
    if (!selectedCandidate || !allCandidatesInActivePlatform.length) return -1;
    return allCandidatesInActivePlatform.findIndex((c) => c.tmdbId === selectedCandidate.tmdbId);
  }, [selectedCandidate, allCandidatesInActivePlatform]);

  const handlePrevious = activeIndex > 0 ? () => setSelectedCandidate(allCandidatesInActivePlatform[activeIndex - 1]) : undefined;
  const handleNext = activeIndex >= 0 && activeIndex < allCandidatesInActivePlatform.length - 1 ? () => setSelectedCandidate(allCandidatesInActivePlatform[activeIndex + 1]) : undefined;

  const importMutation = useMutation({
    mutationFn: async (candidate: TmdbSuggestionCandidate) => {
      const data = candidateDetails.data || await api.imdb.import({ imdbId: candidate.imdbId, type: candidate.type });
      return api.movies.create({
        ...data,
        favorite: false,
        watched: false,
        watchlist: false,
        personalRating: null,
        collectionIds: [],
      });
    },
    onSuccess: (saved) => {
      queryClient.setQueryData<MovieItem[]>(['movies'], (current = []) =>
        current.some((m) => m.id === saved.id) ? current : [saved, ...current]
      );
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      queryClient.invalidateQueries({ queryKey: ['metadata'] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });

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

      {/* Barras de desplazamiento laterales en los extremos de la ventana (visibles solo en hover) */}
      <button
        type="button"
        onClick={scrollLeft}
        className={`news-scroll-panel fixed left-0 top-[72px] bottom-0 z-[35] flex w-8 sm:w-10 items-center justify-center rounded-r-md border-r border-y border-l-0 transition-opacity duration-300 ${canScrollLeft ? 'opacity-0 hover:opacity-100 cursor-pointer' : 'opacity-0 pointer-events-none'}`}
        title="Plataformas anteriores"
        aria-label="Plataformas anteriores"
      >
        <ChevronLeft className="h-6 w-6 sm:h-7 sm:w-7 drop-shadow-sm" />
      </button>

      <button
        type="button"
        onClick={scrollRight}
        className={`news-scroll-panel fixed right-0 top-[72px] bottom-0 z-[35] flex w-8 sm:w-10 items-center justify-center rounded-l-md border-l border-y border-r-0 transition-opacity duration-300 ${canScrollRight ? 'opacity-0 hover:opacity-100 cursor-pointer' : 'opacity-0 pointer-events-none'}`}
        title="Siguientes plataformas"
        aria-label="Siguientes plataformas"
      >
        <ChevronRight className="h-6 w-6 sm:h-7 sm:w-7 drop-shadow-sm" />
      </button>

      <section className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="font-bebas text-3xl font-normal text-ink uppercase flex items-center gap-2 mb-4">
          Novedades por plataforma
        </h1>

        {/* Barra superior pegajosa (Sticky header) con logos y títulos centrados */}
        <div className="news-sticky-header sticky top-[72px] z-30 bg-canvas/95 backdrop-blur-md pt-3 pb-3 border-b border-slate-200/50 -mx-4 px-4 sm:-mx-6 sm:px-6 shadow-sm">
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
        <div className="relative">
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
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sección: Top 10 en AR hoy (JustWatch) */}
        <div className="mt-14 border-t border-slate-200/40 pt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bebas text-2xl sm:text-3xl font-normal text-ink uppercase tracking-wide flex items-center gap-2">
              Top 10 en AR hoy
            </h2>
            <span className="text-xs text-slate-400 font-medium">JustWatch</span>
          </div>

          {justwatchTop10Query.isLoading ? (
            <div className="grid h-48 place-items-center">
              <Loader2 className="h-8 w-8 animate-spin text-aqua" />
            </div>
          ) : justwatchTop10Query.data?.length ? (
            <div className="flex gap-6 sm:gap-10 overflow-x-auto pb-6 pt-2 hide-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {justwatchTop10Query.data.map((item) => (
                <div
                  key={`jw-${item.rank}-${item.tmdbId}`}
                  onClick={() => setSelectedCandidate(item)}
                  className="relative flex items-end shrink-0 select-none group/jw cursor-pointer focus:outline-none"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedCandidate(item);
                    }
                  }}
                  title={`Ver características de ${item.title}`}
                  aria-label={`Ver características de ${item.title}`}
                >
                  {/* Número de ranking amplio y visible a la izquierda con sutil solapamiento */}
                  <span className="justwatch-rank-number font-sans font-black text-[130px] sm:text-[165px] leading-[0.8] tracking-tighter select-none -mr-2 sm:-mr-3 z-0 transition-transform group-hover/jw:scale-105 pointer-events-none">
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

                    {/* Badges inferiores derechos */}
                    <div className="absolute bottom-2 right-2 z-20 flex flex-col items-end gap-1 pointer-events-none">
                      {item.subBadge && (
                        <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-tight shadow">
                          {item.subBadge}
                        </span>
                      )}
                      <span className="bg-black/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-tight shadow">
                        {item.badge || (item.type === 'series' ? 'TV' : 'PELÍCULA')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 py-6">No se pudieron cargar los datos de JustWatch.</p>
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
