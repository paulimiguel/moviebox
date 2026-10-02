import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ExternalLink, Film, Loader2, Plus, Search, Star, Tv, X } from 'lucide-react';
import { api } from '@/services/api';
import { resolvePlatformLogoUrl } from '@/components/PlatformLogos';
import type { MovieItem, TitlePlatformResult } from '@/types/movie';

interface MoviePlatformSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MoviePlatformSearchModal = ({ isOpen, onClose }: MoviePlatformSearchModalProps) => {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [executedQuery, setExecutedQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  const libraryQuery = useQuery({ queryKey: ['movies'], queryFn: api.movies.getAll });
  const libraryMovies = (libraryQuery.data || []) as MovieItem[];

  const searchPlatformsQuery = useQuery({
    queryKey: ['search-platforms', executedQuery],
    queryFn: () => api.tmdb.searchPlatforms(executedQuery),
    enabled: Boolean(executedQuery.trim()),
    staleTime: 1000 * 60 * 10,
  });

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearchInput('');
      setExecutedQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = searchInput.trim();
    if (!q) return;
    setExecutedQuery(q);
  };

  const isMovieInLibrary = (item: TitlePlatformResult) => {
    const key = item.imdbId || `tmdb-${item.tmdbId}`;
    if (addedIds[key]) return true;
    return libraryMovies.some((m) => {
      if (item.imdbId && m.imdbId) return m.imdbId === item.imdbId;
      if (item.tmdbId && m.tmdbId) return m.tmdbId === item.tmdbId;
      const norm = (str?: string | null) => (str || '').trim().toLowerCase();
      const titleMatch = norm(m.originalTitle) === norm(item.title) || norm(m.spanishTitle) === norm(item.title);
      const yearMatch = !m.year || !item.year || m.year === item.year;
      return titleMatch && yearMatch;
    });
  };

  const importMutation = useMutation({
    mutationFn: async (item: TitlePlatformResult) => {
      let data = null;
      if (item.imdbId) {
        try {
          data = await api.imdb.import({ imdbId: item.imdbId, type: item.type });
        } catch {
          // fallback
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
        type: item.type,
        originalTitle: item.originalTitle || item.title,
        spanishTitle: item.title,
        year: item.year || null,
        synopsis: item.overview || 'Sin descripción disponible.',
        durationMinutes: null,
        seasons: null,
        totalEpisodes: null,
        watched: false,
        favorite: false,
        watchlist: false,
        instagramRecommendation: false,
        personalRating: null,
        imdbRating: item.rating || null,
        tmdbId: item.tmdbId || null,
        imdbId: item.imdbId || null,
        imdbUrl: item.imdbId ? `https://www.imdb.com/title/${item.imdbId}` : null,
        tmdbUrl: item.tmdbId ? `https://www.themoviedb.org/${item.type === 'movie' ? 'movie' : 'tv'}/${item.tmdbId}` : null,
        justwatchUrl: item.justwatchUrl || null,
        trailerUrl: null,
        tmdbCollectionId: null,
        tmdbCollectionName: null,
        images: item.posterUrl ? [{ url: item.posterUrl, isPrimary: true, order: 0 }] : [],
        genres: [],
        platforms: item.streamingPlatforms.map((p) => ({ name: p.name })),
        keywords: [],
        credits: [],
        countries: [],
        collectionIds: [],
      });
    },
    onSuccess: (saved, item) => {
      const key = item.imdbId || `tmdb-${item.tmdbId}`;
      setAddedIds((prev) => ({ ...prev, [key]: true, [saved.id]: true }));
      queryClient.setQueryData<MovieItem[]>(['movies'], (curr = []) =>
        curr.some((m) => m.id === saved.id) ? curr : [saved, ...curr]
      );
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      queryClient.invalidateQueries({ queryKey: ['metadata'] });
    },
  });

  if (!isOpen) return null;

  const results = searchPlatformsQuery.data || [];

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-ink/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="platform-search-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="movie-detail-modal flex max-h-[92vh] sm:min-h-[560px] md:min-h-[600px] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-canvas shadow-2xl border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <h2 id="platform-search-modal-title" className="font-bebas text-2xl sm:text-3xl uppercase tracking-wide text-ink truncate">
              Buscar título en plataforma
            </h2>
            <p className="truncate text-xs text-slate-500">
              Consultá en qué servicios de streaming está disponible una película o serie
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="icon-button border-0 shadow-none text-slate-400 hover:text-ink shrink-0 ml-2"
            title="Cerrar"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Modal body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="relative flex gap-2" autoComplete="off">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape' && searchInput) {
                    e.preventDefault();
                    setSearchInput('');
                  }
                }}
                placeholder="Escribí el título a buscar..."
                className="control w-full pl-10 pr-9 text-base leading-none py-2.5 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:appearance-none [&::-ms-clear]:hidden"
                autoFocus
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    inputRef.current?.focus();
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
              disabled={!searchInput.trim() || searchPlatformsQuery.isFetching}
              className="primary-button gap-2 px-5 shrink-0"
            >
              {searchPlatformsQuery.isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span>Buscar</span>
            </button>
          </form>
          {searchPlatformsQuery.isFetching ? (
            <div className="grid h-56 place-items-center">
              <div className="text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-aqua" />
                <p className="mt-3 text-sm font-medium text-slate-500">Buscando disponibilidad en plataformas...</p>
              </div>
            </div>
          ) : executedQuery && results.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <Film className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-3 text-base font-semibold text-ink">No se encontraron títulos</p>
              <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                No encontramos coincidencias para &ldquo;{executedQuery}&rdquo;. Probá con otro nombre o verificá la ortografía.
              </p>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Se encontraron {results.length} {results.length === 1 ? 'título' : 'títulos'} para &ldquo;{executedQuery}&rdquo;:
              </p>
              <div className="grid gap-3 sm:gap-4">
                {results.map((item) => {
                  const inLibrary = isMovieInLibrary(item);
                  const isAdding = importMutation.isPending && importMutation.variables?.tmdbId === item.tmdbId;

                  return (
                    <article
                      key={`title-platform-${item.type}-${item.tmdbId}`}
                      className="group flex flex-col sm:flex-row gap-3 sm:gap-4 rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm transition-all hover:shadow-md hover:border-slate-300"
                    >
                      {/* Poster */}
                      <div className="relative aspect-[2/3] w-20 sm:w-28 shrink-0 self-start overflow-hidden rounded-lg bg-mist shadow-inner mx-auto sm:mx-0">
                        {item.posterUrl ? (
                          <img src={item.posterUrl} alt={item.title} className="h-full w-full object-contain" />
                        ) : (
                          <div className="grid h-full place-items-center text-slate-300">
                            {item.type === 'movie' ? <Film className="h-8 w-8" /> : <Tv className="h-8 w-8" />}
                          </div>
                        )}
                        <span
                          className={`absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white shadow-sm ${
                            item.type === 'series' ? 'bg-aqua' : 'bg-coral'
                          }`}
                        >
                          {item.type === 'series' ? 'Serie' : 'Película'}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div>
                            <h3 className="font-bebas text-xl sm:text-2xl uppercase leading-tight text-ink group-hover:text-coral transition-colors">
                              {item.title}
                            </h3>
                            {item.originalTitle && item.originalTitle !== item.title && (
                              <p className="mt-0.5 text-sm font-medium text-slate-600 truncate" title={item.originalTitle}>
                                {item.originalTitle}
                              </p>
                            )}
                          </div>

                          <div className="mt-1.5 flex flex-wrap items-center gap-3">
                            <span className="text-base font-bold text-slate-500">{item.year || 'Año desconocido'}</span>
                            {item.rating != null && (
                              <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500">
                                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                                {item.rating.toFixed(1)}
                              </span>
                            )}
                          </div>

                          {item.genres && item.genres.length > 0 && (
                            <p className="mt-1 text-sm text-slate-500">
                              {item.genres.join(', ')}
                            </p>
                          )}

                          {item.overview && (
                            <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-600">
                              {item.overview}
                            </p>
                          )}
                        </div>

                        {/* Plataformas */}
                        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {item.streamingPlatforms.length > 0 ? (
                              <div>
                                <span className="field-label mb-1.5">Disponible en streaming:</span>
                                <div className="flex flex-wrap items-center gap-2">
                                  {item.streamingPlatforms.map((p) => {
                                    const logo = resolvePlatformLogoUrl({ name: p.name, logoPath: null }) || p.logoUrl;
                                    return (
                                      <div
                                        key={`platform-${item.tmdbId}-${p.id}`}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-sm"
                                        title={`${p.name}${p.accessType !== 'flatrate' ? ' (Gratis/Anuncios)' : ''}`}
                                      >
                                        {logo ? (
                                          <img src={logo} alt={p.name} className="h-4 w-4 rounded object-contain shrink-0" />
                                        ) : (
                                          <span className="grid h-4 w-4 place-items-center rounded bg-slate-800 text-[9px] font-bold text-white">
                                            {p.name.slice(0, 2)}
                                          </span>
                                        )}
                                        <span className="text-xs font-semibold text-ink truncate max-w-[120px]">{p.name}</span>
                                        {p.accessType !== 'flatrate' && (
                                          <span className="text-[9px] font-bold uppercase text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded">
                                            Gratis
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : item.buyRentPlatforms.length > 0 ? (
                              <div>
                                <span className="field-label mb-1.5 text-amber-600">Solo en alquiler / compra:</span>
                                <div className="flex flex-wrap items-center gap-2">
                                  {item.buyRentPlatforms.slice(0, 4).map((p) => {
                                    const logo = resolvePlatformLogoUrl({ name: p.name, logoPath: null }) || p.logoUrl;
                                    return (
                                      <div
                                        key={`buyrent-${item.tmdbId}-${p.id}`}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 opacity-80"
                                        title={p.name}
                                      >
                                        {logo && <img src={logo} alt={p.name} className="h-3.5 w-3.5 rounded object-contain" />}
                                        <span className="text-xs font-medium text-slate-600">{p.name}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span className="font-medium text-slate-500">No disponible en plataformas en Argentina.</span>
                                <a
                                  href={item.justwatchUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-coral hover:underline font-semibold"
                                >
                                  Consultar JustWatch <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            )}
                          </div>

                          {/* Action button */}
                          <div className="shrink-0 flex items-center gap-2">
                            {inLibrary ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2cbc63]">
                                <Check className="h-4 w-4" strokeWidth={2.5} />
                                En tu biblioteca
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={isAdding}
                                onClick={() => importMutation.mutate(item)}
                                className="primary-button text-xs h-8 px-3 gap-1.5"
                                title="Agregar a mi biblioteca"
                              >
                                {isAdding ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                                )}
                                <span>Agregar</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
              <Search className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-3 text-base font-semibold text-ink">Buscador de plataformas</p>
              <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                Ingresá el nombre de una película o serie para ver inmediatamente en qué servicios de streaming está disponible (Netflix, Disney+, Max, Prime Video, etc.).
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="flex h-16 shrink-0 items-center justify-end border-t border-slate-200 bg-white px-4 sm:px-6">
          <button type="button" onClick={onClose} className="secondary-button min-w-28">
            Cerrar
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
};

