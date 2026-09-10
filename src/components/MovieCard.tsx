import { useRef, useState } from 'react';
import { Bookmark, Check, Download, ExternalLink, Eye, Film, Heart, MoreVertical, Pencil, Printer, Share2, Star, Trash2, Tv, Youtube } from 'lucide-react';
import { PlatformLogos } from '@/components/PlatformLogos';
import { StarRating } from '@/components/StarRating';
import { resolveMovieImageUrl } from '@/services/api';
import { printMovies } from '@/utils/printMovies';
import type { MovieItem } from '@/types/movie';

export type MovieViewMode = 'medium' | 'small' | 'list' | 'details';

interface MovieCardProps {
  movie: MovieItem;
  mode: MovieViewMode;
  onOpen: (movie: MovieItem) => void;
  onPersonal?: (movie: MovieItem, field: 'favorite' | 'watched' | 'watchlist') => void;
  onRating?: (movie: MovieItem, rating: number | null) => void;
  onEdit?: (movie: MovieItem) => void;
  onDelete?: (movie: MovieItem) => void;
  selectionMode?: boolean;
  selected?: boolean;
  onSelectionChange?: (movie: MovieItem) => void;
}

export const MovieCard = ({ movie, mode, onOpen, onPersonal, onRating, onEdit, onDelete, selectionMode = false, selected = false, onSelectionChange }: MovieCardProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const title = movie.originalTitle;
  const spanishTitle = movie.spanishTitle && movie.spanishTitle !== movie.originalTitle
    ? movie.spanishTitle
    : null;
  const primaryImage = movie.images.find((image) => image.isPrimary) || movie.images[0];
  const typeLabel = movie.type === 'movie' ? 'Película' : 'Serie';
  const primaryGenre = movie.genres[0]?.name || null;
  const genres = movie.genres.map((genre) => genre.name).join(', ');
  const cast = movie.credits.filter((credit) => credit.creditType === 'cast').map((credit) => credit.name).join(', ');
  const tmdbUrl = movie.tmdbUrl || (movie.tmdbId ? `https://www.themoviedb.org/${movie.type === 'movie' ? 'movie' : 'tv'}/${movie.tmdbId}` : null);
  const justWatchUrl = movie.justwatchUrl || `https://www.justwatch.com/ar/buscar?q=${encodeURIComponent([spanishTitle || title, movie.year].filter(Boolean).join(' '))}`;
  const imdbLabel = movie.imdbRating != null ? `IMDb ${movie.imdbRating}` : 'IMDb';
  const activate = () => selectionMode ? onSelectionChange?.(movie) : onOpen(movie);
  const interactive = (event: React.MouseEvent) => event.stopPropagation();
  const selectionMark = (compact = false) => selectionMode ? (
    <span className={`absolute right-2 top-2 z-10 grid place-items-center rounded-md border-2 ${compact ? 'h-5 w-5' : 'h-6 w-6'} ${selected ? 'border-coral bg-coral text-white' : 'border-white bg-white/90 text-transparent shadow-sm'}`}>
      <Check className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
    </span>
  ) : null;
  const poster = (className: string) => primaryImage ? (
    <img src={resolveMovieImageUrl(primaryImage.url)} alt={title} className={className} />
  ) : (
    <div className={`grid place-items-center bg-mist ${className}`}>
      {movie.type === 'movie' ? <Film className="h-10 w-10 text-aqua/70" /> : <Tv className="h-10 w-10 text-aqua/70" />}
    </div>
  );
  const catalogLinks = (compact = false, small = false) => (
    <span className={`inline-flex flex-wrap items-center ${compact ? 'gap-1.5' : 'gap-3'}`} onClick={interactive}>
      {movie.imdbUrl ? (
        <a href={movie.imdbUrl} target="_blank" rel="noreferrer" title={imdbLabel} aria-label={imdbLabel} className="inline-flex items-center">
          <img src="/imdb-logo.png" alt="IMDb" className={`${small ? 'h-5 w-[42px]' : 'h-6 w-[50px]'} object-contain`} />
        </a>
      ) : movie.imdbRating != null ? <span title={imdbLabel}><img src="/imdb-logo.png" alt={imdbLabel} className={`${small ? 'h-5 w-[42px]' : 'h-6 w-[50px]'} object-contain`} /></span> : null}
      {tmdbUrl && <a href={tmdbUrl} target="_blank" rel="noreferrer" title="TMDB" aria-label="Ver en TMDB" className="inline-flex items-center">
        <img src="/tmdb.png" alt="TMDB" className={`${small ? 'h-4 w-[80px]' : 'h-5 w-[96px]'} object-contain`} />
      </a>}
      <a href={justWatchUrl} target="_blank" rel="noreferrer" title="JustWatch" aria-label="Ver en JustWatch" className="inline-flex items-center">
        <img src="/justwatch.png" alt="JustWatch" className={`${small ? 'h-4 w-[72px]' : 'h-5 w-[85px]'} object-contain`} />
      </a>
    </span>
  );
  const trailerLink = movie.trailerUrl ? (
    <a href={movie.trailerUrl} target="_blank" rel="noreferrer" onClick={interactive} className="inline-flex items-center gap-1.5 font-semibold text-slate-500 hover:text-ink hover:underline"><img src="/youtube-play.png" alt="" className="h-4 w-[23px] object-contain" aria-hidden="true" />Ver trailer</a>
  ) : null;
  const closeMenu = () => setMenuOpen(false);
  const downloadMovie = () => {
    const filename = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLocaleLowerCase() || 'movie';
    const url = URL.createObjectURL(new Blob([JSON.stringify(movie, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const shareMovie = async () => {
    const url = `${window.location.origin}/titulo/${movie.id}`;
    if (navigator.share) await navigator.share({ title, text: [title, movie.year].filter(Boolean).join(' · '), url });
    else await navigator.clipboard.writeText(url);
  };
  const actionControls = (overlay = false, includeWatch = false, compact = false) => selectionMode ? null : (
    <div ref={menuRef} className={`relative flex shrink-0 flex-col items-end gap-1 ${menuOpen ? 'z-[60]' : ''}`} onClick={interactive} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) closeMenu(); }}>
      <div className={`flex items-center ${compact ? 'gap-0.5' : 'gap-1'}`}>
        {includeWatch && <button type="button" onClick={() => onPersonal?.(movie, 'watched')} className={`grid place-items-center rounded-md ${compact ? 'h-[22px] w-[22px]' : 'h-8 w-8'} ${overlay ? 'border border-white/30 bg-white/70 shadow-sm backdrop-blur-sm hover:bg-white/90' : 'border border-slate-200 bg-white hover:bg-slate-50'} ${movie.watched ? 'text-[#2cbc63]' : 'text-slate-500'}`} title="Watch" aria-label="Watch"><Eye className={compact ? 'h-3.5 w-3.5' : 'h-[18px] w-[18px]'} /></button>}
        <button type="button" onClick={() => onPersonal?.(movie, 'favorite')} className={`grid place-items-center rounded-md ${compact ? 'h-[22px] w-[22px]' : 'h-8 w-8'} ${overlay ? 'border border-white/30 bg-white/70 shadow-sm backdrop-blur-sm hover:bg-white/90' : 'border border-slate-200 bg-white hover:bg-slate-50'} ${movie.favorite ? 'text-coral' : 'text-slate-500'}`} title="Like" aria-label="Like"><Heart className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} ${movie.favorite ? 'fill-current' : ''}`} /></button>
        <button type="button" onClick={() => onPersonal?.(movie, 'watchlist')} className={`grid place-items-center rounded-md ${compact ? 'h-[22px] w-[22px]' : 'h-8 w-8'} ${overlay ? 'border border-white/30 bg-white/70 shadow-sm backdrop-blur-sm hover:bg-white/90' : 'border border-slate-200 bg-white hover:bg-slate-50'} ${movie.watchlist ? 'text-aqua' : 'text-slate-500'}`} title={movie.watchlist ? 'Quitar de Watchlist' : 'Agregar a Watchlist'} aria-label={movie.watchlist ? 'Quitar de Watchlist' : 'Agregar a Watchlist'}><Bookmark className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} ${movie.watchlist ? 'fill-current' : ''}`} /></button>
        <button type="button" onClick={() => setMenuOpen((current) => !current)} className={`grid place-items-center rounded-md ${compact ? 'h-[22px] w-[22px]' : 'h-8 w-8'} ${overlay ? 'border border-white/30 bg-white/70 text-slate-600 shadow-sm backdrop-blur-sm hover:bg-white/90' : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`} title="Más acciones" aria-label="Más acciones" aria-expanded={menuOpen}><MoreVertical className={compact ? 'h-3 w-3' : 'h-4 w-4'} /></button>
      </div>
      {menuOpen && <div className={`absolute right-0 z-[70] w-52 rounded-md border border-slate-200 bg-white p-1.5 text-xs shadow-card ${compact ? 'top-6' : 'top-9'}`}>
        {movie.trailerUrl ? <a href={movie.trailerUrl} target="_blank" rel="noreferrer" onClick={closeMenu} className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-50"><Youtube className="h-4 w-4" />Ver trailer</a> : <span className="flex w-full cursor-not-allowed items-center gap-2 rounded-md px-3 py-1.5 text-slate-300"><Youtube className="h-4 w-4" />Ver trailer</span>}
        {movie.imdbUrl ? <a href={movie.imdbUrl} target="_blank" rel="noreferrer" onClick={closeMenu} className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-50"><ExternalLink className="h-4 w-4" />Ver en IMDb</a> : <span className="flex w-full cursor-not-allowed items-center gap-2 rounded-md px-3 py-1.5 text-slate-300"><ExternalLink className="h-4 w-4" />Ver en IMDb</span>}
        {tmdbUrl ? <a href={tmdbUrl} target="_blank" rel="noreferrer" onClick={closeMenu} className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-50"><ExternalLink className="h-4 w-4" />Ver en TMDB</a> : <span className="flex w-full cursor-not-allowed items-center gap-2 rounded-md px-3 py-1.5 text-slate-300"><ExternalLink className="h-4 w-4" />Ver en TMDB</span>}
        <a href={`/titulo/${movie.id}`} target="_blank" rel="noreferrer" onClick={closeMenu} className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-50"><ExternalLink className="h-4 w-4" />Abrir en nueva pestaña</a>
        <div className="my-1 border-t border-slate-100" />
        <button type="button" onClick={() => { closeMenu(); onEdit?.(movie); }} disabled={!onEdit} className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"><Pencil className="h-4 w-4" />Editar</button>
        <button type="button" onClick={() => { closeMenu(); printMovies([movie], 'cards'); }} className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-slate-600 hover:bg-slate-50"><Printer className="h-4 w-4" />Imprimir</button>
        <button type="button" onClick={() => { closeMenu(); downloadMovie(); }} className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-slate-600 hover:bg-slate-50"><Download className="h-4 w-4" />Descargar</button>
        <button type="button" onClick={() => { closeMenu(); void shareMovie().catch(() => undefined); }} className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-slate-600 hover:bg-slate-50"><Share2 className="h-4 w-4" />Compartir</button>
        <div className="my-1 border-t border-slate-100" />
        <button type="button" onClick={() => { closeMenu(); onDelete?.(movie); }} disabled={!onDelete} className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-300"><Trash2 className="h-4 w-4" />Eliminar</button>
      </div>}
    </div>
  );

  if (mode === 'list') {
    return (
      <article role="button" tabIndex={0} onClick={activate} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') activate(); }} className={`relative grid min-h-[140px] cursor-pointer grid-cols-[92px_minmax(0,1fr)] items-stretch gap-x-4 gap-y-3 border-b border-slate-200 bg-white p-3 transition-colors hover:bg-slate-50 lg:grid-cols-[100px_minmax(240px,1fr)_minmax(230px,auto)] lg:items-center ${menuOpen ? 'z-40' : ''} ${selected ? 'bg-red-50' : ''}`}>
        <div className="relative row-span-2 min-h-[140px] overflow-hidden bg-slate-100 lg:row-span-1 lg:h-full">
          {selectionMark(true)}
          {poster('h-full w-full object-cover')}
        </div>

        <div className="min-w-0 self-center">
          <h2 className="font-bebas line-clamp-2 text-[28px] font-normal uppercase leading-8 text-ink">{title}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-slate-500">
            {movie.year && <span className="text-base font-bold">{movie.year}</span>}
            {movie.imdbRating != null && <span className="inline-flex items-center gap-1 text-sm font-semibold"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{movie.imdbRating}</span>}
          </div>
          {genres && <p className="mt-2 text-sm leading-5 text-slate-500">{genres}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-4">
            {trailerLink && <span className="text-xs [&_img]:h-3 [&_img]:w-[18px]">{trailerLink}</span>}
          </div>
        </div>

        <div className="flex min-w-0 flex-col items-start self-center text-xs lg:items-end">
          <PlatformLogos platforms={movie.platforms} limit={3} />
          <div className="mt-2">{catalogLinks(true, true)}</div>
          <div className="mt-3">{actionControls(false, true)}</div>
        </div>
      </article>
    );
  }

  if (mode === 'details') {
    return (
      <article role="button" tabIndex={0} onClick={activate} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') activate(); }} className={`relative grid cursor-pointer gap-5 border-b border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50 sm:grid-cols-[200px_minmax(0,1fr)] lg:grid-cols-[220px_minmax(190px,0.65fr)_minmax(300px,1.35fr)] ${menuOpen ? 'z-40' : ''} ${selected ? 'bg-red-50' : ''}`}>
        <div className="group/poster relative mx-auto aspect-[2/3] w-full max-w-[220px] overflow-hidden bg-slate-100">{selectionMark()}{poster('h-full w-full object-cover transition-transform duration-300 ease-out group-hover/poster:scale-105')}</div>

        <div className="flex min-w-0 flex-col self-stretch">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-bebas min-w-0 text-[28px] font-normal uppercase leading-8 text-ink">{title}</h2>
            {actionControls(false, true)}
          </div>
          {spanishTitle && <p className="mt-0.5 text-sm font-medium text-slate-600">{spanishTitle}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="text-base font-bold text-slate-500">{movie.year || 'Ano desconocido'}</span>
            {movie.imdbRating != null && <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{movie.imdbRating}</span>}
          </div>
          <p className="mt-1 text-sm text-slate-500">{movie.durationMinutes ? `${movie.durationMinutes} minutos` : 'Duracion desconocida'}</p>
          <p className="mt-1 text-sm text-slate-500">{genres || 'Sin genero'}</p>

          <div className="mt-3" onClick={interactive}>
            <PlatformLogos platforms={movie.platforms} limit={5} large />
            <div className="mt-2 text-xs">{catalogLinks(true, true)}</div>
            {movie.personalRating != null && movie.personalRating >= 1 && <div className="mt-2">
              <span className="field-label">Rate</span>
              <StarRating compact allowClear={false} value={movie.personalRating} onChange={(rating) => onRating?.(movie, rating)} disabled={!onRating} />
            </div>}
          </div>

          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded bg-ink px-2 py-1 text-[11px] font-semibold text-white">{typeLabel}</span>
              {primaryGenre && <span className="rounded bg-mist px-2 py-1 text-[11px] font-semibold text-ink">{primaryGenre}</span>}
            </div>
          </div>
        </div>

        <div className="min-w-0 border-t border-slate-100 pt-4 sm:col-start-2 lg:col-start-auto lg:border-l lg:border-t-0 lg:py-1 lg:pl-5">
          <h3 className="text-xs font-semibold uppercase text-slate-500">Sinopsis</h3>
          <p className="mt-2 line-clamp-6 text-sm leading-6 text-slate-600">{movie.synopsis || 'Sin sinopsis disponible.'}</p>
          {cast && (
            <div className="mt-4">
              <h3 className="text-xs font-semibold uppercase text-slate-500">Reparto</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">{cast}</p>
            </div>
          )}
          {trailerLink && <div className="mt-4 text-sm">{trailerLink}</div>}
        </div>
      </article>
    );
  }

  if (mode === 'medium') {
    return (
      <article role="button" tabIndex={0} onClick={activate} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') activate(); }} className={`group relative flex h-full min-w-0 cursor-pointer flex-col rounded-md bg-white p-3 shadow-card transition-transform hover:-translate-y-0.5 ${menuOpen ? 'z-40' : ''} ${selected ? 'ring-2 ring-coral ring-offset-2' : ''}`}>
        <div className="relative aspect-[2/3]">
          {selectionMark()}
          <div className="h-full overflow-hidden bg-slate-100">{poster('h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]')}</div>
          <span className={`absolute left-2 top-2 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white shadow-sm ${movie.type === 'series' ? 'bg-aqua' : 'bg-coral'}`}>
            {typeLabel}
          </span>
          <div className="absolute bottom-2 right-2 flex shrink-0 gap-1" onClick={interactive}>
            <button type="button" onClick={() => onPersonal?.(movie, 'watched')} className={`grid h-8 w-8 place-items-center rounded-md border border-white/60 bg-white/50 shadow-sm backdrop-blur-sm hover:bg-white/70 ${movie.watched ? 'text-[#2cbc63]' : 'text-gray-500'}`} title="Watch" aria-label="Watch"><Eye className="h-[18px] w-[18px]" /></button>
            {actionControls(true)}
          </div>
        </div>

        <div className="flex flex-1 flex-col pt-3">
          <h2 className="font-bebas line-clamp-2 text-[28px] font-normal uppercase leading-8 text-ink">{title}</h2>
          {(movie.year || movie.imdbRating != null) && <div className="mt-1 flex flex-wrap items-center gap-3">
            {movie.year && <span className="text-base font-bold text-slate-500">{movie.year}</span>}
            {movie.imdbRating != null && <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{movie.imdbRating}</span>}
          </div>}
          <p className="mt-2 text-sm text-slate-500">{movie.durationMinutes ? `${movie.durationMinutes} minutos` : 'Duracion desconocida'}</p>
          <p className="mt-1 line-clamp-2 text-sm text-slate-500">{genres || 'Sin genero'}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <PlatformLogos platforms={movie.platforms} limit={4} />
            {trailerLink && <span className="text-xs [&_img]:h-3 [&_img]:w-[18px]">{trailerLink}</span>}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article role="button" tabIndex={0} onClick={activate} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') activate(); }} className={`group relative min-w-0 cursor-pointer rounded-md border bg-white shadow-card transition-transform hover:-translate-y-0.5 ${menuOpen ? 'z-40' : ''} ${selected ? 'border-coral ring-2 ring-coral/20' : 'border-slate-200'}`}>
      {selectionMark()}
      <div className="relative aspect-[2/3]">
        <div className="h-full overflow-hidden rounded-t-md bg-slate-100">{poster('h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]')}</div>
      </div>
      <div className="p-2">
        <h2 className="font-bebas line-clamp-2 text-[18px] font-normal uppercase leading-5 text-ink">{title}</h2>
        <div className="mt-1 flex justify-end">{actionControls(false, true, true)}</div>
      </div>
    </article>
  );
};
