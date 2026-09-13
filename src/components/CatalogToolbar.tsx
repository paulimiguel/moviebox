import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Check, ChevronDown, Grid2X2, LayoutGrid, Search } from 'lucide-react';
import type { SortDirection } from '@/types/movie';

export type CatalogViewMode = 'large' | 'medium' | 'small';

interface CatalogToolbarProps {
  title: string;
  itemLabel: string;
  visibleCount: number;
  totalCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  viewMode: CatalogViewMode;
  onViewModeChange: (value: CatalogViewMode) => void;
  sortDirection: SortDirection;
  onSortDirectionChange: (value: SortDirection) => void;
  action?: React.ReactNode;
}

const menuButton = 'library-toolbar-menu-button inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold uppercase text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 xl:w-[150px]';

const viewOptions: Array<{ value: CatalogViewMode; label: string; icon: React.ReactNode }> = [
  { value: 'large', label: 'Iconos grandes', icon: <LayoutGrid className="h-5 w-5" /> },
  { value: 'medium', label: 'Iconos medianos', icon: <LayoutGrid className="h-4 w-4" /> },
  { value: 'small', label: 'Iconos pequeños', icon: <Grid2X2 className="h-4 w-4" /> },
];

export const catalogGridClass: Record<CatalogViewMode, string> = {
  large: 'grid grid-cols-2 gap-3 min-[480px]:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6',
  medium: 'grid grid-cols-2 gap-3 min-[480px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-9',
  small: 'grid grid-cols-3 gap-2 min-[480px]:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12',
};

export const CatalogToolbar = (props: CatalogToolbarProps) => {
  const [openMenu, setOpenMenu] = useState<'view' | 'sort' | null>(null);
  const toolbarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!toolbarRef.current?.contains(event.target as Node)) setOpenMenu(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const activeViewIcon = props.viewMode === 'large'
    ? <LayoutGrid className="h-5 w-5 shrink-0" />
    : props.viewMode === 'medium'
      ? <LayoutGrid className="h-4 w-4 shrink-0" />
      : <Grid2X2 className="h-4 w-4 shrink-0" />;

  return (
    <section ref={toolbarRef} className="library-toolbar sticky top-[72px] z-30 border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto grid max-w-[1500px] gap-3 px-4 py-3 sm:px-6 xl:grid-cols-[300px_minmax(280px,1fr)_auto] xl:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0">
            <h1 className="font-bebas truncate text-2xl font-normal uppercase text-ink">{props.title}</h1>
            <p className="mt-0.5 truncate text-xs text-slate-500">Mostrando {props.visibleCount} de {props.totalCount} {props.itemLabel}</p>
          </div>
          {props.action && <div className="ml-auto shrink-0">{props.action}</div>}
        </div>

        <label className="relative block min-w-0 xl:ml-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="search" value={props.search} onChange={(event) => props.onSearchChange(event.target.value)} className="control w-full pl-9" placeholder="Buscar" />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <button type="button" onClick={() => setOpenMenu(openMenu === 'view' ? null : 'view')} className={menuButton} aria-expanded={openMenu === 'view'}>{activeViewIcon}Ver<ChevronDown className="h-4 w-4 shrink-0" /></button>
            {openMenu === 'view' && <div className="library-toolbar-dropdown absolute right-0 top-10 z-40 w-52 rounded-md border border-slate-200 bg-white p-1.5 shadow-card">
              {viewOptions.map((option) => <button key={option.value} type="button" onClick={() => { props.onViewModeChange(option.value); setOpenMenu(null); }} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${props.viewMode === option.value ? 'bg-mist font-semibold text-ink' : 'text-slate-600 hover:bg-slate-50'}`}>{option.icon}<span className="flex-1">{option.label}</span>{props.viewMode === option.value && <Check className="h-4 w-4 text-coral" />}</button>)}
            </div>}
          </div>
          <div className="relative">
            <button type="button" onClick={() => setOpenMenu(openMenu === 'sort' ? null : 'sort')} className={menuButton} aria-expanded={openMenu === 'sort'}><ArrowUpDown className="h-5 w-5 shrink-0" />Ordenar<ChevronDown className="h-4 w-4 shrink-0" /></button>
            {openMenu === 'sort' && <div className="library-toolbar-dropdown absolute right-0 top-10 z-40 w-56 rounded-md border border-slate-200 bg-white p-1.5 shadow-card">
              <button type="button" onClick={() => { props.onSortDirectionChange('asc'); setOpenMenu(null); }} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${props.sortDirection === 'asc' ? 'bg-mist font-semibold text-ink' : 'text-slate-600 hover:bg-slate-50'}`}><ArrowUp className="h-4 w-4" /><span className="flex-1">Nombre ascendente</span>{props.sortDirection === 'asc' && <Check className="h-4 w-4 text-coral" />}</button>
              <button type="button" onClick={() => { props.onSortDirectionChange('desc'); setOpenMenu(null); }} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${props.sortDirection === 'desc' ? 'bg-mist font-semibold text-ink' : 'text-slate-600 hover:bg-slate-50'}`}><ArrowDown className="h-4 w-4" /><span className="flex-1">Nombre descendente</span>{props.sortDirection === 'desc' && <Check className="h-4 w-4 text-coral" />}</button>
            </div>}
          </div>
        </div>
      </div>
    </section>
  );
};
