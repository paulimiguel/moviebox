import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, X } from 'lucide-react';
import { api } from '@/services/api';
import type { MovieItem } from '@/types/movie';

// Cuadro de comentarios del título: muestra lo escrito y permite ingresarlo o editarlo directamente.
export const MovieCommentsDialog = ({ movie, comments, onSaved, onClose }: {
  movie: MovieItem;
  comments: string;
  onSaved: (comments: string) => void;
  onClose: () => void;
}) => {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(comments);
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const changed = draft.trim() !== comments.trim();

  useEffect(() => {
    textareaRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [onClose]);

  const save = useMutation({
    mutationFn: () => api.movies.updatePersonal(movie.id, { comments: draft.trim() || null }),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      onSaved(saved.comments || '');
      onClose();
    },
    onError: (reason: Error) => setError(reason.message),
  });

  return (
    <div className="fixed inset-0 z-[130] grid place-items-center bg-ink/55 p-4" role="dialog" aria-modal="true" aria-labelledby="movie-comments-title" onClick={onClose}>
      <div className="movie-detail-modal flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-md bg-canvas shadow-xl" onClick={(event) => event.stopPropagation()}>
        <header className="flex min-h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4">
          <div className="min-w-0 flex-1">
            <h2 id="movie-comments-title" className="font-bebas text-[22px] font-normal uppercase leading-7 text-ink">Comentarios</h2>
            <p className="truncate text-xs text-slate-500">{movie.spanishTitle || movie.originalTitle}</p>
          </div>
          <button type="button" onClick={onClose} className="icon-button border-0 shadow-none" title="Cerrar" aria-label="Cerrar"><X className="h-5 w-5" /></button>
        </header>
        <div className="overflow-y-auto p-4">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(event) => { setDraft(event.target.value); setError(''); }}
            className="control min-h-48 w-full py-2"
            maxLength={5000}
            placeholder="Escribí tus notas o comentarios sobre este título"
          />
          {error && <p className="mt-2 rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        </div>
        <footer className="flex min-h-14 shrink-0 items-center justify-end gap-2 border-t border-slate-200 bg-white px-4">
          <button type="button" onClick={onClose} className="secondary-button">{changed ? 'Cancelar' : 'Cerrar'}</button>
          <button type="button" onClick={() => { setError(''); save.mutate(); }} disabled={!changed || save.isPending} className="primary-button">{save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Guardar</button>
        </footer>
      </div>
    </div>
  );
};
