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

const Top10Column = ({ platform, data, isLoading, onClick }: { platform: any; data: any; isLoading: boolean; onClick: () => void }) => {
  const top10 = useMemo(() => {
    if (!data) return [];
    const candidates = [...(data.movies || []), ...(data.series || [])];
    candidates.sort((a, b) => b.popularity - a.popularity);
    return candidates.slice(0, 10);
  }, [data]);

  const logoUrl = resolvePlatformLogoUrl(platform);

  return (
    <div className="w-[280px] shrink-0 snap-start flex flex-col">
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-3 mb-4 hover:opacity-80 transition-opacity text-left"
      >
        {logoUrl && <img src={logoUrl} alt={platform.name} className="h-11 w-auto rounded object-contain" />}
        <h3 className="font-bebas text-[28px] leading-none text-ink tracking-wide">{platform.name}</h3>
      </button>

      {isLoading ? (
        <div className="grid h-64 place-items-center">
          <Loader2 className="h-8 w-8 animate-spin text-aqua" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {top10.map((item, index) => (
            <Top10Item key={`${item.type}-${item.tmdbId}`} item={item} rank={index + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export const NewsPage = () => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
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
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 20);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 20);
  };

  useEffect(() => {
    const el = scrollRef.current;
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
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  return (
    <main className="news-page min-h-screen bg-canvas pb-20">
      <Header />
      <section className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="font-bebas text-3xl font-normal text-ink uppercase flex items-center gap-2">
          Novedades por plataforma
        </h1>

        <div className="relative mt-8 group">
          {canScrollLeft && (
            <button
              type="button"
              onClick={scrollLeft}
              className="news-scroll-panel absolute left-0 top-12 bottom-6 z-20 flex w-8 sm:w-9 items-center justify-center rounded-r-md border border-l-0 border-white/20 bg-slate-950/50 hover:bg-slate-950/80 text-white backdrop-blur-md transition-all shadow-lg cursor-pointer"
              title="Plataformas anteriores"
              aria-label="Plataformas anteriores"
            >
              <ChevronLeft className="h-6 w-6 text-white drop-shadow" />
            </button>
          )}

          <div
            ref={scrollRef}
            className="flex gap-8 overflow-x-auto pb-6 snap-x snap-mandatory hide-scrollbar relative"
          >
            {PLATFORMS.map((platform, index) => {
              const query = queries[index];
              return (
                <Top10Column
                  key={platform.id}
                  platform={platform}
                  data={query.data}
                  isLoading={query.isLoading}
                  onClick={() => navigate(`/novedades/${platform.id}`)}
                />
              );
            })}
          </div>

          {canScrollRight && (
            <button
              type="button"
              onClick={scrollRight}
              className="news-scroll-panel absolute right-0 top-12 bottom-6 z-20 flex w-8 sm:w-9 items-center justify-center rounded-l-md border border-r-0 border-white/20 bg-slate-950/50 hover:bg-slate-950/80 text-white backdrop-blur-md transition-all shadow-lg cursor-pointer"
              title="Siguientes plataformas"
              aria-label="Siguientes plataformas"
            >
              <ChevronRight className="h-6 w-6 text-white drop-shadow" />
            </button>
          )}
        </div>
      </section>
    </main>
  );
};
