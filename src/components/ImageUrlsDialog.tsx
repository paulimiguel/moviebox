import { useEffect, useRef, useState } from 'react';
import { Trash2, X } from 'lucide-react';

const isImageUrl = (value: string) => /^https?:\/\/\S+$/i.test(value) || /^\/?uploads\/\S+$/i.test(value);

// Cuadro para ver las URLs de las imágenes del título y pegar una nueva debajo.
export const ImageUrlsDialog = ({ urls, max, onChange, onClose }: {
  urls: string[];
  max: number;
  onChange: (urls: string[]) => void;
  onClose: () => void;
}) => {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [onClose]);

  const pasteFromClipboard = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (!text) {
        setError('El portapapeles está vacío.');
        return;
      }
      setError('');
      setDraft((current) => (current.trim() ? `${current.replace(/\s+$/, '')}\n${text}` : text));
    } catch {
      setError('No se pudo leer el portapapeles. Pegá con Ctrl+V dentro del recuadro.');
    }
  };

  const addUrls = () => {
    const candidates = draft.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (!candidates.length) return;
    const invalid = candidates.filter((line) => !isImageUrl(line));
    if (invalid.length) {
      setError(`No es una URL válida: ${invalid[0]}`);
      return;
    }
    const next = [...urls];
    candidates.forEach((line) => { if (!next.includes(line)) next.push(line); });
    if (next.length > max) {
      setError(`Podés tener hasta ${max} imágenes. Quitá alguna para agregar más.`);
      return;
    }
    onChange(next);
    setDraft('');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-[130] grid place-items-center bg-ink/55 p-4" role="dialog" aria-modal="true" aria-labelledby="image-urls-title" onClick={onClose}>
      <div className="movie-detail-modal flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-md bg-canvas shadow-xl" onClick={(event) => event.stopPropagation()}>
        <header className="flex min-h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4">
          <div className="min-w-0 flex-1">
            <h2 id="image-urls-title" className="font-bebas text-[22px] font-normal uppercase leading-7 text-ink">URL de la portada</h2>
            <p className="text-xs text-slate-500">{urls.length} de {max} imágenes</p>
          </div>
          <button type="button" onClick={onClose} className="icon-button border-0 shadow-none" title="Cerrar" aria-label="Cerrar"><X className="h-5 w-5" /></button>
        </header>

        <div className="space-y-4 overflow-y-auto p-4">
          <section>
            <h3 className="field-label">Imágenes actuales</h3>
            {urls.length ? (
              <ul className="space-y-1.5">
                {urls.map((url, index) => (
                  <li key={`${url}-${index}`} className="flex items-center gap-2 rounded-md border border-slate-200 bg-white py-1.5 pl-3 pr-1.5">
                    <span className="min-w-0 flex-1 break-all text-xs text-slate-600" title={url}>{url}</span>
                    <button type="button" onClick={() => onChange(urls.filter((_, current) => current !== index))} className="icon-button h-7 w-7 shrink-0 text-red-600" title="Quitar" aria-label="Quitar imagen"><Trash2 className="h-3.5 w-3.5" /></button>
                  </li>
                ))}
              </ul>
            ) : <p className="rounded-md border border-dashed border-slate-300 px-3 py-4 text-center text-sm text-slate-400">Este título no tiene imágenes.</p>}
          </section>

          <section>
            <h3 className="field-label">Pegar URL</h3>
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(event) => { setDraft(event.target.value); setError(''); }}
                className="control min-h-24 w-full py-2 pb-10"
                placeholder="Pegá la URL de la imagen (una por línea)"
              />
              <button
                type="button"
                onClick={() => void pasteFromClipboard()}
                className="absolute bottom-2 right-2 rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase text-slate-600 transition-colors hover:bg-slate-200 hover:text-ink"
              >
                Pegar
              </button>
            </div>
            {error && <p className="movie-import-feedback mt-2 rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>}
          </section>
        </div>

        <footer className="flex min-h-14 shrink-0 items-center justify-end gap-2 border-t border-slate-200 bg-white px-4">
          <button type="button" onClick={onClose} className="secondary-button">Cerrar</button>
          <button type="button" onClick={addUrls} disabled={!draft.trim()} className="primary-button">Agregar</button>
        </footer>
      </div>
    </div>
  );
};
