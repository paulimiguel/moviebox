import { Check, Eye, Film, Heart, Star, Tv } from 'lucide-react';
import { resolveMovieImageUrl } from '@/services/api';
import type { MovieItem } from '@/types/movie';

export type MovieViewMode = 'row' | 'medium' | 'small' | 'list' | 'details';

interface MovieCardProps {
  movie: MovieItem;
  mode: MovieViewMode;
  onOpen: (movie: MovieItem) => void;
  onPersonal?: (movie: MovieItem, field: 'favorite' | 'watched') => void;
  selectionMode?: boolean;
  selected?: boolean;
  onSelectionChange?: (movie: MovieItem) => void;
}

export const MovieCard = ({ movie, mode, onOpen, onPersonal, selectionMode = false, selected = false, onSelectionChange }: MovieCardProps) => {
  const title = movie.originalTitle;
  const spanishTitle = movie.spanishTitle && movie.spanishTitle !== movie.originalTitle
    ? movie.spanishTitle
    : null;
  const primaryImage = movie.images.find((image) => image.isPrimary) || movie.images[0];
  const primaryPlatform = movie.platforms.find((platform) => platform.isPrimary) || movie.platforms[0];
  const typeLabel = movie.type === 'movie' ? 'Pelicula' : 'Serie';
  const primaryGenre = movie.genres[0]?.name || null;
  const genres = movie.genres.map((genre) => genre.name).join(', ');
  const directors = movie.credits.filter((credit) => credit.creditType === 'director').map((credit) => credit.name).join(', ');
  const filmAffinityUrl = movie.filmaffinityUrl || `https://www.filmaffinity.com/es/search.php?stext=${encodeURIComponent(spanishTitle || title)}`;
  const imdbLabel = movie.imdbRating != null ? `IMDb ${movie.imdbRating}` : 'IMDb';
  const activate = () => selectionMode ? onSelectionChange?.(movie) : onOpen(movie);
  const interactive = (event: React.MouseEvent) => event.stopPropagation();
  const selectionMark = selectionMode ? (
    <span className={`absolute right-2 top-2 z-10 grid h-6 w-6 place-items-center rounded-md border-2 ${selected ? 'border-coral bg-coral text-white' : 'border-white bg-white/90 text-transparent shadow-sm'}`}>
      <Check className="h-4 w-4" />
    </span>
  ) : null;
  const poster = (className: string) => primaryImage ? (
    <img src={resolveMovieImageUrl(primaryImage.url)} alt={title} className={className} />
  ) : (
    <div className={`grid place-items-center bg-mist ${className}`}>
      {movie.type === 'movie' ? <Film className="h-10 w-10 text-aqua/70" /> : <Tv className="h-10 w-10 text-aqua/70" />}
    </div>
  );
  const catalogLinks = (
    <span className="inline-flex shrink-0 items-center gap-3" onClick={interactive}>
      {movie.imdbUrl ? (
        <a href={movie.imdbUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#9b7410] hover:underline">{imdbLabel}</a>
      ) : movie.imdbRating != null ? <span className="font-semibold text-[#9b7410]">{imdbLabel}</span> : null}
      <a href={filmAffinityUrl} target="_blank" rel="noreferrer" className="font-semibold text-slate-500 hover:text-ink hover:underline">FilmAffinity</a>
    </span>
  );

  if (mode === 'list') {
    return (
      <article role="button" tabIndex={0} onClick={activate} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') activate(); }} className={`relative grid min-h-[88px] cursor-pointer grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-200 bg-white px-3 py-2 transition-colors hover:bg-slate-50 sm:grid-cols-[56px_minmax(0,1fr)_130px_190px] ${selected ? 'bg-red-50' : ''}`}>
        {selectionMark}
        <div className="h-[72px] overflow-hidden rounded bg-slate-100">{poster('h-full w-full object-cover')}</div>
        <div className="min-w-0">
          <div className="mb-1 flex flex-col items-start gap-0.5">
            <span className="rounded bg-ink px-1.5 py-0.5 text-[9px] font-semibold text-white">{typeLabel}</span>
            {primaryGenre && <span className="rounded bg-mist px-1.5 py-0.5 text-[9px] font-semibold text-ink">{primaryGenre}</span>}
          </div>
          <h2 className="truncate text-sm font-semibold text-ink sm:text-base">{title}</h2>
          {spanishTitle && <p className="truncate text-xs font-medium text-slate-600">{spanishTitle}</p>}
          <p className="mt-1 text-xs text-slate-500">{[movie.year, genres || 'Sin genero'].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="hidden truncate text-sm text-slate-500 sm:block">{primaryPlatform?.name || 'Sin plataforma'}</div>
        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 pr-7 text-xs sm:pr-0">
          {catalogLinks}
          <button type="button" onClick={(event) => { interactive(event); onPersonal?.(movie, 'favorite'); }} title="Favorita" aria-label="Favorita"><Heart className={`h-4 w-4 ${movie.favorite ? 'fill-coral text-coral' : 'text-slate-300'}`} /></button>
        </div>
      </article>
    );
  }

  if (mode === 'row' || mode === 'details') {
    const detailed = mode === 'details';
    return (
      <article role="button" tabIndex={0} onClick={activate} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') activate(); }} className={`relative grid cursor-pointer gap-5 border-b border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50 sm:grid-cols-[150px_minmax(0,1fr)] ${selected ? 'bg-red-50' : ''}`}>
        {selectionMark}
        <div className="mx-auto aspect-[2/3] w-full max-w-[150px] overflow-hidden rounded-md bg-slate-100">{poster('h-full w-full object-cover')}</div>
        <div className="min-w-0 self-center">
          <div className="flex flex-wrap items-start gap-2">
            <div className="flex flex-col items-start gap-1">
              <span className="rounded bg-ink px-2 py-1 text-[11px] font-semibold text-white">{typeLabel}</span>
              {primaryGenre && <span className="rounded bg-mist px-2 py-1 text-[11px] font-semibold text-ink">{primaryGenre}</span>}
            </div>
            {primaryPlatform && <span className="pt-1 text-xs font-medium text-slate-500">{primaryPlatform.name}</span>}
          </div>
          <h2 className="mt-3 text-xl font-semibold text-ink">{title}</h2>
          {spanishTitle && <p className="mt-0.5 text-sm font-medium text-slate-600">{spanishTitle}</p>}
          <p className="mt-1 text-sm text-slate-500">{[movie.year, genres || 'Sin genero'].filter(Boolean).join(' · ')}</p>
          {detailed && movie.synopsis && <p className="mt-4 line-clamp-4 max-w-4xl text-sm leading-6 text-slate-600">{movie.synopsis}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">{movie.personalRating != null && <span className="inline-flex items-center gap-1 font-semibold text-coral"><Star className="h-3.5 w-3.5 fill-current" />Mi nota {movie.personalRating}</span>}{catalogLinks}</div>
        </div>
      </article>
    );
  }

  if (mode === 'medium') {
    return (
      <article role="button" tabIndex={0} onClick={activate} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') activate(); }} className={`group relative flex h-full min-w-0 cursor-pointer flex-col rounded-md bg-white p-3 shadow-card transition-transform hover:-translate-y-0.5 ${selected ? 'ring-2 ring-coral ring-offset-2' : ''}`}>
        {selectionMark}
        <div className="relative aspect-[2/3] overflow-hidden bg-slate-100">
          {poster('h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]')}
          <span className="absolute left-2 top-2 rounded bg-ink/85 px-2 py-1 text-[10px] font-semibold uppercase text-white">
            {typeLabel}
          </span>
          <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-1" onClick={interactive}>
            <div className="flex min-w-0 items-center gap-1">
              {movie.imdbUrl ? (
                <a href={movie.imdbUrl} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center rounded-md border border-white/30 bg-white/40 px-2 text-[11px] font-semibold text-slate-700 shadow-sm backdrop-blur-sm hover:bg-white/60">{imdbLabel}</a>
              ) : movie.imdbRating != null ? (
                <span className="inline-flex h-8 items-center rounded-md border border-white/30 bg-white/40 px-2 text-[11px] font-semibold text-slate-700 shadow-sm backdrop-blur-sm">{imdbLabel}</span>
              ) : null}
              <a href={filmAffinityUrl} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center rounded-md border border-white/30 bg-white/40 px-2 text-[11px] font-semibold text-slate-700 shadow-sm backdrop-blur-sm hover:bg-white/60 hover:text-ink">FilmAffinity</a>
            </div>
            <div className="flex shrink-0 gap-1">
              <button type="button" onClick={() => onPersonal?.(movie, 'watched')} className={`grid h-8 w-8 place-items-center rounded-md border border-white/30 bg-white/40 shadow-sm backdrop-blur-sm hover:bg-white/60 ${movie.watched ? 'text-aqua' : 'text-slate-600'}`} title="Marcar como vista" aria-label="Marcar como vista"><Eye className="h-4 w-4" /></button>
              <button type="button" onClick={() => onPersonal?.(movie, 'favorite')} className={`grid h-8 w-8 place-items-center rounded-md border border-white/30 bg-white/40 shadow-sm backdrop-blur-sm hover:bg-white/60 ${movie.favorite ? 'text-coral' : 'text-slate-600'}`} title="Marcar como favorita" aria-label="Marcar como favorita"><Heart className={`h-4 w-4 ${movie.favorite ? 'fill-current' : ''}`} /></button>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col pt-3">
          <div className="flex items-baseline gap-2">
            <h2 className="font-bebas line-clamp-2 flex-1 text-[26px] font-normal uppercase leading-7 text-ink">{title}</h2>
            {movie.year && <span className="shrink-0 text-sm font-medium text-slate-500">{movie.year}</span>}
          </div>
          <dl className="mt-3 grid grid-cols-[70px_minmax(0,1fr)] gap-x-2 gap-y-1 text-[11px] leading-4">
            <dt className="font-bebas text-[13px] font-normal uppercase text-slate-500">Tipo</dt>
            <dd className="font-medium text-ink">{typeLabel}</dd>
            <dt className="font-bebas text-[13px] font-normal uppercase text-slate-500">Genero</dt>
            <dd className="line-clamp-2 text-ink">{genres || 'Sin genero'}</dd>
            {movie.durationMinutes && <><dt className="font-bebas text-[13px] font-normal uppercase text-slate-500">Duracion</dt><dd className="text-ink">{movie.durationMinutes} minutos</dd></>}
            {directors && <><dt className="font-bebas text-[13px] font-normal uppercase text-slate-500">Direccion</dt><dd className="line-clamp-1 text-ink">{directors}</dd></>}
            <dt className="font-bebas text-[13px] font-normal uppercase text-slate-500">Plataforma</dt>
            <dd className="line-clamp-1 text-ink">{primaryPlatform?.name || 'Sin plataforma'}</dd>
          </dl>

        </div>
      </article>
    );
  }

  return (
    <article role="button" tabIndex={0} onClick={activate} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') activate(); }} className={`group relative min-w-0 cursor-pointer overflow-hidden rounded-md border bg-white shadow-card transition-transform hover:-translate-y-0.5 ${selected ? 'border-coral ring-2 ring-coral/20' : 'border-slate-200'}`}>
      {selectionMark}
      <div className="relative aspect-[2/3] overflow-hidden bg-slate-100">
        {poster('h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]')}
        <div className="absolute left-2 top-2 flex max-w-[calc(100%-1rem)] flex-col items-start gap-1">
          <span className="rounded bg-ink/85 px-2 py-1 text-[11px] font-semibold text-white">{typeLabel}</span>
          {primaryGenre && <span className="max-w-full truncate rounded bg-white/90 px-2 py-1 text-[11px] font-semibold text-ink shadow-sm">{primaryGenre}</span>}
        </div>
      </div>
      <div className={mode === 'small' ? 'min-h-[128px] p-2.5' : 'min-h-[154px] p-3'}>
        <h2 className={`${mode === 'small' ? 'text-sm' : 'text-base'} line-clamp-2 font-semibold leading-5 text-ink`}>{title}</h2>
        {spanishTitle && <p className="mt-0.5 line-clamp-1 text-xs font-medium text-slate-600">{spanishTitle}</p>}
        <p className="mt-1 truncate text-xs text-slate-500">{movie.year || 'Ano desconocido'}</p>
        <p className="mt-1 text-xs leading-4 text-slate-500">{genres || 'Sin genero'}</p>
        <p className="mt-1 truncate text-xs font-medium text-slate-600">{primaryPlatform?.name || 'Sin plataforma'}</p>
        <div className="mt-2 flex min-h-5 flex-wrap items-center gap-x-3 gap-y-1 text-xs">{catalogLinks}</div>
        <div className="mt-2 flex justify-end gap-1" onClick={interactive}>
          <button type="button" onClick={() => onPersonal?.(movie, 'watched')} className={`grid h-8 w-8 place-items-center rounded-md ${movie.watched ? 'bg-mist text-aqua' : 'text-slate-300 hover:bg-slate-50'}`} title="Marcar como vista" aria-label="Marcar como vista"><Eye className="h-4 w-4" /></button>
          <button type="button" onClick={() => onPersonal?.(movie, 'favorite')} className={`grid h-8 w-8 place-items-center rounded-md ${movie.favorite ? 'bg-red-50 text-coral' : 'text-slate-300 hover:bg-slate-50'}`} title="Marcar como favorita" aria-label="Marcar como favorita"><Heart className={`h-4 w-4 ${movie.favorite ? 'fill-current' : ''}`} /></button>
        </div>
      </div>
    </article>
  );
};
