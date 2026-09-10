import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Bookmark, Check, ChevronDown, ChevronsUpDown, Eye, EyeOff, Film, Filter, Grid2X2, Heart, LayoutGrid, List, ListChecks, Search, Tv, X } from 'lucide-react';
import type { MovieViewMode } from '@/components/MovieCard';
import type { FavoriteFilter, MovieTypeFilter, SortDirection, WatchedFilter, WatchlistFilter } from '@/types/movie';

export type MovieLibrarySort = 'title' | 'createdAt' | 'year' | 'collection' | 'genre';
export type MovieBulkMode = 'edit' | 'print' | 'delete' | null;
export type MovieSearchScope = 'name' | 'actor' | 'genre';

interface ToolbarProps {
  ownerName: string;
  visibleCount: number;
  totalCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  searchScope: MovieSearchScope;
  onSearchScopeChange: (value: MovieSearchScope) => void;
  viewMode: MovieViewMode;
  onViewModeChange: (mode: MovieViewMode) => void;
  sortKey: MovieLibrarySort;
  sortDirection: SortDirection;
  onSortChange: (key: MovieLibrarySort) => void;
  filtersOpen: boolean;
  onFiltersToggle: () => void;
  bulkMode: MovieBulkMode;
  onBulkModeChange: (mode: MovieBulkMode) => void;
  genreIds: string[];
  genres: { id: string; name: string }[];
  onGenreChange: (value: string[]) => void;
  platformIds: string[];
  platforms: { id: string; name: string }[];
  onPlatformChange: (value: string[]) => void;
  type: MovieTypeFilter;
  onTypeChange: (value: MovieTypeFilter) => void;
  watched: WatchedFilter;
  onWatchedChange: (value: WatchedFilter) => void;
  favorite: FavoriteFilter;
  onFavoriteChange: (value: FavoriteFilter) => void;
  watchlist: WatchlistFilter;
  onWatchlistChange: (value: WatchlistFilter) => void;
  years: string[];
  onYearChange: (value: string[]) => void;
  onClearFilters: () => void;
}

const menuButton = 'inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold uppercase text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 xl:w-[150px]';

export const MovieLibraryToolbar = (props: ToolbarProps) => {
  const [openMenu, setOpenMenu] = useState<'view' | 'sort' | 'genre' | null>(null);
  const [genreSearch, setGenreSearch] = useState('');
  const [yearDraft, setYearDraft] = useState('');
  const toolbarRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!toolbarRef.current?.contains(event.target as Node)) setOpenMenu(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    const focusSearch = () => {
      searchInputRef.current?.focus();
      try {
        window.sessionStorage.removeItem('moviebox:focus-search');
      } catch {
        // The field was still focused even if storage is unavailable.
      }
    };
    window.addEventListener('moviebox:focus-search', focusSearch);
    try {
      if (window.sessionStorage.getItem('moviebox:focus-search')) {
        window.requestAnimationFrame(focusSearch);
      }
    } catch {
      // Direct navigation still leaves the search field available.
    }
    return () => window.removeEventListener('moviebox:focus-search', focusSearch);
  }, []);

  const viewOptions: { value: MovieViewMode; label: string; icon: React.ReactNode }[] = [
    { value: 'medium', label: 'Iconos grandes', icon: <LayoutGrid className="h-4 w-4" /> },
    { value: 'mediumIcons', label: 'Iconos medianos', icon: <LayoutGrid className="h-3.5 w-3.5" /> },
    { value: 'small', label: 'Iconos pequenos', icon: <Grid2X2 className="h-4 w-4" /> },
    { value: 'list', label: 'Lista', icon: <List className="h-4 w-4" /> },
    { value: 'details', label: 'Detalles', icon: <ListChecks className="h-4 w-4" /> },
  ];
  const activeViewIcon = props.viewMode === 'medium'
    ? <LayoutGrid className="h-5 w-5 shrink-0" />
    : props.viewMode === 'mediumIcons'
      ? <LayoutGrid className="h-4 w-4 shrink-0" />
    : props.viewMode === 'small'
      ? <Grid2X2 className="h-5 w-5 shrink-0" />
      : props.viewMode === 'list'
        ? <List className="h-5 w-5 shrink-0" />
        : <ListChecks className="h-5 w-5 shrink-0" />;
  const sortOptions: { value: MovieLibrarySort; label: string }[] = [
    { value: 'title', label: 'Título' },
    { value: 'createdAt', label: 'Fecha' },
    { value: 'year', label: 'Año' },
    { value: 'collection', label: 'Colección' },
    { value: 'genre', label: 'Género' },
  ];
  const filteredGenres = props.genres.filter((genre) =>
    genre.name.toLocaleLowerCase('es').includes(genreSearch.trim().toLocaleLowerCase('es')),
  );
  const selectedGenreNames = props.genres.filter((genre) => props.genreIds.includes(genre.id));
  const selectedPlatformNames = props.platforms.filter((platform) => props.platformIds.includes(platform.id));
  const toggleGenre = (genreId: string) => {
    props.onGenreChange(
      props.genreIds.includes(genreId)
        ? props.genreIds.filter((id) => id !== genreId)
        : [...props.genreIds, genreId],
    );
  };
  const addYear = () => {
    const value = yearDraft.trim();
    const numericYear = Number(value);
    if (!/^\d{4}$/.test(value) || numericYear < 1888 || numericYear > 2200) return;
    if (!props.years.includes(value)) props.onYearChange([...props.years, value]);
    setYearDraft('');
  };

  return (
    <section ref={toolbarRef} className="sticky top-[72px] z-30 border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto grid max-w-[1500px] gap-3 px-4 py-3 sm:px-6 xl:grid-cols-[300px_minmax(280px,1fr)_auto] xl:items-start">
        <div className="min-w-0 self-center">
          <h1 className="font-bebas truncate text-xl font-normal text-ink sm:text-2xl">Títulos de {props.ownerName}</h1>
          <p className="mt-0.5 truncate text-xs text-slate-500">Mostrando {props.visibleCount} de {props.totalCount} movies</p>
          {(selectedGenreNames.length > 0 || selectedPlatformNames.length > 0 || props.years.length > 0 || props.type !== 'all' || props.watched !== 'all' || props.favorite !== 'all' || props.watchlist !== 'all') && (
            <div className="mt-2 flex flex-wrap gap-1">
              {selectedGenreNames.map((genre) => <button key={`active-genre-${genre.id}`} type="button" onClick={() => toggleGenre(genre.id)} className="inline-flex max-w-full items-center gap-1 rounded bg-mist px-1.5 py-0.5 text-[11px] font-medium text-slate-600" title={`Quitar género ${genre.name}`}><span className="truncate">{genre.name}</span><X className="h-3 w-3 shrink-0" /></button>)}
              {selectedPlatformNames.map((platform) => <button key={`active-platform-${platform.id}`} type="button" onClick={() => props.onPlatformChange(props.platformIds.filter((id) => id !== platform.id))} className="inline-flex max-w-full items-center gap-1 rounded bg-mist px-1.5 py-0.5 text-[11px] font-medium text-slate-600" title={`Quitar plataforma ${platform.name}`}><span className="truncate">{platform.name}</span><X className="h-3 w-3 shrink-0" /></button>)}
              {props.years.map((year) => <button key={`active-year-${year}`} type="button" onClick={() => props.onYearChange(props.years.filter((value) => value !== year))} className="inline-flex items-center gap-1 rounded bg-mist px-1.5 py-0.5 text-[11px] font-medium text-slate-600" title={`Quitar año ${year}`}>{year}<X className="h-3 w-3" /></button>)}
              {props.type !== 'all' && <button type="button" onClick={() => props.onTypeChange('all')} className="inline-flex items-center gap-1 rounded bg-mist px-1.5 py-0.5 text-[11px] font-medium text-slate-600" title="Quitar filtro de tipo">{props.type === 'movie' ? 'Película' : 'Serie'}<X className="h-3 w-3" /></button>}
              {props.watched !== 'all' && <button type="button" onClick={() => props.onWatchedChange('all')} className="inline-flex items-center gap-1 rounded bg-mist px-1.5 py-0.5 text-[11px] font-medium text-slate-600" title="Quitar filtro de visualización">{props.watched === 'watched' ? 'Vista' : 'No vista'}<X className="h-3 w-3" /></button>}
              {props.favorite === 'favorites' && <button type="button" onClick={() => props.onFavoriteChange('all')} className="inline-flex items-center gap-1 rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-coral" title="Quitar filtro Like">Like<X className="h-3 w-3" /></button>}
              {props.watchlist === 'watchlist' && <button type="button" onClick={() => props.onWatchlistChange('all')} className="inline-flex items-center gap-1 rounded bg-mist px-1.5 py-0.5 text-[11px] font-medium text-slate-600" title="Quitar filtro Watchlist">Watchlist<X className="h-3 w-3" /></button>}
              <button type="button" onClick={() => { props.onClearFilters(); setGenreSearch(''); setYearDraft(''); setOpenMenu(null); }} className="ml-1 px-1 py-0.5 text-[11px] font-semibold uppercase text-coral hover:underline">Limpiar</button>
            </div>
          )}
        </div>

        <div className="min-w-0 xl:ml-2">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input ref={searchInputRef} type="search" value={props.search} onChange={(event) => props.onSearchChange(event.target.value)} className="control w-full pl-9" placeholder="Buscar" />
          </label>
          <div className="mt-2.5 flex items-center gap-3 pl-2" role="radiogroup" aria-label="Campo de búsqueda">
            <label className="flex cursor-pointer items-center gap-1.5 text-xs leading-none text-slate-600"><input type="radio" name="movie-search-scope" value="name" checked={props.searchScope === 'name'} onChange={() => props.onSearchScopeChange('name')} className="h-3.5 w-3.5 accent-coral" />Nombre</label>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs leading-none text-slate-600"><input type="radio" name="movie-search-scope" value="actor" checked={props.searchScope === 'actor'} onChange={() => props.onSearchScopeChange('actor')} className="h-3.5 w-3.5 accent-coral" />Actor</label>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs leading-none text-slate-600"><input type="radio" name="movie-search-scope" value="genre" checked={props.searchScope === 'genre'} onChange={() => props.onSearchScopeChange('genre')} className="h-3.5 w-3.5 accent-coral" />Género</label>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 xl:grid-cols-3">
          <div className="relative">
            <button type="button" onClick={() => setOpenMenu(openMenu === 'view' ? null : 'view')} className={menuButton} aria-expanded={openMenu === 'view'}>{activeViewIcon}Ver<ChevronDown className="h-4 w-4 shrink-0" /></button>
            {openMenu === 'view' && <div className="absolute right-0 top-[80px] z-40 w-52 rounded-md border border-slate-200 bg-white p-1.5 shadow-card xl:top-10">{viewOptions.map((option) => <button key={option.value} type="button" onClick={() => { props.onViewModeChange(option.value); setOpenMenu(null); }} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${props.viewMode === option.value ? 'bg-mist font-semibold text-ink' : 'text-slate-600 hover:bg-slate-50'}`}>{option.icon}<span className="flex-1">{option.label}</span>{props.viewMode === option.value && <Check className="h-4 w-4 text-coral" />}</button>)}</div>}
          </div>
          <div className="relative">
            <button type="button" onClick={() => setOpenMenu(openMenu === 'sort' ? null : 'sort')} className={menuButton} aria-expanded={openMenu === 'sort'}><ArrowUpDown className="h-5 w-5 shrink-0" />Ordenar<ChevronDown className="h-4 w-4 shrink-0" /></button>
            {openMenu === 'sort' && <div className="absolute right-0 top-[80px] z-40 w-52 rounded-md border border-slate-200 bg-white p-1.5 shadow-card xl:top-10">{sortOptions.map((option) => { const active = props.sortKey === option.value; return <button key={option.value} type="button" onClick={() => { props.onSortChange(option.value); setOpenMenu(null); }} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${active ? 'bg-mist font-semibold text-ink' : 'text-slate-600 hover:bg-slate-50'}`}><Check className={`h-4 w-4 ${active ? 'text-coral' : 'text-transparent'}`} /><span className="flex-1">{option.label}</span>{active ? (props.sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-30" />}</button>; })}</div>}
          </div>
          <button type="button" onClick={() => { setOpenMenu(null); props.onFiltersToggle(); }} className={`${menuButton} ${props.filtersOpen ? 'border-coral bg-red-50 text-coral' : ''}`}><Filter className="h-5 w-5 shrink-0" />Filtrar<ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${props.filtersOpen ? 'rotate-180' : ''}`} /></button>
        </div>
      </div>

      {props.filtersOpen && (
        <div className="relative border-t border-slate-100 bg-canvas">
          <button type="button" onClick={() => { setGenreSearch(''); setOpenMenu(null); props.onFiltersToggle(); }} className="absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-slate-200 hover:text-ink" title="Cerrar filtros" aria-label="Cerrar filtros"><X className="h-4 w-4" /></button>
          <div className="mx-auto grid max-w-[1500px] gap-4 px-4 py-4 pr-11 sm:px-6 sm:pr-12 xl:grid-cols-[minmax(280px,1fr)_150px_minmax(420px,auto)_auto] xl:items-start">
            <div className="relative">
              <span className="field-label">Género</span>
              <button type="button" onClick={() => { setGenreSearch(''); setOpenMenu(openMenu === 'genre' ? null : 'genre'); }} className={`control flex w-full items-center justify-between gap-2 text-left ${openMenu === 'genre' ? 'border-coral' : ''}`} aria-haspopup="listbox" aria-expanded={openMenu === 'genre'}>
                <span className={`truncate ${props.genreIds.length ? 'text-ink' : 'text-slate-400'}`}>{props.genreIds.length ? `${props.genreIds.length} seleccionado${props.genreIds.length > 1 ? 's' : ''}` : 'Filtrar por género'}</span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
              </button>
              {openMenu === 'genre' && (
                <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[280px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-card">
                  <label className="relative block border-b border-slate-200">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input autoFocus type="search" value={genreSearch} onChange={(event) => setGenreSearch(event.target.value)} className="h-11 w-full pl-9 pr-3 text-sm outline-none" placeholder="Buscar género..." />
                  </label>
                  <div className="max-h-64 overflow-y-auto p-1.5" role="listbox" aria-multiselectable="true">
                    {filteredGenres.length ? filteredGenres.map((genre) => {
                      const selected = props.genreIds.includes(genre.id);
                      return <button key={genre.id} type="button" onClick={() => toggleGenre(genre.id)} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${selected ? 'bg-mist font-semibold text-ink' : 'text-slate-600 hover:bg-slate-50'}`} role="option" aria-selected={selected}><Check className={`h-4 w-4 shrink-0 ${selected ? 'text-coral' : 'text-transparent'}`} /><span className="min-w-0 flex-1 truncate">{genre.name}</span></button>;
                    }) : <p className="px-3 py-4 text-center text-sm text-slate-400">Sin resultados.</p>}
                  </div>
                </div>
              )}
              {selectedGenreNames.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{selectedGenreNames.map((genre) => <button key={genre.id} type="button" onClick={() => toggleGenre(genre.id)} className="inline-flex items-center gap-1 rounded bg-mist px-2 py-1 text-xs font-medium text-slate-600" title={`Quitar ${genre.name}`}>{genre.name}<X className="h-3 w-3" /></button>)}</div>}
            </div>

            <div>
              <label htmlFor="movie-year-filter" className="field-label">Año</label>
              <input id="movie-year-filter" className="control w-full" type="text" inputMode="numeric" value={yearDraft} onChange={(event) => setYearDraft(event.target.value.replace(/\D/g, '').slice(0, 4))} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addYear(); } }} placeholder="Escribir y Enter" aria-label="Agregar año" />
              {props.years.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{props.years.map((year) => <button key={year} type="button" onClick={() => props.onYearChange(props.years.filter((value) => value !== year))} className="inline-flex items-center gap-1 rounded bg-mist px-2 py-1 text-xs font-medium text-slate-600" title={`Quitar ${year}`}>{year}<X className="h-3 w-3" /></button>)}</div>}
            </div>

            <div className="flex flex-wrap gap-2 xl:pt-[22px]">
              <button type="button" onClick={() => props.onTypeChange(props.type === 'movie' ? 'all' : 'movie')} className={`inline-flex h-10 items-center gap-1.5 rounded-md border px-3 text-sm font-semibold transition-colors ${props.type === 'movie' ? 'border-coral bg-coral text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}><Film className="h-4 w-4" />Película</button>
              <button type="button" onClick={() => props.onTypeChange(props.type === 'series' ? 'all' : 'series')} className={`inline-flex h-10 items-center gap-1.5 rounded-md border px-3 text-sm font-semibold transition-colors ${props.type === 'series' ? 'border-coral bg-coral text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}><Tv className="h-4 w-4" />Serie</button>
              <button type="button" onClick={() => props.onWatchedChange(props.watched === 'watched' ? 'all' : 'watched')} className={`inline-flex h-10 items-center gap-1.5 rounded-md border px-3 text-sm font-semibold transition-colors ${props.watched === 'watched' ? 'border-coral bg-coral text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}><Eye className="h-4 w-4" />Vista</button>
              <button type="button" onClick={() => props.onWatchedChange(props.watched === 'unwatched' ? 'all' : 'unwatched')} className={`inline-flex h-10 items-center gap-1.5 rounded-md border px-3 text-sm font-semibold transition-colors ${props.watched === 'unwatched' ? 'border-coral bg-coral text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}><EyeOff className="h-4 w-4" />No vista</button>
              <button type="button" onClick={() => props.onFavoriteChange(props.favorite === 'favorites' ? 'all' : 'favorites')} className={`inline-flex h-10 items-center gap-1.5 rounded-md border px-3 text-sm font-semibold transition-colors ${props.favorite === 'favorites' ? 'border-coral bg-coral text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}><Heart className={`h-4 w-4 ${props.favorite === 'favorites' ? 'fill-current' : ''}`} />Like</button>
              <button type="button" onClick={() => props.onWatchlistChange(props.watchlist === 'watchlist' ? 'all' : 'watchlist')} className={`inline-flex h-10 items-center gap-1.5 rounded-md border px-3 text-sm font-semibold transition-colors ${props.watchlist === 'watchlist' ? 'border-aqua bg-aqua text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}><Bookmark className={`h-4 w-4 ${props.watchlist === 'watchlist' ? 'fill-current' : ''}`} />Watchlist</button>
            </div>

            <button type="button" onClick={() => { props.onClearFilters(); setGenreSearch(''); setYearDraft(''); setOpenMenu(null); }} className="secondary-button h-10 xl:mt-[22px]">Limpiar</button>
          </div>
        </div>
      )}
    </section>
  );
};
