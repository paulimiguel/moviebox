import { useEffect, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { resolvePlatformLogoUrl } from '@/components/PlatformLogos';
import { PLATFORM_PREFERENCES } from '@/constants/platformPreferences';
import { useAuth } from '@/contexts/AuthContext';

export const PlatformPreferencesModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { user, updatePreferredPlatforms } = useAuth();
  const [selected, setSelected] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setSelected(user?.preferredPlatforms || []);
    setError('');
  }, [isOpen, user?.preferredPlatforms]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSaving, onClose]);

  if (!isOpen) return null;

  const toggle = (platformId: string) => {
    setSelected((current) => current.includes(platformId)
      ? current.filter((id) => id !== platformId)
      : [...current, platformId]);
  };

  const save = async () => {
    setIsSaving(true);
    setError('');
    try {
      await updatePreferredPlatforms(selected);
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudieron guardar las plataformas');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/55 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSaving) onClose(); }}>
      <section className="movie-detail-modal flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="platform-preferences-title">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <h2 id="platform-preferences-title" className="font-bebas text-2xl uppercase tracking-wide text-ink sm:text-3xl">Plataformas que utilizo</h2>
            <p className="mt-1 text-sm text-slate-500">Elegí las plataformas que querés ver en Novedades.</p>
          </div>
          <button type="button" onClick={onClose} disabled={isSaving} className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-mist hover:text-ink disabled:opacity-50" aria-label="Cerrar"><X className="h-5 w-5" /></button>
        </header>

        <div className="overflow-y-auto p-5 sm:p-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {PLATFORM_PREFERENCES.map((platform) => {
              const checked = selected.includes(platform.id);
              const logoUrl = resolvePlatformLogoUrl({ name: platform.name, logoPath: null });
              return (
                <label key={platform.id} className={`relative flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border p-3 text-center transition ${checked ? 'border-coral bg-coral/5 shadow-sm' : 'border-slate-200 hover:border-slate-300 hover:bg-mist/40'}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggle(platform.id)} className="sr-only" />
                  <span className={`absolute right-2 top-2 grid h-5 w-5 place-items-center rounded border ${checked ? 'border-coral bg-coral text-white' : 'border-slate-300 bg-white'}`} aria-hidden="true">
                    {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  </span>
                  {logoUrl ? <img src={logoUrl} alt="" className="h-12 w-16 object-contain" /> : <span className="grid h-12 w-16 place-items-center rounded bg-slate-800 text-xs font-bold text-white">{platform.name.slice(0, 3)}</span>}
                  <span className="text-xs font-semibold text-ink">{platform.name}</span>
                </label>
              );
            })}
          </div>
          {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 sm:px-6">
          <p className="text-xs text-slate-500">{selected.length} {selected.length === 1 ? 'plataforma seleccionada' : 'plataformas seleccionadas'}</p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} disabled={isSaving} className="secondary-button">Cancelar</button>
            <button type="button" onClick={() => void save()} disabled={isSaving} className="primary-button inline-flex items-center gap-2">
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
};
