import { ExternalLink, Eye, Film, Heart, Pencil, Printer, Star, Trash2, X } from 'lucide-react';
import { resolveMovieImageUrl } from '@/services/api';
import { printMovies } from '@/utils/printMovies';
import type { MovieItem } from '@/types/movie';

export const MovieDetailModal = ({ movie, onClose, onEdit, onDelete, onPersonal }: {
  movie: MovieItem;
  onClose: () => void;
  onEdit?: (movie: MovieItem) => void;
  onDelete?: (movie: MovieItem) => void;
  onPersonal: (movie: MovieItem, field: 'favorite' | 'watched') => void;
}) => {
  const title = movie.spanishTitle || movie.originalTitle;
  const image = movie.images.find((item) => item.isPrimary) || movie.images[0];
  const filmAffinityUrl = movie.filmaffinityUrl || `https://www.filmaffinity.com/es/search.php?stext=${encodeURIComponent(title)}`;
  const links = [
    { label: 'IMDb', url: movie.imdbUrl },
    { label: 'FilmAffinity', url: filmAffinityUrl },
    { label: 'Trailer', url: movie.trailerUrl },
  ].filter((item) => item.url);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/55 sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="movie-detail-title">
      <div className="max-h-[96vh] w-full overflow-hidden rounded-t-md bg-canvas shadow-xl sm:max-w-5xl sm:rounded-md">
        <header className="flex min-h-16 items-center gap-2 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-coral">{movie.type === 'movie' ? 'Pelicula' : 'Serie'}</p>
            <h2 id="movie-detail-title" className="truncate text-lg font-semibold text-ink">{title}</h2>
          </div>
          <div className="ml-auto flex shrink-0 gap-1">
            {onEdit && <button type="button" onClick={() => onEdit(movie)} className="icon-button border-0 shadow-none" title="Editar" aria-label="Editar"><Pencil className="h-4 w-4" /></button>}
            <button type="button" onClick={() => printMovies([movie], 'cards')} className="icon-button border-0 shadow-none" title="Imprimir" aria-label="Imprimir"><Printer className="h-4 w-4" /></button>
            {onDelete && <button type="button" onClick={() => onDelete(movie)} className="icon-button border-0 text-red-600 shadow-none" title="Eliminar" aria-label="Eliminar"><Trash2 className="h-4 w-4" /></button>}
            <button type="button" onClick={onClose} className="icon-button border-0 shadow-none" title="Cerrar" aria-label="Cerrar"><X className="h-5 w-5" /></button>
          </div>
        </header>

        <div className="max-h-[calc(96vh-64px)] overflow-y-auto p-4 sm:p-6">
          <div className="grid gap-6 md:grid-cols-[250px_minmax(0,1fr)]">
            <div className="mx-auto aspect-[2/3] w-full max-w-[250px] overflow-hidden rounded-md bg-mist">
              {image ? <img src={resolveMovieImageUrl(image.url)} alt={title} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><Film className="h-16 w-16 text-aqua" /></div>}
            </div>
            <section className="min-w-0">
              <h1 className="text-3xl font-bold text-ink">{title}</h1>
              {movie.spanishTitle && movie.spanishTitle !== movie.originalTitle && <p className="mt-1 text-lg text-slate-500">{movie.originalTitle}</p>}
              <p className="mt-3 text-sm text-slate-500">{[movie.year, movie.genres.map((item) => item.name).join(', '), movie.durationMinutes ? `${movie.durationMinutes} min` : null].filter(Boolean).join(' · ')}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" onClick={() => onPersonal(movie, 'watched')} className={`secondary-button gap-2 ${movie.watched ? 'border-aqua bg-mist text-ink' : ''}`}><Eye className="h-4 w-4" />{movie.watched ? 'Vista' : 'No vista'}</button>
                <button type="button" onClick={() => onPersonal(movie, 'favorite')} className={`secondary-button gap-2 ${movie.favorite ? 'border-coral bg-red-50 text-coral' : ''}`}><Heart className={`h-4 w-4 ${movie.favorite ? 'fill-current' : ''}`} />Favorita</button>
              </div>
              <div className="mt-5 flex flex-wrap gap-4 text-sm">
                {movie.personalRating != null && <span className="inline-flex items-center gap-1 font-semibold text-coral"><Star className="h-4 w-4 fill-current" />Mi nota {movie.personalRating}</span>}
                {movie.imdbRating != null && <span className="font-semibold text-[#9b7410]">IMDb {movie.imdbRating}</span>}
              </div>
              {movie.synopsis && <div className="mt-6"><h3 className="font-semibold text-ink">Sinopsis</h3><p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{movie.synopsis}</p></div>}
              <dl className="mt-6 grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2">
                {movie.credits.some((item) => item.creditType === 'director') && <div><dt className="field-label">Direccion</dt><dd className="text-sm text-ink">{movie.credits.filter((item) => item.creditType === 'director').map((item) => item.name).join(', ')}</dd></div>}
                {movie.credits.some((item) => item.creditType === 'cast') && <div><dt className="field-label">Reparto</dt><dd className="text-sm text-ink">{movie.credits.filter((item) => item.creditType === 'cast').map((item) => item.name).join(', ')}</dd></div>}
                <div><dt className="field-label">Tipo</dt><dd className="text-sm text-ink">{movie.type === 'movie' ? 'Pelicula' : 'Serie'}</dd></div>
                <div><dt className="field-label">Plataformas</dt><dd className="text-sm text-ink">{movie.platforms.map((item) => item.name).join(', ') || 'Sin plataforma'}</dd>{movie.platforms.some((item) => item.tmdbProviderId) && <p className="mt-1 text-xs text-slate-400">Disponibilidad provista por JustWatch</p>}</div>
                {movie.type === 'series' && <div><dt className="field-label">Episodios</dt><dd className="text-sm text-ink">{[movie.seasons && `${movie.seasons} temporadas`, movie.totalEpisodes && `${movie.totalEpisodes} episodios`].filter(Boolean).join(' · ') || 'Sin datos'}</dd></div>}
                {movie.collections.length > 0 && <div><dt className="field-label">Colecciones</dt><dd className="text-sm text-ink">{movie.collections.map((item) => item.name).join(', ')}</dd></div>}
              </dl>
              <div className="mt-6 flex flex-wrap gap-2">{links.map((item) => <a key={item.label} href={item.url!} target="_blank" rel="noreferrer" className="secondary-button gap-2">{item.label}<ExternalLink className="h-4 w-4" /></a>)}</div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
