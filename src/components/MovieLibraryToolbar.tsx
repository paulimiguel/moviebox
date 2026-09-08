import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Check, ChevronDown, Edit3, Filter, Grid2X2, LayoutGrid, List, ListChecks, Printer, Rows3, Search, Trash2 } from 'lucide-react';
import type { MovieViewMode } from '@/components/MovieCard';
import type { MovieTypeFilter, SortDirection } from '@/types/movie';

export type MovieLibrarySort = 'title' | 'createdAt' | 'year' | 'collection' | 'genre';
export type MovieBulkMode = 'edit' | 'print' | 'delete' | null;

interface ToolbarProps {
  ownerName: string;
  visibleCount: number;
  totalCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  viewMode: MovieViewMode;
  onViewModeChange: (mode: MovieViewMode) => void;
  sortKey: MovieLibrarySort;
  sortDirection: SortDirection;
  onSortChange: (key: MovieLibrarySort) => void;
  filtersOpen: boolean;
  onFiltersToggle: () => void;
  bulkMode: MovieBulkMode;
  onBulkModeChange: (mode: MovieBulkMode) => void;
  genreId: string;
  genres: { id: string; name: string }[];
  onGenreChange: (value: string) => void;
  type: MovieTypeFilter;
  onTypeChange: (value: MovieTypeFilter) => void;
  year: string;
  onYearChange: (value: string) => void;
  onClearFilters: () => void;
}

const menuButton = 'inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 xl:w-auto';

export const MovieLibraryToolbar = (props: ToolbarProps) => {
  const [openMenu, setOpenMenu] = useState<'view' | 'sort' | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!toolbarRef.current?.contains(event.target as Node)) setOpenMenu(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const viewOptions: { value: MovieViewMode; label: string; icon: React.ReactNode }[] = [
    { value: 'row', label: 'Fila', icon: <Rows3 className="h-4 w-4" /> },
    { value: 'medium', label: 'Iconos medianos', icon: <LayoutGrid className="h-4 w-4" /> },
    { value: 'small', label: 'Iconos pequenos', icon: <Grid2X2 className="h-4 w-4" /> },
    { value: 'list', label: 'Lista', icon: <List className="h-4 w-4" /> },
    { value: 'details', label: 'Detalles', icon: <ListChecks className="h-4 w-4" /> },
  ];
  const sortOptions: { value: MovieLibrarySort; label: string }[] = [
    { value: 'title', label: 'Titulo' },
    { value: 'createdAt', label: 'Fecha' },
    { value: 'year', label: 'Ano' },
    { value: 'collection', label: 'Coleccion' },
    { value: 'genre', label: 'Genero' },
  ];

  const toggleBulk = (mode: Exclude<MovieBulkMode, null>) => {
    props.onBulkModeChange(props.bulkMode === mode ? null : mode);
    setOpenMenu(null);
  };

  return (
    <section ref={toolbarRef} className="sticky top-[72px] z-30 border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto grid max-w-[1500px] gap-3 px-4 py-3 sm:px-6 xl:grid-cols-[300px_minmax(280px,1fr)_auto] xl:items-start">
        <div className="min-w-0 self-center">
          <h1 className="font-bebas truncate text-xl font-normal text-ink sm:text-2xl">Movies de {props.ownerName}</h1>
          <p className="mt-0.5 truncate text-xs text-slate-500">Mostrando {props.visibleCount} de {props.totalCount} movies</p>
        </div>

        <label className="relative min-w-0 xl:ml-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="search" value={props.search} onChange={(event) => props.onSearchChange(event.target.value)} className="control w-full pl-9" placeholder="Buscar por nombre" />
        </label>

        <div className="grid grid-cols-3 gap-2 xl:grid-cols-3">
          <div className="relative">
            <button type="button" onClick={() => setOpenMenu(openMenu === 'view' ? null : 'view')} className={menuButton} aria-expanded={openMenu === 'view'}><LayoutGrid className="h-4 w-4" />Ver<ChevronDown className="h-4 w-4" /></button>
            {openMenu === 'view' && <div className="absolute right-0 top-[88px] z-40 w-52 rounded-md border border-slate-200 bg-white p-1.5 shadow-card xl:top-11">{viewOptions.map((option) => <button key={option.value} type="button" onClick={() => { props.onViewModeChange(option.value); setOpenMenu(null); }} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${props.viewMode === option.value ? 'bg-mist font-semibold text-ink' : 'text-slate-600 hover:bg-slate-50'}`}>{option.icon}<span className="flex-1">{option.label}</span>{props.viewMode === option.value && <Check className="h-4 w-4 text-coral" />}</button>)}</div>}
          </div>
          <div className="relative">
            <button type="button" onClick={() => setOpenMenu(openMenu === 'sort' ? null : 'sort')} className={menuButton} aria-expanded={openMenu === 'sort'}><ArrowUpDown className="h-4 w-4" />Ordenar<ChevronDown className="h-4 w-4" /></button>
            {openMenu === 'sort' && <div className="absolute right-0 top-[88px] z-40 w-52 rounded-md border border-slate-200 bg-white p-1.5 shadow-card xl:top-11">{sortOptions.map((option) => { const active = props.sortKey === option.value; return <button key={option.value} type="button" onClick={() => { props.onSortChange(option.value); setOpenMenu(null); }} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${active ? 'bg-mist font-semibold text-ink' : 'text-slate-600 hover:bg-slate-50'}`}><Check className={`h-4 w-4 ${active ? 'text-coral' : 'text-transparent'}`} /><span className="flex-1">{option.label}</span>{active ? (props.sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-30" />}</button>; })}</div>}
          </div>
          <button type="button" onClick={props.onFiltersToggle} className={`${menuButton} ${props.filtersOpen ? 'border-coral bg-red-50 text-coral' : ''}`}><Filter className="h-4 w-4" />Filtrar<ChevronDown className={`h-4 w-4 transition-transform ${props.filtersOpen ? 'rotate-180' : ''}`} /></button>
          <button type="button" onClick={() => toggleBulk('edit')} className={`${menuButton} ${props.bulkMode === 'edit' ? 'border-coral bg-red-50 text-coral' : ''}`}><Edit3 className="h-4 w-4" />Editar<ChevronDown className={`h-4 w-4 transition-transform ${props.bulkMode === 'edit' ? 'rotate-180' : ''}`} /></button>
          <button type="button" onClick={() => toggleBulk('print')} className={`${menuButton} ${props.bulkMode === 'print' ? 'border-coral bg-red-50 text-coral' : ''}`}><Printer className="h-4 w-4" />Imprimir<ChevronDown className={`h-4 w-4 transition-transform ${props.bulkMode === 'print' ? 'rotate-180' : ''}`} /></button>
          <button type="button" onClick={() => toggleBulk('delete')} className={`${menuButton} ${props.bulkMode === 'delete' ? 'border-red-500 bg-red-50 text-red-600' : ''}`}><Trash2 className="h-4 w-4" />Eliminar<ChevronDown className={`h-4 w-4 transition-transform ${props.bulkMode === 'delete' ? 'rotate-180' : ''}`} /></button>
        </div>
      </div>

      {props.filtersOpen && (
        <div className="border-t border-slate-100 bg-canvas">
          <div className="mx-auto grid max-w-[1500px] gap-3 px-4 py-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:px-6">
            <select className="control w-full" value={props.genreId} onChange={(event) => props.onGenreChange(event.target.value)} aria-label="Genero"><option value="">Todos los generos</option>{props.genres.map((genre) => <option key={genre.id} value={genre.id}>{genre.name}</option>)}</select>
            <select className="control w-full" value={props.type} onChange={(event) => props.onTypeChange(event.target.value as MovieTypeFilter)} aria-label="Tipo"><option value="all">Peliculas y series</option><option value="movie">Peliculas</option><option value="series">Series</option></select>
            <input className="control w-full" type="number" min="1888" max="2200" value={props.year} onChange={(event) => props.onYearChange(event.target.value)} placeholder="Ano" aria-label="Ano" />
            <button type="button" onClick={props.onClearFilters} className="secondary-button">Limpiar</button>
          </div>
        </div>
      )}
    </section>
  );
};
