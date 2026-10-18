import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bookmark, ChevronLeft, ChevronRight, Eye, Film, Heart, Library, Sparkles, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { MovieDetailModal } from '@/components/MovieDetailModal';
import { MovieEditModal } from '@/components/MovieEditModal';
import { PLATFORM_PREFERENCES } from '@/constants/platformPreferences';
import { useAuth } from '@/contexts/AuthContext';
import { api, resolveMovieImageUrl, type CinemaMovie } from '@/services/api';
import type { MovieItem, TmdbSuggestionCandidate } from '@/types/movie';
import './HomePage.css';

const localDayKey = () => {
  const today = new Date();
  return [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
};

const dailyIndex = (dayKey: string, platformId: string, length: number) => {
  const [year, month, day] = dayKey.split('-').map(Number);
  const dayNumber = Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
  let platformOffset = 0;
  for (const character of platformId) platformOffset = ((platformOffset << 5) - platformOffset + character.charCodeAt(0)) | 0;
  return ((dayNumber + platformOffset) % length + length) % length;
};

// Mezcla determinista: el mismo día y la misma semilla dan siempre el mismo orden.
const seededShuffle = <T,>(items: T[], seed: string): T[] => {
  let state = 0;
  for (const character of seed) state = (Math.imul(state, 31) + character.charCodeAt(0)) >>> 0;
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
};

const titleFor =(movie: MovieItem) => movie.spanishTitle || movie.originalTitle;

const imageFor = (movie: MovieItem) => {
  const image = movie.images.find((item) => item.isPrimary) || movie.images[0];
  return image ? resolveMovieImageUrl(image.url) : null;
};

const HorizontalRow = ({ children }: { children: React.ReactNode }) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const scroll = (direction: -1 | 1) => rowRef.current?.scrollBy({ left: direction * 720, behavior: 'smooth' });

  return (
    <div className="group/row relative">
      <button type="button" onClick={() => scroll(-1)} className="absolute -left-3 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/75 text-white shadow-lg transition hover:bg-coral sm:grid" aria-label="Ver anteriores">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div ref={rowRef} className="flex snap-x gap-3 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
      <button type="button" onClick={() => scroll(1)} className="absolute -right-3 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/75 text-white shadow-lg transition hover:bg-coral sm:grid" aria-label="Ver siguientes">
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
};

const CinemaHomeRow = () => {
  const query = useQuery({ queryKey: ['cinema', 'en-cartel'], queryFn: () => api.cinema.list('en-cartel'), staleTime: 30 * 60 * 1000, retry: 1 });
  const items: CinemaMovie[] = query.data?.items || [];
  if (query.isLoading) return <div className="h-56 animate-pulse rounded-lg bg-mist" />;
  if (!items.length) return <Link to="/cine" className="grid h-36 place-items-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-500">Ver estrenos en cine</Link>;
  return (
    <HorizontalRow>
      {items.slice(0, 20).map((movie) => (
        <Link key={movie.slug} to="/cine" className="block w-32 shrink-0 snap-start sm:w-36" title={movie.title}>
          <div className="aspect-[2/3] overflow-hidden rounded-lg bg-mist shadow-md ring-1 ring-black/5">
            {movie.posterUrl ? <img src={movie.posterUrl} alt={`Póster de ${movie.title}`} referrerPolicy="no-referrer" loading="lazy" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-aqua/50"><Film className="h-8 w-8" /></div>}
          </div>
          <h3 className="mt-2 line-clamp-2 font-bebas text-lg uppercase leading-tight text-ink">{movie.title}</h3>
          {movie.genres[0] && <p className="mt-0.5 truncate text-xs text-slate-500">{movie.genres[0]}</p>}
        </Link>
      ))}
    </HorizontalRow>
  );
};

const HomeSectionButton = ({ to, color, label = 'Mi biblioteca', icon: Icon = Library, wide = false }: { to: string; color: 'coral' | 'aqua'; label?: string; icon?: typeof Library; wide?: boolean }) => color === 'coral' ? (
  <Link to={to} className="home-hero-primary-button inline-flex h-9 w-40 items-center justify-center gap-2 overflow-hidden rounded-md bg-coral px-3 text-xs font-semibold uppercase text-white transition hover:brightness-110 sm:h-10 sm:w-48 sm:px-4 sm:text-sm">
    <Star className="relative z-10 h-4 w-4 fill-current" />
    <span className="relative z-10">Ver novedades</span>
  </Link>
) : (
  <Link to={to} className={`inline-flex h-9 items-center justify-center gap-2 rounded-md border border-aqua bg-aqua px-3 text-xs font-semibold uppercase text-white transition hover:brightness-110 sm:h-10 sm:px-4 sm:text-sm ${wide ? 'w-auto' : 'w-40 sm:w-48'}`}>
    <Icon className="h-4 w-4" />
    {label}
  </Link>
);

const SectionTitle = ({ title, subtitle, to, color, buttonLabel, buttonIcon }: { title: string; subtitle: string; to: string; color: 'coral' | 'aqua'; buttonLabel?: string; buttonIcon?: typeof Library }) => (
  <div className="mb-3 flex items-end justify-between gap-4">
    <div className={`border-l-4 pl-3 ${color === 'coral' ? 'border-coral' : 'border-aqua'}`}>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <Link to={to} className="transition-opacity hover:opacity-75">
          <h2 className="font-bebas text-3xl uppercase leading-none text-ink sm:text-4xl">{title}</h2>
        </Link>
        <p className="hidden text-sm text-slate-500 sm:block">{subtitle}</p>
      </div>
    </div>
    <div className="shrink-0"><HomeSectionButton to={to} color={color} label={buttonLabel} icon={buttonIcon} /></div>
  </div>
);

type HomeNewsItem = TmdbSuggestionCandidate & { platformNames: string[] };

const NewsCard = ({ item, onSelect }: { item: HomeNewsItem; onSelect: (item: HomeNewsItem) => void }) => (
  <button type="button" onClick={() => onSelect(item)} className="group/card w-[132px] shrink-0 snap-start text-left sm:w-[156px]" title={`Ver ficha: ${item.title}`}>
    <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-slate-200 bg-mist shadow-card transition group-hover/card:-translate-y-1 group-hover/card:border-coral">
      {item.posterUrl ? <img src={item.posterUrl} alt={item.title} className="h-full w-full object-cover" loading="lazy" /> : <div className="grid h-full place-items-center text-slate-400"><Film className="h-8 w-8" /></div>}
    </div>
    <h3 className="mt-2 line-clamp-1 font-bebas text-lg uppercase leading-tight text-ink transition-colors group-hover/card:text-coral">{item.title}</h3>
    <p className="mt-0.5 truncate text-xs text-slate-500">{item.type === 'series' ? 'Serie' : 'Película'}{item.year ? ` · ${item.year}` : ''}{item.genres?.[0] ? ` · ${item.genres[0]}` : ''}</p>
    <p className="mt-0.5 truncate text-[11px] font-medium text-aqua">{item.platformNames.join(' · ')}</p>
  </button>
);

const LibraryCard = ({ movie, onSelect }: { movie: MovieItem; onSelect: (movie: MovieItem) => void }) => {
  const image = imageFor(movie);
  return (
    <button type="button" onClick={() => onSelect(movie)} className="group/card w-[132px] shrink-0 snap-start text-left sm:w-[156px]" title={`Abrir ${titleFor(movie)}`}>
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-slate-200 bg-mist shadow-card transition group-hover/card:-translate-y-1 group-hover/card:border-aqua">
        {image ? <img src={image} alt={titleFor(movie)} className="h-full w-full object-cover" loading="lazy" /> : <div className="grid h-full place-items-center text-slate-400"><Film className="h-8 w-8" /></div>}
        <div className="absolute right-2 top-2 flex items-center gap-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
          {movie.watched && <Eye className="h-4 w-4 text-[#2cbc63]" strokeWidth={2.5} aria-label="Vista" />}
          {movie.favorite && <Heart className="h-4 w-4 fill-[#e53935] text-[#e53935]" aria-label="Favorita" />}
          {!movie.watched && movie.watchlist && <Bookmark className="h-4 w-4 fill-aqua text-aqua" aria-label="Pendiente" />}
        </div>
      </div>
      <h3 className="mt-2 line-clamp-1 font-bebas text-lg uppercase leading-tight text-ink transition-colors group-hover/card:text-aqua">{titleFor(movie)}</h3>
      <p className="mt-0.5 truncate text-xs text-slate-500">{movie.type === 'series' ? 'Serie' : 'Película'}{movie.year ? ` · ${movie.year}` : ''}{movie.genres[0] ? ` · ${movie.genres[0].name}` : ''}</p>
      <p className="mt-0.5 truncate text-[11px] font-medium text-aqua">{movie.platforms.length ? movie.platforms.map((platform) => platform.name).join(' · ') : 'Sin plataforma asociada'}</p>
    </button>
  );
};

export const HomePage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dayKey, setDayKey] = useState(localDayKey);
  const selectedPlatforms = useMemo(
    () => PLATFORM_PREFERENCES.filter((platform) => user?.preferredPlatforms.includes(platform.id)),
    [user?.preferredPlatforms],
  );
  const libraryQuery = useQuery({ queryKey: ['movies'], queryFn: api.movies.getAll });
  const platformQueries = useQueries({
    queries: selectedPlatforms.map((platform) => ({
      queryKey: ['newReleases', platform.id, dayKey],
      queryFn: () => api.tmdb.newReleases(platform.id),
      staleTime: 24 * 60 * 60 * 1000,
    })),
  });
  const [activeBanner, setActiveBanner] = useState(0);
  const [outgoingPoster, setOutgoingPoster] = useState<string | null>(null);
  const previousPoster = useRef<string | null>(null);
  const library = useMemo(() => [...(libraryQuery.data || [])].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)), [libraryQuery.data]);
  const newsByTitle = new Map<string, HomeNewsItem>();
  platformQueries.forEach((query, index) => {
    const data = query.data as { movies?: TmdbSuggestionCandidate[]; series?: TmdbSuggestionCandidate[] } | undefined;
    const pool = [...(data?.movies || []), ...(data?.series || [])]
      .filter((candidate) => candidate.posterUrl)
      .sort((left, right) => right.popularity - left.popularity)
      .slice(0, 24);
    seededShuffle(pool, `news-${dayKey}-${selectedPlatforms[index].id}`)
      .slice(0, 5)
      .forEach((candidate) => {
        const key = `${candidate.type}-${candidate.tmdbId}`;
        const current = newsByTitle.get(key);
        if (current) current.platformNames.push(selectedPlatforms[index].name);
        else newsByTitle.set(key, { ...candidate, platformNames: [selectedPlatforms[index].name] });
      });
  });
  const news = seededShuffle([...newsByTitle.values()], `news-mix-${dayKey}`).slice(0, 14);
  const dailyLibrary = useMemo(
    () => seededShuffle([...library].sort((left, right) => left.id.localeCompare(right.id)), `library-${dayKey}`).slice(0, 14),
    [library, dayKey],
  );
  const platformBanners = platformQueries.flatMap((query, index) => {
    const data = query.data as { movies?: TmdbSuggestionCandidate[]; series?: TmdbSuggestionCandidate[] } | undefined;
    const candidates = [...(data?.movies || []), ...(data?.series || [])]
      .filter((candidate) => candidate.posterUrl)
      .sort((left, right) => right.popularity - left.popularity)
      .slice(0, 12);
    const platform = selectedPlatforms[index];
    const item = platform && candidates.length ? candidates[dailyIndex(dayKey, platform.id, candidates.length)] : null;
    return item && platform ? [{ ...item, platform }] : [];
  });
  const banner = platformBanners[activeBanner] || platformBanners[0];
  const bannerKey = banner ? `${banner.platform.id}-${banner.tmdbId}` : 'moviebox';
  const [editingMovie, setEditingMovie] = useState<MovieItem | null>(null);
  const [modalTarget, setModalTarget] = useState<{ candidate: TmdbSuggestionCandidate; platformNames: string[] } | { libraryId: string } | null>(null);
  const modalCandidate = modalTarget && 'candidate' in modalTarget ? modalTarget.candidate : null;
  const modalPlatformNames = modalTarget && 'candidate' in modalTarget ? modalTarget.platformNames : [];
  const modalLibraryMovie = modalTarget
    ? ('libraryId' in modalTarget
      ? library.find((movie) => movie.id === modalTarget.libraryId)
      : library.find((movie) => (modalTarget.candidate.tmdbId && movie.tmdbId === modalTarget.candidate.tmdbId) || (modalTarget.candidate.imdbId && movie.imdbId === modalTarget.candidate.imdbId))) || null
    : null;
  const modalDetails = useQuery({
    queryKey: ['candidateDetails', modalCandidate?.imdbId],
    queryFn: () => api.imdb.import({ imdbId: modalCandidate!.imdbId, type: modalCandidate!.type }),
    enabled: Boolean(modalCandidate?.imdbId && !modalLibraryMovie),
    staleTime: 1000 * 60 * 30,
  });
  const modalMovie: MovieItem | null = useMemo(() => {
    if (modalLibraryMovie) return modalLibraryMovie;
    if (!modalCandidate) return null;
    const details = modalDetails.data;
    const now = new Date().toISOString();
    return {
      id: `preview-${modalCandidate.tmdbId}`,
      userId: 'preview',
      type: modalCandidate.type,
      originalTitle: details?.originalTitle || modalCandidate.title,
      spanishTitle: details?.spanishTitle || modalCandidate.title,
      year: details?.year || modalCandidate.year || null,
      synopsis: details?.synopsis || modalCandidate.overview || 'Sin descripción disponible.',
      durationMinutes: details?.durationMinutes ?? null,
      seasons: details?.seasons ?? null,
      totalEpisodes: details?.totalEpisodes ?? null,
      watched: false,
      favorite: false,
      watchlist: false,
      instagramRecommendation: false,
      personalRating: null,
      imdbRating: details?.imdbRating ?? null,
      tmdbId: modalCandidate.tmdbId || null,
      imdbId: modalCandidate.imdbId || null,
      imdbUrl: modalCandidate.imdbId ? `https://www.imdb.com/title/${modalCandidate.imdbId}` : null,
      tmdbUrl: modalCandidate.tmdbId ? `https://www.themoviedb.org/${modalCandidate.type === 'movie' ? 'movie' : 'tv'}/${modalCandidate.tmdbId}` : null,
      justwatchUrl: details?.justwatchUrl || null,
      trailerUrl: details?.trailerUrl || null,
      tmdbCollectionId: details?.tmdbCollectionId ?? null,
      tmdbCollectionName: details?.tmdbCollectionName ?? null,
      tmdbImportedAt: null,
      tmdbLastSyncedAt: null,
      createdAt: now,
      updatedAt: now,
      images: details?.images?.length
        ? details.images.map((img, i) => ({ id: String(i), url: img.url, localPath: null, tmdbFilePath: null, order: i, isPrimary: i === 0, altText: null }))
        : modalCandidate.posterUrl
          ? [{ id: '1', url: modalCandidate.posterUrl, localPath: null, tmdbFilePath: null, order: 0, isPrimary: true, altText: null }]
          : [],
      genres: (details?.genres || (modalCandidate.genres || []).map((name) => ({ name }))).map((genre, i) => ({
        id: String(i),
        name: genre.name,
        normalizedName: genre.name.toLowerCase(),
        tmdbGenreId: null,
        tmdbMediaType: modalCandidate.type,
        imagePath: null,
        order: i,
      })),
      platforms: details?.platforms?.length
        ? details.platforms.map((platform, index) => ({
          id: `preview-platform-${platform.tmdbProviderId || index}`,
          name: platform.name,
          tmdbProviderId: platform.tmdbProviderId ?? null,
          logoPath: platform.logoPath ?? null,
          isPrimary: platform.isPrimary ?? index === 0,
          order: platform.order ?? index,
        }))
        : modalPlatformNames.map((name, order) => ({ id: `preview-platform-${name}`, name, tmdbProviderId: null, logoPath: null, isPrimary: order === 0, order })),
      keywords: [],
      credits: (details?.credits || []).map((credit, i) => ({
        id: String(i),
        name: credit.name,
        creditType: credit.creditType,
        order: credit.order ?? i,
        characterName: credit.characterName ?? null,
        tmdbPersonId: credit.tmdbPersonId ?? null,
        profilePath: credit.profilePath ?? null,
        tmdbCreditId: null,
      })),
      countries: (details?.countries || []).map((country, i) => ({
        id: String(i),
        name: typeof country === 'string' ? country : country.name,
        normalizedName: (typeof country === 'string' ? country : country.name).toLowerCase(),
        isoCode: typeof country === 'string' ? null : country.isoCode ?? null,
        order: i,
      })),
      collections: [],
    };
  }, [modalCandidate, modalPlatformNames, modalLibraryMovie, modalDetails.data]);
  const refreshLibrary = () => {
    queryClient.invalidateQueries({ queryKey: ['movies'] });
    queryClient.invalidateQueries({ queryKey: ['metadata'] });
    queryClient.invalidateQueries({ queryKey: ['collections'] });
  };
  const addModalMutation = useMutation({
    mutationFn: async (candidate: TmdbSuggestionCandidate) => {
      const imported = modalDetails.data && modalDetails.data.imdbId === candidate.imdbId
        ? modalDetails.data
        : await api.imdb.import({ imdbId: candidate.imdbId, type: candidate.type });
      return api.movies.create({ ...imported, favorite: false, watched: false, watchlist: false, personalRating: null, collectionIds: [] });
    },
    onSuccess: (saved) => {
      queryClient.setQueryData<MovieItem[]>(['movies'], (current = []) => current.some((movie) => movie.id === saved.id) ? current : [saved, ...current]);
      refreshLibrary();
    },
  });
  const updatePersonal = useMutation({
    mutationFn: ({ movie, field }: { movie: MovieItem; field: 'favorite' | 'watched' | 'watchlist' }) => api.movies.updatePersonal(movie.id, { [field]: !movie[field] }),
    onSuccess: (updated) => {
      queryClient.setQueryData<MovieItem[]>(['movies'], (current = []) => current.map((item) => (item.id === updated.id ? updated : item)));
      refreshLibrary();
    },
  });
  const updateRating = useMutation({
    mutationFn: ({ movie, rating }: { movie: MovieItem; rating: number | null }) => api.movies.updatePersonal(movie.id, { personalRating: rating }),
    onSuccess: (updated) => {
      queryClient.setQueryData<MovieItem[]>(['movies'], (current = []) => current.map((item) => (item.id === updated.id ? updated : item)));
      refreshLibrary();
    },
  });

  useEffect(() => {
    const now = new Date();
    const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timer = window.setTimeout(() => setDayKey(localDayKey()), nextDay.getTime() - now.getTime() + 1000);
    return () => window.clearTimeout(timer);
  }, [dayKey]);

  useEffect(() => {
    const nextPoster = banner?.posterUrl || '/login-posters/the-matrix.jpg';
    if (previousPoster.current && previousPoster.current !== nextPoster) setOutgoingPoster(previousPoster.current);
    previousPoster.current = nextPoster;
    const timer = window.setTimeout(() => setOutgoingPoster(null), 900);
    return () => window.clearTimeout(timer);
  }, [banner?.posterUrl]);

  useEffect(() => {
    if (activeBanner >= platformBanners.length) setActiveBanner(0);
  }, [activeBanner, platformBanners.length]);

  useEffect(() => {
    if (platformBanners.length < 2 || modalTarget) return undefined;
    const timer = window.setInterval(() => setActiveBanner((current) => (current + 1) % platformBanners.length), 7000);
    return () => window.clearInterval(timer);
  }, [platformBanners.length, modalTarget]);

  const openBannerModal = () => banner && setModalTarget({ candidate: banner, platformNames: [banner.platform.name] });

  const changeBanner = (direction: -1 | 1) => {
    if (!platformBanners.length) return;
    setActiveBanner((current) => (current + direction + platformBanners.length) % platformBanners.length);
  };

  return (
    <main className="min-h-screen bg-canvas pb-12 text-ink">
      <Header />
      <section className="home-hero relative isolate h-[330px] overflow-hidden border-b border-slate-200 sm:h-[410px] lg:h-[470px]">
        {outgoingPoster && <img src={outgoingPoster} alt="" className="home-hero-outgoing-backdrop absolute inset-0 h-full w-full scale-110 object-cover object-center blur-xl" />}
        <img key={`backdrop-${bannerKey}`} src={banner?.posterUrl || '/login-posters/the-matrix.jpg'} alt="" className="home-hero-backdrop absolute inset-0 h-full w-full object-cover object-center blur-xl" />
        <div className="home-hero-side-overlay absolute inset-0" />
        <div className="home-hero-bottom-overlay absolute inset-0" />
        <div className="relative mx-auto flex h-full max-w-[1500px] items-center gap-4 px-4 sm:gap-8 sm:px-12 lg:gap-12">
          <div key={`poster-${bannerKey}`} className="home-hero-poster relative h-full aspect-[2/3] shrink-0 overflow-hidden border-x shadow-2xl">
            <img src={banner?.posterUrl || '/login-posters/the-matrix.jpg'} alt={banner?.title || ''} className="h-full w-full object-contain" />
            {banner && <button type="button" onClick={() => openBannerModal()} className="absolute inset-0 z-10 cursor-pointer" aria-label={`Ver ficha de ${banner.title}`} title="Ver ficha" />}
          </div>
          <div key={`copy-${bannerKey}`} className="home-hero-copy min-w-0 max-w-3xl flex-1">
            <span className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-aqua"><Sparkles className="h-4 w-4" /> {banner ? `Novedad en ${banner.platform.name}` : 'Novedades de tus plataformas'}</span>
            <h1 className="font-bebas text-4xl uppercase leading-[0.92] tracking-wide sm:text-6xl lg:text-7xl">
              {banner ? <button type="button" onClick={() => openBannerModal()} className="text-left uppercase transition-opacity hover:opacity-80" title="Ver ficha">{banner.title}</button> : 'MovieBox'}
            </h1>
            {banner && <div className="home-hero-muted mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs sm:mt-4 sm:text-sm">
              {banner.year && <span>{banner.year}</span>}
              <span>{banner.type === 'series' ? 'Serie' : 'Película'}</span>
              {banner.rating != null && banner.rating > 0 && <span>★ {banner.rating.toFixed(1)}</span>}
              {banner.genres.slice(0, 3).map((genre) => <span key={genre}>{genre}</span>)}
            </div>}
            <p className="home-hero-muted mt-3 hidden max-w-xl text-xs leading-relaxed sm:line-clamp-3 sm:block sm:text-base">{banner?.overview || 'Descubrí los últimos estrenos disponibles en tus plataformas.'}</p>
            <div className="mt-4 hidden w-full flex-wrap justify-start gap-2 sm:mt-6 sm:flex sm:gap-3">
              <HomeSectionButton to="/biblioteca" color="aqua" />
              <HomeSectionButton to="/novedades" color="coral" />
              <HomeSectionButton to="/cine" color="aqua" label="Estrenos en cine" icon={Film} />
            </div>
          </div>
        </div>
        {platformBanners.length > 1 && <>
          <button type="button" onClick={() => changeBanner(-1)} className="home-hero-arrow absolute left-3 top-1/2 z-20 grid h-7 w-7 -translate-y-1/2 place-items-center transition hover:scale-125" aria-label="Novedad anterior"><ChevronLeft className="h-5 w-5" strokeWidth={3} /></button>
          <button type="button" onClick={() => changeBanner(1)} className="home-hero-arrow absolute right-3 top-1/2 z-20 grid h-7 w-7 -translate-y-1/2 place-items-center transition hover:scale-125" aria-label="Novedad siguiente"><ChevronRight className="h-5 w-5" strokeWidth={3} /></button>
          <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            {platformBanners.map((item, index) => <button key={item.platform.id} type="button" onClick={() => setActiveBanner(index)} className={`h-2 rounded-full transition-all ${index === activeBanner ? 'w-7 bg-coral' : 'w-2 bg-white/55 hover:bg-white'}`} aria-label={`Mostrar novedad de ${item.platform.name}`} />)}
          </div>
        </>}
      </section>

      <div className="mx-auto max-w-[1500px] space-y-9 px-4 pt-7 sm:px-6 sm:pt-9">
        <section>
          <SectionTitle title="Mi biblioteca" subtitle="Tus películas y series, en un solo lugar." to="/biblioteca" color="aqua" />
          {libraryQuery.isLoading ? <div className="h-56 animate-pulse rounded-lg bg-mist" /> : library.length ? <HorizontalRow>{dailyLibrary.map((movie) => <LibraryCard key={movie.id} movie={movie} onSelect={(selected) => setModalTarget({ libraryId: selected.id })} />)}</HorizontalRow> : <Link to="/biblioteca" className="grid h-36 place-items-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-500">Tu biblioteca todavía está vacía</Link>}
        </section>
        <section>
          <SectionTitle title="Novedades" subtitle="Los últimos estrenos, series y películas que no te podés perder." to="/novedades" color="coral" />
          {platformQueries.some((query) => query.isLoading) && !news.length ? <div className="h-56 animate-pulse rounded-lg bg-mist" /> : news.length ? <HorizontalRow>{news.map((item) => <NewsCard key={`${item.type}-${item.tmdbId}`} item={item} onSelect={(selected) => setModalTarget({ candidate: selected, platformNames: selected.platformNames })} />)}</HorizontalRow> : <Link to="/novedades" className="grid h-36 place-items-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-500">Explorar novedades</Link>}
        </section>
        <section>
          <SectionTitle title="Estrenos en cine" subtitle="La cartelera actual de los cines." to="/cine" color="aqua" buttonLabel="Ver estrenos" buttonIcon={Film} />
          <CinemaHomeRow />
        </section>
      </div>
      {modalTarget && modalMovie && (
        <MovieDetailModal
          movie={modalMovie}
          showNavigation={false}
          onClose={() => setModalTarget(null)}
          onAdd={!modalLibraryMovie && modalCandidate ? () => addModalMutation.mutate(modalCandidate) : undefined}
          onEdit={modalLibraryMovie ? (movie) => { setModalTarget(null); setEditingMovie(movie); } : undefined}
          onPersonal={(movie, field) => updatePersonal.mutate({ movie, field })}
          onRating={(movie, rating) => updateRating.mutate({ movie, rating })}
        />
      )}
      {editingMovie && <MovieEditModal key={editingMovie.id} movie={editingMovie} onClose={() => setEditingMovie(null)} onSaved={() => { refreshLibrary(); setEditingMovie(null); }} />}
    </main>
  );
};
