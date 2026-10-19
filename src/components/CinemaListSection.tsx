import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Film, Loader2 } from 'lucide-react';
import { CinemaMovieModal } from '@/components/CinemaMovieModal';
import { api, type CinemaListKey, type CinemaMovie } from '@/services/api';

const INITIAL_VISIBLE = 24;

const formatDuration = (minutes: number | null) => {
  if (!minutes) return null;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}h${rest ? ` ${rest}min` : ''}` : `${rest}min`;
};

const formatReleaseDate = (value: string | null) => {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
};

const CinemaCard = ({ movie, showReleaseDate, onSelect }: { movie: CinemaMovie; showReleaseDate: boolean; onSelect: (movie: CinemaMovie) => void }) => {
  const meta = [movie.genres[0], formatDuration(movie.durationMinutes)].filter(Boolean).join(' · ');
  const release = showReleaseDate ? formatReleaseDate(movie.releaseDate) : null;
  const [posterFailed, setPosterFailed] = useState(false);
  return (
    <button type="button" onClick={() => onSelect(movie)} className="group/cinema block min-w-0 text-left" title={movie.title}>
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-mist shadow-md ring-1 ring-black/5 transition-transform duration-200 group-hover/cinema:scale-[1.03]">
        {movie.posterUrl && !posterFailed
          ? <img src={movie.posterUrl} alt={`Póster de ${movie.title}`} referrerPolicy="no-referrer" loading="lazy" onError={() => setPosterFailed(true)} className="h-full w-full object-cover" />
          : <div className="grid h-full place-items-center text-aqua/50"><Film className="h-8 w-8" /></div>}
      </div>
      <h3 className="mt-2 line-clamp-2 min-h-[2.5em] font-bebas text-lg uppercase leading-tight text-ink transition-colors group-hover/cinema:text-coral">{movie.title}</h3>
      {meta && <p className="mt-0.5 truncate text-xs text-slate-500">{meta}</p>}
      {release && <p className="mt-0.5 truncate text-xs font-semibold capitalize text-aqua">Estreno: {release}</p>}
    </button>
  );
};

export const CinemaListSection = ({ id, listKey, title, showReleaseDate = false }: { id: string; listKey: CinemaListKey; title: string; showReleaseDate?: boolean }) => {
  const [visible, setVisible] = useState(INITIAL_VISIBLE);
  const [selected, setSelected] = useState<CinemaMovie | null>(null);
  const query = useQuery({ queryKey: ['cinema', listKey], queryFn: () => api.cinema.list(listKey), staleTime: 30 * 60 * 1000, retry: 1 });
  const items = query.data?.items || [];

  return (
    <section id={id} className="scroll-mt-20 w-full border-t border-slate-200/50 px-4 py-8 sm:px-6 sm:py-10">
      <div className="text-center">
        <h2 className="font-bebas text-3xl font-normal uppercase text-ink sm:text-4xl">{title}</h2>
        <p className="mt-1 text-xs text-slate-500">
          {query.data ? `${items.length} ${items.length === 1 ? 'película' : 'películas'} · ` : ''}
          Fuente: <a href={query.data?.source || 'https://agendadecine.com'} target="_blank" rel="noopener noreferrer" className="font-semibold text-aqua hover:underline">agendadecine.com</a>
          {query.data?.stale && ' · datos guardados, no se pudo actualizar'}
        </p>
      </div>

      {query.isLoading ? (
        <div className="grid h-48 place-items-center"><Loader2 className="h-8 w-8 animate-spin text-aqua" /></div>
      ) : query.isError ? (
        <div className="mt-6 rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center">
          <p className="text-sm text-slate-500">{query.error instanceof Error ? query.error.message : 'No se pudo cargar la cartelera.'}</p>
          <button type="button" onClick={() => void query.refetch()} className="secondary-button moviebox-translucent-action mt-3">Reintentar</button>
        </div>
      ) : (
        <>
          <div className="mx-auto mt-6 grid max-w-[1800px] grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
            {items.slice(0, visible).map((movie) => <CinemaCard key={movie.slug} movie={movie} showReleaseDate={showReleaseDate} onSelect={setSelected} />)}
          </div>
          {items.length > visible && (
            <div className="mt-6 flex justify-center">
              <button type="button" onClick={() => setVisible((current) => current + INITIAL_VISIBLE)} className="secondary-button moviebox-translucent-action">Ver más películas ({items.length - visible} más)</button>
            </div>
          )}
        </>
      )}
      {selected && <CinemaMovieModal cinemaMovie={selected} onClose={() => setSelected(null)} />}
    </section>
  );
};
