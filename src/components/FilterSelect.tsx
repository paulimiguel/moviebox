import { useEffect, useRef, useState } from 'react';
import { Check, ChevronsUpDown, Search, Tv } from 'lucide-react';
import { resolvePlatformLogoUrl } from '@/components/PlatformLogos';

export type FilterSelectOption = { id: string; label: string; icon?: React.ReactNode };

export const FilterSelect = ({ label, placeholder, searchPlaceholder, plural, options, selected, onToggle, align = 'left', compact = false }: {
  label: string;
  placeholder: string;
  searchPlaceholder: string;
  plural: string;
  options: FilterSelectOption[];
  selected: string[];
  onToggle: (id: string) => void;
  align?: 'left' | 'right';
  compact?: boolean;
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    const close = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const visible = options.filter((option) => option.label.toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es')));

  return (
    <div ref={rootRef} className={`relative min-w-0 flex-1 ${open ? 'z-50' : ''}`}>
      <span className="field-label">{label}</span>
      <button type="button" onClick={() => { setSearch(''); setOpen((current) => !current); }} className={`control flex w-full items-center justify-between gap-2 text-left ${compact ? 'h-8 py-0 text-xs' : ''} ${open ? 'border-coral' : ''}`} aria-haspopup="listbox" aria-expanded={open}>
        <span className={`truncate ${selected.length ? 'text-ink' : 'text-slate-400'}`}>{selected.length ? `${selected.length} ${plural.replace('{s}', selected.length > 1 ? 's' : '')}` : placeholder}</span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>
      {open && (
        <div className={`library-toolbar-dropdown absolute ${align === 'right' ? 'right-0 sm:right-auto sm:left-0' : 'left-0'} top-full z-50 mt-1 w-full min-w-[220px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-card`}>
          <label className="relative block border-b border-slate-200">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input autoFocus type="search" value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 w-full pl-9 pr-3 text-sm outline-none" placeholder={searchPlaceholder} />
          </label>
          <div className="max-h-64 overflow-y-auto p-1.5" role="listbox" aria-multiselectable="true">
            {visible.length ? visible.map((option) => {
              const isSelected = selected.includes(option.id);
              return (
                <button key={option.id} type="button" onClick={() => { onToggle(option.id); setOpen(false); }} className={`flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm ${isSelected ? 'bg-mist font-semibold text-ink' : 'text-slate-600 hover:bg-slate-50'}`} role="option" aria-selected={isSelected}>
                  <Check className={`h-4 w-4 shrink-0 ${isSelected ? 'text-coral' : 'text-transparent'}`} />
                  {option.icon}
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                </button>
              );
            }) : <p className="px-3 py-4 text-center text-sm text-slate-400">Sin resultados.</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export const FilterPlatformIcon = ({ name }: { name: string }) => {
  const [failed, setFailed] = useState(false);
  const url = resolvePlatformLogoUrl({ name, logoPath: null });
  if (!url || failed) return <span className="grid h-6 w-8 shrink-0 place-items-center" aria-hidden="true"><Tv className="h-4 w-4 text-aqua" /></span>;
  return <span className="grid h-6 w-8 shrink-0 place-items-center"><img src={url} alt="" className="max-h-6 max-w-8 object-contain" loading="lazy" onError={() => setFailed(true)} /></span>;
};
