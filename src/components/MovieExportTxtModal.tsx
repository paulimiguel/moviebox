import { useState } from 'react';
import { X, Copy, Check, Download } from 'lucide-react';
import type { MovieItem } from '@/types/movie';

interface MovieExportTxtModalProps {
  movies: MovieItem[];
  onClose: () => void;
}

type TitleFormat = 'spanish' | 'original' | 'both';

const WhatsAppIcon = () => (
  <svg className="h-4 w-4 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
  </svg>
);

export const MovieExportTxtModal = ({ movies, onClose }: MovieExportTxtModalProps) => {
  const [titleFormat, setTitleFormat] = useState<TitleFormat>('spanish');
  const [includeYear, setIncludeYear] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateLines = (format: TitleFormat, withYear: boolean) => {
    return movies.map((movie) => {
      let title = movie.originalTitle;
      if (format === 'spanish') {
        title = movie.spanishTitle || movie.originalTitle;
      } else if (format === 'both') {
        title = movie.spanishTitle && movie.spanishTitle !== movie.originalTitle
          ? `${movie.spanishTitle} (${movie.originalTitle})`
          : movie.originalTitle;
      }
      if (withYear && movie.year) {
        title += ` (${movie.year})`;
      }
      return title;
    });
  };

  const [text, setText] = useState<string>(() => generateLines('spanish', false).join('\n'));

  const handleFormatChange = (format: TitleFormat) => {
    setTitleFormat(format);
    setText(generateLines(format, includeYear).join('\n'));
  };

  const handleYearToggle = (checked: boolean) => {
    setIncludeYear(checked);
    setText(generateLines(titleFormat, checked).join('\n'));
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleWhatsApp = () => {
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownload = () => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `titulos-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const lineCount = text.split('\n').filter((l) => l.trim().length > 0).length;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-ink/55 p-4" role="dialog" aria-modal="true" aria-labelledby="export-txt-title">
      <div className="movie-detail-modal flex max-h-[92vh] sm:min-h-[580px] md:min-h-[620px] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-canvas shadow-2xl border border-slate-200">
        <header className="flex min-h-16 items-center justify-between border-b border-slate-200 bg-white px-5">
          <div>
            <h2 id="export-txt-title" className="text-lg font-semibold text-ink">Exportar títulos a TXT</h2>
            <p className="text-xs text-slate-500">
              {movies.length} {movies.length === 1 ? 'título seleccionado' : 'títulos seleccionados'} · uno por línea
            </p>
          </div>
          <button type="button" onClick={onClose} className="icon-button border-0 shadow-none" title="Cerrar" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 flex flex-col overflow-y-auto p-5 space-y-4 min-h-0">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-600">Formato:</span>
              <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => handleFormatChange('spanish')}
                  className={`rounded px-2.5 py-1 font-semibold transition-all ${titleFormat === 'spanish' ? 'bg-coral text-white shadow-sm' : 'text-slate-600 hover:text-ink'}`}
                >
                  Español
                </button>
                <button
                  type="button"
                  onClick={() => handleFormatChange('original')}
                  className={`rounded px-2.5 py-1 font-semibold transition-all ${titleFormat === 'original' ? 'bg-coral text-white shadow-sm' : 'text-slate-600 hover:text-ink'}`}
                >
                  Original
                </button>
                <button
                  type="button"
                  onClick={() => handleFormatChange('both')}
                  className={`rounded px-2.5 py-1 font-semibold transition-all ${titleFormat === 'both' ? 'bg-coral text-white shadow-sm' : 'text-slate-600 hover:text-ink'}`}
                >
                  Ambos
                </button>
              </div>
            </div>

            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeYear}
                onChange={(e) => handleYearToggle(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-coral focus:ring-coral"
              />
              <span className="font-medium text-slate-600">Incluir año</span>
            </label>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500 shrink-0">
              <span>Contenido del archivo TXT (editable):</span>
              <span>{lineCount} {lineCount === 1 ? 'línea' : 'líneas'}</span>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="control w-full flex-1 min-h-[300px] sm:min-h-[360px] font-mono text-sm leading-6 resize-y"
              placeholder="Títulos..."
              aria-label="Títulos a exportar"
            />
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-5 py-3.5 shrink-0">
          <button type="button" onClick={onClose} className="secondary-button">
            Cerrar
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="secondary-button gap-1.5"
              title="Descargar archivo .txt"
            >
              <Download className="h-4 w-4" />
              Descargar .txt
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="secondary-button gap-1.5"
              title="Copiar todo el contenido al portapapeles"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              {copied ? '¡Copiado!' : 'Copiar al portapapeles'}
            </button>

            <button
              type="button"
              onClick={handleWhatsApp}
              className="secondary-button gap-1.5"
              title="Compartir por WhatsApp"
            >
              <WhatsAppIcon />
              Compartir por WhatsApp
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
