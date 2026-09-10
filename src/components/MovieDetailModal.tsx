import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bookmark, Check, ChevronDown, ExternalLink, Eye, Film, Heart, Pencil, Star, Trash2, X } from 'lucide-react';
import { PlatformLogos } from '@/components/PlatformLogos';
import { StarRating } from '@/components/StarRating';
import { api, resolveMovieImageUrl } from '@/services/api';
import type { MovieItem } from '@/types/movie';

export const MovieDetailModal = ({ movie, onClose, onEdit, onDelete, onPersonal, onRating, onCollections }: {
  movie: MovieItem;
  onClose: () => void;
  onEdit?: (movie: MovieItem) => void;
  onDelete?: (movie: MovieItem) => void;
  onPersonal: (movie: MovieItem, field: 'favorite' | 'watched' | 'watchlist') => void;
  onRating: (movie: MovieItem, rating: number | null) => void;
  onCollections: (movie: MovieItem, collectionIds: string[]) => void;
}) => {
  const collections = useQuery({ queryKey: ['collections'], queryFn: api.collections.getAll });
  const [collectionMenuOpen, setCollectionMenuOpen] = useState(false);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState(movie.collections.map((collection) => collection.id));
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
  useEffect(() => setSelectedCollectionIds(movie.collections.map((collection) => collection.id)), [movie.collections]);
  const title = movie.originalTitle;
  const spanishTitle = movie.spanishTitle && movie.spanishTitle !== movie.originalTitle ? movie.spanishTitle : null;
  const image = movie.images.find((item) => item.isPrimary) || movie.images[0];
  const tmdbUrl = movie.tmdbUrl || (movie.tmdbId ? `https://www.themoviedb.org/${movie.type === 'movie' ? 'movie' : 'tv'}/${movie.tmdbId}` : null);
  const justWatchUrl = movie.justwatchUrl || `https://www.justwatch.com/ar/buscar?q=${encodeURIComponent([spanishTitle || title, movie.year].filter(Boolean).join(' '))}`;
  const links = [
    { label: 'IMDb', url: movie.imdbUrl },
    { label: 'TMDB', url: tmdbUrl },
    { label: 'JustWatch', url: justWatchUrl },
    { label: 'Trailer', url: movie.trailerUrl },
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/55 sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="movie-detail-title">
      <div ref={modalRef} className="movie-detail-modal max-h-[96vh] w-full overflow-hidden rounded-t-md bg-canvas shadow-xl sm:max-w-5xl sm:rounded-md" style={{ transform: `translate3d(${modalOffset.x}px, ${modalOffset.y}px, 0)` }}>
        <header onPointerDown={startDragging} onPointerMove={dragModal} onPointerUp={stopDragging} onPointerCancel={stopDragging} className="flex min-h-16 touch-none select-none items-center gap-2 border-b border-slate-200 bg-white px-4 py-3 sm:cursor-move sm:px-6">
          <div className="min-w-0">
            <h2 id="movie-detail-title" className="font-bebas truncate text-[24px] font-normal uppercase leading-7 text-ink">{title}</h2>
          </div>
          <div className="ml-auto flex shrink-0 gap-1">
            {onEdit && <button type="button" onClick={() => onEdit(movie)} className="icon-button border-0 shadow-none" title="Editar" aria-label="Editar"><Pencil className="h-4 w-4" /></button>}
            {onDelete && <button type="button" onClick={() => onDelete(movie)} className="icon-button border-0 text-red-600 shadow-none" title="Eliminar" aria-label="Eliminar"><Trash2 className="h-4 w-4" /></button>}
            <button type="button" onClick={onClose} className="icon-button border-0 shadow-none" title="Cerrar" aria-label="Cerrar"><X className="h-5 w-5" /></button>
          </div>
        </header>

        <div className="max-h-[calc(96vh-64px)] overflow-y-auto p-4 sm:p-6">
          <div className="grid gap-6 md:grid-cols-[250px_minmax(0,1fr)]">
            <div className="mx-auto w-full max-w-[250px]">
              <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-mist">
                {image ? <img src={resolveMovieImageUrl(image.url)} alt={title} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><Film className="h-16 w-16 text-aqua" /></div>}
                <span className={`absolute left-2 top-2 rounded px-2 py-1 text-[10px] font-semibold uppercase text-white shadow-sm ${movie.type === 'series' ? 'bg-aqua' : 'bg-coral'}`}>{movie.type === 'movie' ? 'Película' : 'Serie'}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => onPersonal(movie, 'watched')} className={`secondary-button min-w-0 gap-2 px-2 text-xs uppercase ${movie.watched ? 'border-[#2cbc63] bg-[#2cbc63]/10 text-[#218f4c]' : ''}`}><Eye className="h-[18px] w-[18px]" />Watch</button>
                <button type="button" onClick={() => onPersonal(movie, 'favorite')} className={`secondary-button min-w-0 gap-2 px-2 text-xs uppercase ${movie.favorite ? 'border-coral bg-red-50 text-coral' : ''}`}><Heart className={`h-4 w-4 ${movie.favorite ? 'fill-current' : ''}`} />Like</button>
                <button type="button" onClick={() => onPersonal(movie, 'watchlist')} className={`secondary-button h-12 min-w-0 gap-1.5 px-1.5 py-1 text-[11px] uppercase ${movie.watchlist ? 'border-aqua bg-mist text-aqua' : ''}`}><Bookmark className={`h-3.5 w-3.5 ${movie.watchlist ? 'fill-current' : ''}`} />Watchlist</button>
                <div className="flex h-12 min-w-0 flex-col justify-center rounded-md border border-slate-200 bg-white px-1.5 py-1 text-left">
                  <span className="field-label mb-0 leading-none">Rate</span>
                  <StarRating compact value={movie.personalRating} onChange={(rating) => onRating(movie, rating)} />
                </div>
                <div className="relative col-span-2 text-left" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setCollectionMenuOpen(false); }}>
                  <span className="field-label">Colección</span>
                  <button type="button" onClick={() => setCollectionMenuOpen((current) => !current)} className="control flex w-full items-center gap-2 text-left" aria-expanded={collectionMenuOpen}>
                    <span className={`min-w-0 flex-1 truncate ${selectedCollectionIds.length ? 'text-ink' : 'text-slate-400'}`}>{selectedCollectionIds.length ? collections.data?.filter((collection) => selectedCollectionIds.includes(collection.id)).map((collection) => collection.name).join(', ') || `${selectedCollectionIds.length} seleccionada${selectedCollectionIds.length === 1 ? '' : 's'}` : 'Elegir colección'}</span>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${collectionMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {collectionMenuOpen && <div className="absolute bottom-full left-0 right-0 z-[80] mb-1 max-h-48 overflow-y-auto rounded-md border border-slate-200 bg-white p-1.5 shadow-card">
                    {collections.data?.length ? collections.data.map((collection) => {
                      const selected = selectedCollectionIds.includes(collection.id);
                      return <button key={collection.id} type="button" onClick={() => { const next = selected ? selectedCollectionIds.filter((id) => id !== collection.id) : [...selectedCollectionIds, collection.id]; setSelectedCollectionIds(next); onCollections(movie, next); }} className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm ${selected ? 'bg-mist font-semibold text-ink' : 'text-slate-600 hover:bg-slate-50'}`}><Check className={`h-4 w-4 shrink-0 ${selected ? 'text-aqua' : 'text-transparent'}`} />{collection.name}</button>;
                    }) : <p className="px-2 py-3 text-sm text-slate-400">No hay colecciones.</p>}
                  </div>}
                </div>
              </div>
            </div>
            <section className="min-w-0">
              <h1 className="font-bebas text-[28px] font-normal uppercase leading-8 text-ink">{title}</h1>
              {spanishTitle && <p className="mt-0.5 text-sm font-medium text-slate-600">{spanishTitle}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <span className="text-base font-bold text-slate-500">{movie.year || 'Año desconocido'}</span>
                {movie.imdbRating != null && <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{movie.imdbRating}</span>}
              </div>
              <p className="mt-1 text-sm text-slate-500">{movie.durationMinutes ? `${movie.durationMinutes} minutos` : 'Duración desconocida'}</p>
              <p className="mt-1 text-sm text-slate-500">{movie.genres.map((item) => item.name).join(', ') || 'Sin género'}</p>
              {movie.synopsis && <div className="mt-6"><h3 className="field-label">Sinopsis</h3><p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{movie.synopsis}</p></div>}
              <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-slate-200 pt-5">
                <div>
                  <dt className="field-label">País</dt>
                  <dd className="text-sm text-ink">{movie.countries.map((item) => item.name).join(', ') || 'Sin datos'}</dd>
                </div>
                <div>
                  <dt className="field-label">Dirección</dt>
                  <dd className="text-sm text-ink">{movie.credits.filter((item) => item.creditType === 'director').map((item) => item.name).join(', ') || 'Sin datos'}</dd>
                </div>
                <div>
                  <dt className="field-label">Reparto</dt>
                  <dd className="text-sm text-ink">{movie.credits.filter((item) => item.creditType === 'cast').map((item) => item.name).join(', ') || 'Sin datos'}</dd>
                </div>
                <div>
                  <dt className="field-label">Trailer</dt>
                  <dd>{movie.trailerUrl ? <a href={movie.trailerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition-opacity hover:opacity-70"><img src="/youtube-play.png" alt="" className="h-4 w-[23px] object-contain" aria-hidden="true" />Ver trailer</a> : <span className="text-sm text-slate-400">No disponible</span>}</dd>
                </div>
                {movie.type === 'series' && <>
                  <div>
                    <dt className="field-label">Temporadas</dt>
                    <dd className="text-sm text-ink">{movie.seasons ?? 'Sin datos'}</dd>
                  </div>
                  <div>
                    <dt className="field-label">Episodios</dt>
                    <dd className="text-sm text-ink">{movie.totalEpisodes ?? 'Sin datos'}</dd>
                  </div>
                </>}
                <div>
                  <dt className="field-label">Plataformas</dt>
                  <dd className="mt-1"><PlatformLogos platforms={movie.platforms} large /></dd>
                </div>
                <div>
                  <dt className="field-label">Links</dt>
                  <dd className="mt-1 flex flex-wrap items-center gap-2">{links.filter((item) => item.label !== 'Trailer').map((item) => <a key={item.label} href={item.url!} target="_blank" rel="noreferrer" aria-label={item.label} className="inline-flex items-center transition-opacity hover:opacity-70">{item.label === 'IMDb' ? <img src="/imdb-logo.png" alt="IMDb" className="h-6 w-[50px] object-contain" /> : item.label === 'TMDB' ? <img src="/tmdb.png" alt="TMDB" className="h-5 w-[96px] object-contain" /> : item.label === 'JustWatch' ? <img src="/justwatch.png" alt="JustWatch" className="h-5 w-[85px] object-contain" /> : <>{item.label}<ExternalLink className="h-4 w-4" /></>}</a>)}</dd>
                </div>
              </dl>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
