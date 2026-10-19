import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ArrowLeft, ArrowRight, Bookmark, ExternalLink, Eye, Film, Heart, Pencil, Play, Star, ThumbsDown, ThumbsUp, Trash2, X, Plus } from 'lucide-react';
import { PlatformLogos } from '@/components/PlatformLogos';
import { CastPhotosModal } from '@/components/CastPhotosModal';
import { StarRating } from '@/components/StarRating';
import { TrailerModal } from '@/components/TrailerModal';
import { resolveMovieImageUrl } from '@/services/api';
import { MAX_PRINCIPAL_CAST, type MovieItem } from '@/types/movie';

const DETAIL_CAST_LIMIT = 6;

const normalizePlatformName = (name: string) => name
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('es')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const getWatchNowDestination = (movie: MovieItem) => {
  const searchTitle = [movie.spanishTitle || movie.originalTitle, movie.year].filter(Boolean).join(' ');
  const query = encodeURIComponent(searchTitle);
  const platformNames = movie.platforms.map((platform) => normalizePlatformName(platform.name));
  const hasPlatform = (matcher: (name: string) => boolean) => platformNames.some(matcher);

  if (hasPlatform((name) => name === 'netflix')) {
    return { label: 'Netflix', url: `https://www.netflix.com/search?q=${query}` };
  }
  if (hasPlatform((name) => name.includes('amazon prime') || name.includes('prime video'))) {
    return { label: 'Amazon Prime', url: `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${query}` };
  }
  if (hasPlatform((name) => name.includes('disney'))) {
    return { label: 'Disney+', url: `https://www.disneyplus.com/search?q=${query}` };
  }
  if (hasPlatform((name) => name.includes('hbo') || name === 'max')) {
    return { label: 'HBO Max', url: `https://play.hbomax.com/search?q=${query}` };
  }
  if (hasPlatform((name) => name.includes('apple tv'))) {
    return { label: 'Apple TV', url: `https://tv.apple.com/ar/search?term=${query}` };
  }
  if (hasPlatform((name) => name === 'flow' || name.includes('flow'))) {
    return { label: 'Flow', url: `https://web.app.flow.com.ar/search?q=${query}` };
  }
  if (hasPlatform((name) => name.includes('paramount'))) {
    return { label: 'Paramount+', url: `https://www.paramountplus.com/ar/search/?q=${query}` };
  }
  if (hasPlatform((name) => name.includes('stremio'))) {
    return { label: 'Stremio', url: `https://web.stremio.com/#/search?search=${query}` };
  }

  return {
    label: 'JustWatch',
    url: movie.justwatchUrl || `https://www.justwatch.com/ar/buscar?q=${query}`,
  };
};

export const MovieDetailModal = ({ movie, onClose, onEdit, onDelete, onPersonal, onRating, onPrevious, onNext, onAdd, showNavigation = true, hideWatchNow = false, hidePlatforms = false, overlayClassName = 'z-50' }: {
  movie: MovieItem;
  onClose: () => void;
  onEdit?: (movie: MovieItem) => void;
  onDelete?: (movie: MovieItem) => void;
  onPersonal: (movie: MovieItem, field: 'favorite' | 'watched' | 'watchlist' | 'thumbsUp' | 'thumbsDown') => void;
  onRating: (movie: MovieItem, rating: number | null) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onAdd?: (movie: MovieItem) => void;
  showNavigation?: boolean;
  hideWatchNow?: boolean;
  hidePlatforms?: boolean;
  overlayClassName?: string;
}) => {
  // Avisa que la ficha ya está abierta: en mobile y tablet el pochoclo de carga se oculta desde ese momento.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('moviebox:movie-modal', { detail: true }));
    return () => { window.dispatchEvent(new CustomEvent('moviebox:movie-modal', { detail: false })); };
  }, []);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [castPhotosOpen, setCastPhotosOpen] = useState(false);
  const [modalOffset, setModalOffset] = useState({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    left: number;
    top: number;
    width: number;
  } | null>(null);
  const title = movie.originalTitle;
  const spanishTitle = movie.spanishTitle && movie.spanishTitle !== movie.originalTitle ? movie.spanishTitle : null;
  const image = movie.images.find((item) => item.isPrimary) || movie.images[0];
  const cast = movie.credits
    .filter((item) => item.creditType === 'cast')
    .sort((left, right) => left.order - right.order)
    .slice(0, MAX_PRINCIPAL_CAST);
  const visibleCast = cast.slice(0, DETAIL_CAST_LIMIT);
  const watchNowDestination = getWatchNowDestination(movie);
  const tmdbUrl = movie.tmdbUrl || (movie.tmdbId ? `https://www.themoviedb.org/${movie.type === 'movie' ? 'movie' : 'tv'}/${movie.tmdbId}` : null);
  const justWatchUrl = movie.justwatchUrl || `https://www.justwatch.com/ar/buscar?q=${encodeURIComponent([spanishTitle || title, movie.year].filter(Boolean).join(' '))}`;
  const links = [
    { label: 'IMDb', url: movie.imdbUrl },
    { label: 'TMDB', url: tmdbUrl },
    { label: 'JustWatch', url: justWatchUrl },
  ].filter((item) => item.url);
  const startDragging = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0 || window.innerWidth < 640 || (event.target as HTMLElement).closest('button, a, input')) return;
    const bounds = modalRef.current?.getBoundingClientRect();
    if (!bounds) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: modalOffset.x,
      originY: modalOffset.y,
      left: bounds.left,
      top: bounds.top,
      width: bounds.width,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const dragModal = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = Math.min(
      window.innerWidth - 80 - drag.left,
      Math.max(80 - drag.left - drag.width, event.clientX - drag.startX),
    );
    const deltaY = Math.min(
      window.innerHeight - 48 - drag.top,
      Math.max(-drag.top, event.clientY - drag.startY),
    );
    setModalOffset({ x: drag.originX + deltaX, y: drag.originY + deltaY });
  };
  const stopDragging = (event: ReactPointerEvent<HTMLElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const ratingField = !onAdd ? (
    <div className="mt-2 min-w-0 lg:mt-0">
      <span className="field-label">Mi puntuación</span>
      <div className="moviebox-translucent-action flex h-10 items-center rounded-md border border-slate-200 bg-white px-2">
        <StarRating compact value={movie.personalRating} onChange={(rating) => onRating(movie, rating)} />
      </div>
    </div>
  ) : null;

  return (<>
    <div className={`fixed inset-0 ${overlayClassName} flex items-end justify-center bg-ink/55 sm:items-center sm:p-5`} role="dialog" aria-modal="true" aria-labelledby="movie-detail-title">
      <div ref={modalRef} className="movie-detail-modal flex flex-col max-h-[85vh] sm:max-h-[92vh] sm:min-h-[560px] md:min-h-[600px] w-full overflow-hidden rounded-t-md bg-canvas shadow-xl sm:max-w-5xl sm:rounded-md lg:max-w-6xl" style={{ transform: `translate3d(${modalOffset.x}px, ${modalOffset.y}px, 0)` }}>
        <header onPointerDown={startDragging} onPointerMove={dragModal} onPointerUp={stopDragging} onPointerCancel={stopDragging} className="flex min-h-16 shrink-0 touch-none select-none items-center gap-4 border-b border-slate-200 bg-white px-4 py-3 sm:cursor-move sm:px-6">
          <div className="min-w-0 flex-1">
            <h2 id="movie-detail-title" className="font-bebas truncate text-[24px] font-normal uppercase leading-7 text-ink text-left">{title}</h2>
          </div>
          <div className="ml-auto flex shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white shadow-card">
            {onAdd && (
              <button
                type="button"
                onClick={() => onAdd(movie)}
                className="movie-detail-add-button icon-button rounded-none border-0 shadow-none"
                title="Agregar a la biblioteca"
                aria-label="Agregar a la biblioteca"
              >
                <Plus className="h-5 w-5" strokeWidth={2} />
              </button>
            )}
            {onEdit && <button type="button" onClick={() => onEdit(movie)} className="icon-button rounded-none border-0 shadow-none" title="Editar" aria-label="Editar"><Pencil className="h-4 w-4" /></button>}
            {onDelete && <button type="button" onClick={() => onDelete(movie)} className="icon-button rounded-none border-0 border-l border-slate-200 text-red-600 shadow-none" title="Eliminar" aria-label="Eliminar"><Trash2 className="h-4 w-4" /></button>}
            {showNavigation && <button type="button" onClick={onPrevious} disabled={!onPrevious} className="icon-button rounded-none border-0 border-l border-slate-200 shadow-none" title="Título anterior" aria-label="Título anterior"><ArrowLeft className="h-5 w-5" /></button>}
            {showNavigation && <button type="button" onClick={onNext} disabled={!onNext} className="icon-button rounded-none border-0 border-l border-slate-200 shadow-none" title="Título siguiente" aria-label="Título siguiente"><ArrowRight className="h-5 w-5" /></button>}
            <button type="button" onClick={onClose} className="icon-button rounded-none border-0 border-l border-slate-200 shadow-none" title="Cerrar" aria-label="Cerrar"><X className="h-5 w-5" /></button>
          </div>
        </header>

        <div className="max-h-[calc(85vh-64px)] sm:max-h-[calc(92vh-64px)] flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid gap-6 md:grid-cols-[250px_minmax(0,1fr)]">
            <div className="mx-auto w-full max-w-[250px]">
              <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-mist">
                {image ? <img src={resolveMovieImageUrl(image.url)} alt={title} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><Film className="h-16 w-16 text-aqua" /></div>}
                <span className={`absolute left-2 top-2 rounded px-2 py-1 text-[10px] font-semibold uppercase text-white shadow-sm ${movie.type === 'series' ? 'bg-aqua' : 'bg-coral'}`}>{movie.type === 'movie' ? 'Película' : 'Serie'}</span>
              </div>
              {onAdd ? (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => onAdd(movie)}
                    className="primary-button flex w-full items-center justify-center gap-2 py-2.5 text-sm font-semibold"
                  >
                    <Plus className="h-4 w-4" />
                    Agregar a la biblioteca
                  </button>
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" aria-pressed={movie.watched} onClick={() => onPersonal(movie, 'watched')} className={`movie-detail-watched moviebox-translucent-action secondary-button h-9 min-w-0 gap-2 px-2 text-xs uppercase ${movie.watched ? 'border-[#2cbc63] bg-[#2cbc63]/10 text-[#218f4c]' : ''}`}><Eye className="h-[18px] w-[18px]" />Vista</button>
                <button type="button" aria-pressed={movie.favorite} onClick={() => onPersonal(movie, 'favorite')} className={`movie-detail-favorite moviebox-translucent-action secondary-button h-9 min-w-0 gap-2 px-2 text-xs uppercase ${movie.favorite ? 'border-coral bg-red-50 text-coral' : ''}`}><Heart className={`h-4 w-4 ${movie.favorite ? 'fill-current' : ''}`} />Me encanta</button>
                <button type="button" aria-pressed={movie.watchlist} onClick={() => onPersonal(movie, 'watchlist')} className={`movie-detail-watchlist moviebox-translucent-action secondary-button h-10 min-w-0 gap-1.5 px-1.5 py-1 text-[11px] uppercase ${movie.watchlist ? 'border-aqua bg-mist text-aqua' : ''}`}><Bookmark className={`h-3.5 w-3.5 ${movie.watchlist ? 'fill-current' : ''}`} />Watchlist</button>
                <div className="grid h-10 min-w-0 grid-cols-2 gap-2">
                  <button type="button" aria-pressed={movie.thumbsUp} onClick={() => onPersonal(movie, 'thumbsUp')} title="Me gusta" aria-label="Me gusta" className={`movie-detail-thumbs-up moviebox-translucent-action secondary-button h-10 min-w-0 px-1.5 ${movie.thumbsUp ? 'border-[#3b82f6] bg-mist text-[#3b82f6]' : ''}`}><ThumbsUp className="h-[18px] w-[18px]" /></button>
                  <button type="button" aria-pressed={movie.thumbsDown} onClick={() => onPersonal(movie, 'thumbsDown')} title="No me gusta" aria-label="No me gusta" className={`movie-detail-thumbs-down moviebox-translucent-action secondary-button h-10 min-w-0 px-1.5 ${movie.thumbsDown ? 'border-[#3b82f6] bg-mist text-[#3b82f6]' : ''}`}><ThumbsDown className="h-[18px] w-[18px]" /></button>
                </div>
              </div>
            )}
            </div>
            <section className="min-w-0">
              <h1 className="font-bebas text-[28px] font-normal uppercase leading-8 text-ink">{title}</h1>
              {spanishTitle && <p className="mt-0.5 text-sm font-medium text-slate-600">{spanishTitle}</p>}
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-base font-bold text-slate-500">{movie.year || 'Año desconocido'}</span>
                    {movie.imdbRating != null && <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{movie.imdbRating}</span>}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{movie.durationMinutes ? `${movie.durationMinutes} minutos` : 'Duración desconocida'}</p>
                  <p className="mt-1 text-sm text-slate-500">{movie.genres.map((item) => item.name).join(', ') || 'Sin género'}</p>
                </div>
                <div className="flex shrink-0 flex-col items-start gap-2 sm:mr-4 sm:items-end">
                  <div className="flex flex-wrap items-center gap-2">{links.map((item) => <a key={item.label} href={item.url!} target="_blank" rel="noreferrer" aria-label={item.label} className="inline-flex items-center transition-opacity hover:opacity-70">{item.label === 'IMDb' ? <img src="/imdb-logo.png" alt="IMDb" className="h-6 w-[50px] object-contain" /> : item.label === 'TMDB' ? <img src="/tmdb.png" alt="TMDB" className="h-5 w-[96px] object-contain" /> : <img src="/justwatch.png" alt="JustWatch" className="h-5 w-[85px] object-contain" />}</a>)}</div>
                  {movie.trailerUrl && <button type="button" onClick={() => setTrailerOpen(true)} className="movie-trailer-link inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition-opacity hover:opacity-70"><img src="/youtube-play.png" alt="" className="h-4 w-[23px] object-contain" aria-hidden="true" />Ver trailer</button>}
                </div>
              </div>
              {movie.synopsis && <div className="mt-6"><h3 className="field-label">Sinopsis</h3><p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{movie.synopsis}</p></div>}
              <dl className="mt-6 grid grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] gap-x-6 gap-y-5 border-t border-slate-200 pt-5">
                <div>
                  <dt className="field-label">País</dt>
                  <dd className="text-sm text-ink">{movie.countries.map((item) => item.name).join(', ') || 'Sin datos'}</dd>
                </div>
                <div className="relative flex flex-col gap-3 lg:block lg:pr-56">
                  <div className="min-w-0">
                    <dt className="field-label">Dirección</dt>
                    <dd className="text-sm text-ink">{movie.credits.filter((item) => item.creditType === 'director').map((item) => item.name).join(', ') || 'Sin datos'}</dd>
                  </div>
                  {!hideWatchNow && <a href={watchNowDestination.url} target="_blank" rel="noreferrer" className="primary-button hidden h-8 w-full shrink-0 gap-1.5 px-3 text-xs lg:absolute lg:right-0 lg:top-0 lg:inline-flex lg:w-52" title={`Ver ahora en ${watchNowDestination.label}`}>
                    <Play className="h-3.5 w-3.5 fill-current" />
                    VER AHORA
                  </a>}
                </div>
                <div>
                  <dt className="field-label flex items-center gap-1.5">Reparto{movie.tmdbId && cast.length > 0 && <button type="button" onClick={() => setCastPhotosOpen(true)} className="grid h-5 w-5 place-items-center rounded text-slate-400 transition-colors hover:bg-mist hover:text-ink" title="Ver imágenes del reparto" aria-label="Ver imágenes del reparto"><ExternalLink className="h-3.5 w-3.5" /></button>}</dt>
                  <dd className="text-sm text-ink">{visibleCast.map((item) => item.name).join(', ') || 'Sin datos'}</dd>
                </div>
                <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_13rem] lg:items-start lg:gap-x-4">
                  {!hidePlatforms ? <div className="min-w-0">
                    <dt className="field-label">Plataformas</dt>
                    <dd className="mt-1"><PlatformLogos platforms={movie.platforms} large /></dd>
                  </div> : <div />}
                  <div className="hidden lg:block">
                    {ratingField}
                    {movie.collections.length > 0 && <div className="mt-2 min-w-0">
                      <dt className="field-label">Colección</dt>
                      <dd className="text-sm text-ink">{movie.collections.map((collection) => collection.name).join(', ')}</dd>
                    </div>}
                  </div>
                </div>
                {movie.type === 'series' && <div>
                  <dt className="field-label">Temporadas</dt>
                  <dd className="text-sm text-ink">{movie.seasons ?? 'Sin datos'}</dd>
                </div>}
                {movie.type === 'series' && <div>
                  <dt className="field-label">Episodios</dt>
                  <dd className="text-sm text-ink">{movie.totalEpisodes ?? 'Sin datos'}</dd>
                </div>}
                {/* Mobile: Colección debajo de Reparto (película) o de Temporadas (serie), con VER AHORA a su lado.
                    Sin colección, VER AHORA queda debajo de Plataformas (película) o de Episodios (serie). */}
                <div className="col-start-2 flex flex-col justify-end lg:hidden">
                  {!hideWatchNow && <a href={watchNowDestination.url} target="_blank" rel="noreferrer" className="primary-button h-8 w-full gap-1.5 px-3 text-xs" title={`Ver ahora en ${watchNowDestination.label}`}>
                    <Play className="h-3.5 w-3.5 fill-current" />
                    VER AHORA
                  </a>}
                  {ratingField}
                  {movie.collections.length > 0 && <div className="mt-2 min-w-0">
                    <dt className="field-label">Colección</dt>
                    <dd className="text-sm text-ink">{movie.collections.map((collection) => collection.name).join(', ')}</dd>
                  </div>}
                </div>
              </dl>
            </section>
          </div>
        </div>
      </div>
    </div>
    {trailerOpen && movie.trailerUrl && <TrailerModal title={title} trailerUrl={movie.trailerUrl} onClose={() => setTrailerOpen(false)} />}
    {castPhotosOpen && movie.tmdbId && <CastPhotosModal title={title} type={movie.type} tmdbId={movie.tmdbId} cast={cast} onClose={() => setCastPhotosOpen(false)} />}
  </>);
};
