import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';

export type EmptyMovieField =
  | 'spanishTitle' | 'year' | 'synopsis' | 'durationMinutes' | 'seasons' | 'totalEpisodes'
  | 'personalRating' | 'imdbRating' | 'imdbId' | 'imdbUrl' | 'tmdbId' | 'tmdbUrl'
  | 'justwatchUrl' | 'trailerUrl' | 'images' | 'countries' | 'directors' | 'cast'
  | 'genres' | 'keywords' | 'platforms' | 'collections';

export const emptyMovieFieldOptions: Array<{ id: EmptyMovieField; label: string }> = [
  { id: 'spanishTitle', label: 'Título en español' },
  { id: 'year', label: 'Año' },
  { id: 'synopsis', label: 'Sinopsis' },
  { id: 'durationMinutes', label: 'Duración' },
  { id: 'seasons', label: 'Temporadas (series)' },
  { id: 'totalEpisodes', label: 'Episodios (series)' },
  { id: 'personalRating', label: 'Puntuación personal' },
  { id: 'imdbRating', label: 'Puntuación IMDb' },
  { id: 'imdbId', label: 'ID de IMDb' },
  { id: 'imdbUrl', label: 'Link de IMDb' },
  { id: 'tmdbId', label: 'ID de TMDB' },
  { id: 'tmdbUrl', label: 'Link de TMDB' },
  { id: 'justwatchUrl', label: 'Link de JustWatch' },
  { id: 'trailerUrl', label: 'Link del trailer' },
  { id: 'images', label: 'Imágenes' },
  { id: 'countries', label: 'País' },
  { id: 'directors', label: 'Dirección' },
  { id: 'cast', label: 'Reparto' },
  { id: 'genres', label: 'Géneros' },
  { id: 'keywords', label: 'Palabras clave' },
  { id: 'platforms', label: 'Plataformas' },
  { id: 'collections', label: 'Colecciones' },
];

export const EmptyFieldsModal = ({ selected, onApply, onClose }: {
  selected: EmptyMovieField[];
  onApply: (fields: EmptyMovieField[]) => void;
  onClose: () => void;
}) => {
  const [draft, setDraft] = useState<EmptyMovieField[]>(selected);
  useEffect(() => setDraft(selected), [selected]);
  const toggle = (field: EmptyMovieField) => setDraft((current) => current.includes(field)
    ? current.filter((item) => item !== field)
    : [...current, field]);

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-ink/55 p-4" role="dialog" aria-modal="true" aria-labelledby="empty-fields-title">
      <div className="movie-detail-modal max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-md bg-canvas shadow-xl">
        <header className="flex min-h-16 items-center border-b border-slate-200 bg-white px-5">
          <div><h2 id="empty-fields-title" className="text-lg font-semibold text-ink">Buscar campos vacíos</h2><p className="text-xs text-slate-500">Elegí uno o varios campos. Se mostrarán los títulos que tengan vacío al menos uno.</p></div>
          <button type="button" onClick={onClose} className="icon-button ml-auto border-0 shadow-none" title="Cerrar" aria-label="Cerrar"><X className="h-5 w-5" /></button>
        </header>
        <div className="max-h-[calc(90vh-136px)] overflow-y-auto p-5">
          <div className="grid gap-2 sm:grid-cols-2">
            {emptyMovieFieldOptions.map((option) => {
              const active = draft.includes(option.id);
              return <button key={option.id} type="button" role="switch" aria-checked={active} onClick={() => toggle(option.id)} className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm text-ink hover:border-slate-300"><span>{option.label}</span><span className={`min-w-9 rounded-full px-2 py-1 text-center text-[10px] font-bold ${active ? 'bg-coral text-white' : 'bg-slate-200 text-slate-600'}`}>{active ? 'SÍ' : 'NO'}</span></button>;
            })}
          </div>
        </div>
        <footer className="flex min-h-16 items-center justify-between gap-2 border-t border-slate-200 bg-white px-5">
          <button type="button" onClick={() => setDraft([])} className="secondary-button">Limpiar</button>
          <div className="flex gap-2"><button type="button" onClick={onClose} className="secondary-button">Cancelar</button><button type="button" onClick={() => onApply(draft)} disabled={!draft.length} className="primary-button"><Search className="h-4 w-4" />Buscar</button></div>
        </footer>
      </div>
    </div>
  );
};
