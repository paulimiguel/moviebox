import { Eye, Film, Heart, Star, Tv } from 'lucide-react';
import { Link } from 'react-router-dom';
import { resolveMovieImageUrl } from '@/services/api';
import type { MovieItem } from '@/types/movie';

export const MovieCard = ({ movie, layout, onPersonal }: { movie: MovieItem; layout: 'grid' | 'list'; onPersonal?: (movie: MovieItem, field: 'favorite' | 'watched') => void }) => {
  const title = movie.spanishTitle || movie.originalTitle;
  const primaryImage = movie.images.find((image) => image.isPrimary) || movie.images[0];
  const primaryPlatform = movie.platforms.find((platform) => platform.isPrimary) || movie.platforms[0];
  const typeLabel = movie.type === 'movie' ? 'Pelicula' : 'Serie';

  if (layout === 'list') {
    return (
      <article className="grid min-h-[92px] grid-cols-[62px_minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-200 bg-white px-3 py-2.5 sm:grid-cols-[62px_minmax(0,1fr)_130px_150px]">
        <div className="aspect-[2/3] overflow-hidden rounded-md bg-slate-100">
          {primaryImage ? (
            <img src={resolveMovieImageUrl(primaryImage.url)} alt="" className="h-full w-full object-cover" />
          ) : (
            <Film className="m-auto h-full w-7 text-slate-300" />
          )}
        </div>
        <div className="min-w-0">
          <Link to={`/titulo/${movie.id}`}><h2 className="truncate text-sm font-semibold text-ink hover:text-coral sm:text-base">{title}</h2></Link>
          {movie.spanishTitle && movie.originalTitle !== movie.spanishTitle && (
            <p className="truncate text-xs text-slate-500">{movie.originalTitle}</p>
          )}
          <p className="mt-1 text-xs text-slate-500">{[movie.year, typeLabel].filter(Boolean).join(' - ')}</p>
        </div>
        <div className="hidden text-sm text-slate-500 sm:block">{primaryPlatform?.name || 'Sin plataforma'}</div>
        <div className="flex items-center justify-end gap-3 text-xs">
          {movie.personalRating != null && <span className="font-semibold text-coral">Mi nota {movie.personalRating}</span>}
          {movie.imdbRating != null && <span className="font-semibold text-[#b28616]">IMDb {movie.imdbRating}</span>}
          <button type="button" onClick={() => onPersonal?.(movie, 'favorite')} title="Favorita"><Heart className={`h-4 w-4 ${movie.favorite ? 'fill-coral text-coral' : 'text-slate-300'}`} /></button>
        </div>
      </article>
    );
  }

  return (
    <article className="group min-w-0 overflow-hidden rounded-md border border-slate-200 bg-white shadow-card transition-transform hover:-translate-y-0.5">
      <Link to={`/titulo/${movie.id}`} className="relative block aspect-[2/3] overflow-hidden bg-slate-100">
        {primaryImage ? (
          <img src={resolveMovieImageUrl(primaryImage.url)} alt={title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
        ) : (
          <div className="grid h-full place-items-center bg-mist">
            {movie.type === 'movie' ? <Film className="h-12 w-12 text-aqua/70" /> : <Tv className="h-12 w-12 text-aqua/70" />}
          </div>
        )}
        <div className="absolute left-2 top-2 rounded-md bg-ink/85 px-2 py-1 text-[11px] font-semibold text-white">{typeLabel}</div>
      </Link>
      <div className="min-h-[138px] p-3">
        <Link to={`/titulo/${movie.id}`}><h2 className="line-clamp-2 text-sm font-semibold leading-5 text-ink hover:text-coral sm:text-base">{title}</h2></Link>
        {movie.spanishTitle && movie.originalTitle !== movie.spanishTitle && (
          <p className="mt-0.5 truncate text-xs text-slate-500">{movie.originalTitle}</p>
        )}
        <p className="mt-2 text-xs text-slate-500">{movie.year || 'Ano desconocido'}</p>
        <div className="mt-3 flex min-h-5 flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {movie.personalRating != null && (
            <span className="inline-flex items-center gap-1 font-semibold text-coral">
              <Star className="h-3.5 w-3.5 fill-current" />
              Mi nota {movie.personalRating}
            </span>
          )}
          {movie.imdbRating != null && <span className="font-semibold text-[#9b7410]">IMDb {movie.imdbRating}</span>}
        </div>
        {primaryPlatform && <p className="mt-2 truncate text-xs text-slate-500">{primaryPlatform.name}</p>}
        <div className="mt-2 flex justify-end gap-1">
          <button type="button" onClick={() => onPersonal?.(movie, 'watched')} className={`grid h-8 w-8 place-items-center rounded-md ${movie.watched ? 'bg-mist text-aqua' : 'text-slate-300 hover:bg-slate-50'}`} title="Marcar como vista"><Eye className="h-4 w-4" /></button>
          <button type="button" onClick={() => onPersonal?.(movie, 'favorite')} className={`grid h-8 w-8 place-items-center rounded-md ${movie.favorite ? 'bg-red-50 text-coral' : 'text-slate-300 hover:bg-slate-50'}`} title="Marcar como favorita"><Heart className={`h-4 w-4 ${movie.favorite ? 'fill-current' : ''}`} /></button>
        </div>
      </div>
    </article>
  );
};
