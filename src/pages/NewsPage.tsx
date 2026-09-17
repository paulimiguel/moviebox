import { useEffect, useMemo, useRef, useState } from 'react';
import { Header } from '@/components/Header';
import { useQueries } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useNavigate } from 'react-router-dom';
import { resolvePlatformLogoUrl } from '@/components/PlatformLogos';
import { Loader2, Film, Tv, ChevronLeft, ChevronRight } from 'lucide-react';
import type { TmdbSuggestionCandidate } from '@/types/movie';

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

const Top10Item = ({ item, rank }: { item: TmdbSuggestionCandidate; rank: number }) => {
  return (
    <article className="flex items-center gap-3">
      <div className="news-ranking-number relative flex shrink-0 items-center justify-center w-[52px] font-black text-[42px] tracking-tighter text-slate-400">
        {rank}
      </div>
      <div className="h-[84px] w-[58px] shrink-0 overflow-hidden rounded bg-mist relative">
        {item.posterUrl ? (
          <img src={item.posterUrl} alt={item.title} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-aqua/50">
            {item.type === 'movie' ? <Film className="h-5 w-5" /> : <Tv className="h-5 w-5" />}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-bebas text-xl uppercase leading-5 text-ink line-clamp-2">{item.title}</h4>
        <p className="truncate text-xs text-slate-500 mt-0.5">{item.year || ''}</p>
      </div>
    </article>
  );
};

export const NewsPage = () => {
  const navigate = useNavigate();
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const queries = useQueries({
    queries: PLATFORMS.map((platform) => ({
      queryKey: ['newReleases', platform.id],
      queryFn: () => api.tmdb.newReleases(platform.id),
      staleTime: 1000 * 60 * 5,
    })),
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
    <main className="news-page min-h-screen bg-canvas pb-20">
      <Header />
      <section className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="font-bebas text-3xl font-normal text-ink uppercase flex items-center gap-2 mb-4">
          Novedades por plataforma
        </h1>

        {/* Barra superior pegajosa (Sticky header) con logos y títulos centrados en cada columna */}
        <div className="news-sticky-header sticky top-[72px] z-30 bg-canvas/95 backdrop-blur-md pt-3 pb-3 border-b border-slate-200/50 -mx-4 px-4 sm:-mx-6 sm:px-6 shadow-sm">
          <div
            ref={headerScrollRef}
            className="flex gap-6 overflow-x-hidden hide-scrollbar"
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
        <div className="relative group">
          <button
            type="button"
            onClick={scrollLeft}
            className={`news-scroll-panel absolute left-0 top-6 bottom-8 z-20 flex w-8 sm:w-9 items-center justify-center rounded-r-md border border-l-0 border-white/20 bg-slate-950/50 hover:bg-slate-950/80 text-white backdrop-blur-md shadow-lg transition-all duration-300 ${canScrollLeft ? 'opacity-100 cursor-pointer' : 'opacity-0 pointer-events-none'}`}
            title="Plataformas anteriores"
            aria-label="Plataformas anteriores"
          >
            <ChevronLeft className="h-6 w-6 text-white drop-shadow" />
          </button>

          <div
            ref={contentScrollRef}
            className="flex gap-6 overflow-x-auto pt-6 pb-8 snap-x snap-mandatory hide-scrollbar relative"
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
                        <Top10Item key={`${item.type}-${item.tmdbId}`} item={item} rank={itemIndex + 1} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={scrollRight}
            className={`news-scroll-panel absolute right-0 top-6 bottom-8 z-20 flex w-8 sm:w-9 items-center justify-center rounded-l-md border border-r-0 border-white/20 bg-slate-950/50 hover:bg-slate-950/80 text-white backdrop-blur-md shadow-lg transition-all duration-300 ${canScrollRight ? 'opacity-100 cursor-pointer' : 'opacity-0 pointer-events-none'}`}
            title="Siguientes plataformas"
            aria-label="Siguientes plataformas"
          >
            <ChevronRight className="h-6 w-6 text-white drop-shadow" />
          </button>
        </div>
      </section>
    </main>
  );
};
