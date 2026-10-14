import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, UserRound, X } from 'lucide-react';
import { api } from '@/services/api';
import type { MovieCredit, MovieType } from '@/types/movie';

export const CastPhotosModal = ({ title, type, tmdbId, cast, onClose }: {
  title: string;
  type: MovieType;
  tmdbId: number;
  cast: MovieCredit[];
  onClose: () => void;
}) => {
  const castQuery = useQuery({
    queryKey: ['tmdb-cast', type, tmdbId, cast.map((member) => member.name).join('|')],
    queryFn: () => api.tmdb.cast(type, tmdbId, cast.map((member) => member.name)),
    staleTime: 1000 * 60 * 30,
  });
  const visibleCast = useMemo(() => [...(castQuery.data || [])].sort((left, right) => left.order - right.order).slice(0, 8), [castQuery.data]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[110] grid place-items-center bg-ink/60 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="movie-detail-modal flex max-h-[82vh] w-fit max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-md bg-canvas shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="cast-photos-title">
        <header className="flex min-h-16 items-center gap-3 border-b border-slate-200 bg-white px-5">
          <div className="min-w-0 flex-1">
            <h2 id="cast-photos-title" className="font-bebas truncate text-[24px] font-normal uppercase leading-7 text-ink">Reparto principal</h2>
            <p className="truncate text-xs text-slate-500">{title}</p>
          </div>
          <button type="button" onClick={onClose} className="icon-button" title="Cerrar" aria-label="Cerrar" autoFocus><X className="h-5 w-5" /></button>
        </header>
        <div className="overflow-y-auto p-4 sm:p-5">
          {castQuery.isLoading ? <div className="grid min-h-56 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-aqua" /></div>
            : castQuery.isError ? <p className="grid min-h-40 place-items-center text-center text-sm text-slate-500">No se pudieron cargar las imágenes del reparto.</p>
              : visibleCast.length ? <div className="grid w-max max-w-full auto-cols-[112px] grid-flow-col gap-3 overflow-x-auto pb-2 sm:auto-cols-[120px]">
                {visibleCast.map((member) => <article key={member.id} className="min-w-0 overflow-hidden rounded-md border border-slate-200 bg-white">
                  <div className="aspect-[2/3] bg-slate-100">
                    {member.profileUrl ? <img src={member.profileUrl} alt={member.name} className="h-full w-full object-cover" loading="lazy" /> : <div className="grid h-full place-items-center"><UserRound className="h-12 w-12 text-slate-300" /></div>}
                  </div>
                  <div className="p-2.5">
                    <h3 className="truncate text-sm font-semibold text-ink" title={member.name}>{member.name}</h3>
                    {member.character && <p className="mt-0.5 truncate text-xs text-slate-500" title={member.character}>{member.character}</p>}
                  </div>
                </article>)}
              </div> : <p className="grid min-h-40 place-items-center text-center text-sm text-slate-500">No hay imágenes disponibles para el reparto mencionado.</p>}
          <p className="mt-4 text-right text-[10px] font-medium uppercase text-slate-400">Imágenes de TMDB</p>
        </div>
      </section>
    </div>,
    document.body,
  );
};
