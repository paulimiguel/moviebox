import { useState } from 'react';
import { Check, Copy, FileSpreadsheet, FileText, Loader2, X } from 'lucide-react';
import type { MovieItem } from '@/types/movie';

interface MovieExportOptionsModalProps {
  movies: MovieItem[];
  onClose: () => void;
}

const exportTitle = (movie: MovieItem) => movie.spanishTitle || movie.originalTitle;

const exportLines = (movies: MovieItem[]) => movies.map((movie) =>
  `${exportTitle(movie)}${movie.year ? ` (${movie.year})` : ''}`
);

export const MovieExportOptionsModal = ({ movies, onClose }: MovieExportOptionsModalProps) => {
  const [feedback, setFeedback] = useState('');
  const [exportingXls, setExportingXls] = useState(false);

  const copyToClipboard = async () => {
    const text = exportLines(movies).join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setFeedback(`${movies.length} ${movies.length === 1 ? 'título copiado' : 'títulos copiados'} al portapapeles.`);
  };

  const exportTxt = () => {
    const blob = new Blob([exportLines(movies).join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `titulos-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    setFeedback(`Se exportaron ${movies.length} ${movies.length === 1 ? 'título' : 'títulos'} a TXT.`);
  };

  const exportXls = async () => {
    setExportingXls(true);
    setFeedback('');
    try {
      const XLSX = await import('xlsx');
      const rows = movies.map((movie) => ({
        Título: exportTitle(movie),
        'Título original': movie.originalTitle,
        Tipo: movie.type === 'movie' ? 'Película' : 'Serie',
        Año: movie.year ?? '',
      }));
      const sheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, 'Títulos');
      XLSX.writeFile(workbook, `titulos-${new Date().toISOString().slice(0, 10)}.xls`, { bookType: 'xls' });
      setFeedback(`Se exportaron ${movies.length} ${movies.length === 1 ? 'título' : 'títulos'} a XLS.`);
    } catch {
      setFeedback('No se pudo generar el archivo XLS. Volvé a intentarlo.');
    } finally {
      setExportingXls(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-ink/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-options-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="movie-detail-modal w-full max-w-lg overflow-hidden rounded-md border border-slate-200 bg-canvas shadow-2xl">
        <header className="flex min-h-16 items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1">
            <h2 id="export-options-title" className="font-bebas text-2xl uppercase tracking-wide text-ink">
              Exportar títulos
            </h2>
            <p className="text-xs text-slate-500">Elegí cómo querés exportar los títulos seleccionados.</p>
          </div>
          <button type="button" onClick={onClose} className="icon-button border-0 shadow-none" title="Cerrar" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="grid gap-3 p-4 sm:p-5">
          <button type="button" onClick={() => void copyToClipboard()} className="secondary-button h-auto min-h-[72px] justify-start gap-4 px-5 text-left text-base">
            <Copy className="h-5 w-5 shrink-0 text-aqua" />
            Exportar títulos al portapapeles
          </button>
          <button type="button" onClick={exportTxt} className="secondary-button h-auto min-h-[72px] justify-start gap-4 px-5 text-left text-base">
            <FileText className="h-5 w-5 shrink-0 text-slate-400" />
            Exportar títulos a TXT
          </button>
          <button type="button" onClick={() => void exportXls()} disabled={exportingXls} className="secondary-button h-auto min-h-[72px] justify-start gap-4 px-5 text-left text-base">
            {exportingXls ? <Loader2 className="h-5 w-5 shrink-0 animate-spin text-emerald-500" /> : <FileSpreadsheet className="h-5 w-5 shrink-0 text-emerald-500" />}
            Exportar títulos a XLS
          </button>

          {feedback && (
            <p className="movie-import-feedback flex items-center gap-2 rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-600" role="status">
              <Check className="h-4 w-4 shrink-0 text-emerald-500" />
              {feedback}
            </p>
          )}
        </div>

        <footer className="flex justify-end border-t border-slate-200 bg-white px-4 py-4 sm:px-5">
          <button type="button" onClick={onClose} className="secondary-button min-w-28">
            Cancelar
          </button>
        </footer>
      </div>
    </div>
  );
};
