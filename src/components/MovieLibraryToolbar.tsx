import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Bookmark, Check, ChevronDown, ChevronsUpDown, Edit3, Eye, EyeOff, Film, Filter, Grid2X2, Heart, LayoutGrid, List, ListChecks, Search, Tv, X } from 'lucide-react';
import type { MovieViewMode } from '@/components/MovieCard';
import type { FavoriteFilter, MovieTypeFilter, SortDirection, WatchedFilter, WatchlistFilter } from '@/types/movie';

export type MovieLibrarySort = 'title' | 'createdAt' | 'year' | 'collection' | 'genre' | 'imdbRating';
export type MovieBulkMode = 'edit' | 'print' | 'delete' | null;
export type MovieSearchScope = 'name' | 'actor' | 'genre';

interface ToolbarProps {
  title?: string;
  ownerName?: string;
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
  emptyFieldsCount: number;
  onEmptyFieldsSearch: () => void;
  onClearEmptyFields: () => void;
}

const menuButton = 'library-toolbar-menu-button inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold uppercase text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 xl:w-[150px]';
const searchScopeOptions: { value: MovieSearchScope; label: string }[] = [
  { value: 'name', label: 'Nombre' },
  { value: 'actor', label: 'Actor' },
  { value: 'genre', label: 'Género' },
];

export const MovieLibraryToolbar = (props: ToolbarProps) => {
  const [openMenu, setOpenMenu] = useState<'view' | 'sort' | 'genre' | 'platform' | 'actions' | null>(null);
  const [genreSearch, setGenreSearch] = useState('');
  const [platformSearch, setPlatformSearch] = useState('');
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
    { value: 'small', label: 'Iconos pequeños', icon: <Grid2X2 className="h-4 w-4" /> },
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
    { value: 'imdbRating', label: 'Puntuación IMDb' },
  ];
  const filteredGenres = props.genres.filter((genre) =>
    genre.name.toLocaleLowerCase('es').includes(genreSearch.trim().toLocaleLowerCase('es')),
  );
  const filteredPlatforms = props.platforms.filter((platform) =>
    platform.name.toLocaleLowerCase('es').includes(platformSearch.trim().toLocaleLowerCase('es')),
  );
  const selectedGenreNames = props.genres.filter((genre) => props.genreIds.includes(genre.id));
  const selectedPlatformNames = props.platforms.filter((platform) => props.platformIds.includes(platform.id));
  const allFiltersClear = props.genreIds.length === 0
    && props.platformIds.length === 0
    && props.years.length === 0
    && props.type === 'all'
    && props.watched === 'all'
    && props.favorite === 'all'
    && props.watchlist === 'all'
    && props.emptyFieldsCount === 0;
  const filterButtonClass = (active: boolean) => `library-filter-button moviebox-translucent-action inline-flex h-9 w-[104px] items-center justify-center gap-1.5 rounded-md border px-1.5 text-xs font-semibold transition-colors ${active ? 'border-coral bg-coral text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`;
  const quickTypeButtonClass = (active: boolean) => `library-filter-button moviebox-translucent-action inline-flex h-8 min-w-0 items-center justify-center rounded-md border px-1 text-[10px] font-semibold uppercase transition-colors ${active ? 'border-coral bg-coral text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`;
  const toggleGenre = (genreId: string) => {
    props.onGenreChange(
      props.genreIds.includes(genreId)
        ? props.genreIds.filter((id) => id !== genreId)
        : [...props.genreIds, genreId],
    );
  };
  const togglePlatform = (platformId: string) => {
    props.onPlatformChange(
      props.platformIds.includes(platformId)
        ? props.platformIds.filter((id) => id !== platformId)
        : [...props.platformIds, platformId],
    );
  };
  const addYear = () => {
    const value = yearDraft.trim();
    const numericYear = Number(value);
    if (!/^\d{4}$/.test(value) || numericYear < 1888 || numericYear > 2200) return;
    if (!props.years.includes(value)) props.onYearChange([...props.years, value]);
    setYearDraft('');
  };
  const pasteSearch = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim().replace(/\s+/g, ' ');
      if (text) {
        props.onSearchChange(text);
        searchInputRef.current?.focus();
      }
    } catch {
      searchInputRef.current?.focus();
    }
  };

  return (
    <section ref={toolbarRef} className="library-toolbar sticky top-[72px] z-30 border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto grid max-w-[1500px] gap-3 px-4 py-3 sm:px-6 xl:grid-cols-[300px_minmax(280px,1fr)_auto] xl:items-start">
        <div className="min-w-0 self-center">
          <h1 className="font-bebas truncate text-xl font-normal text-ink sm:text-2xl">{props.title || `Títulos de ${props.ownerName}`}</h1>
          <p className="mt-0.5 truncate text-xs text-slate-500">Mostrando {props.visibleCount} de {props.totalCount} títulos</p>
          {(selectedGenreNames.length > 0 || selectedPlatformNames.length > 0 || props.years.length > 0 || props.type !== 'all' || props.watched !== 'all' || props.favorite !== 'all' || props.watchlist !== 'all' || props.emptyFieldsCount > 0) && (
            <div className="mt-2 flex flex-wrap gap-1">
              {selectedGenreNames.map((genre) => <button key={`active-genre-${genre.id}`} type="button" onClick={() => toggleGenre(genre.id)} className="inline-flex max-w-full items-center gap-1 rounded bg-mist px-1.5 py-0.5 text-[11px] font-medium text-slate-600" title={`Quitar género ${genre.name}`}><span className="truncate">{genre.name}</span><X className="h-3 w-3 shrink-0" /></button>)}
              {selectedPlatformNames.map((platform) => <button key={`active-platform-${platform.id}`} type="button" onClick={() => props.onPlatformChange(props.platformIds.filter((id) => id !== platform.id))} className="inline-flex max-w-full items-center gap-1 rounded bg-mist px-1.5 py-0.5 text-[11px] font-medium text-slate-600" title={`Quitar plataforma ${platform.name}`}><span className="truncate">{platform.name}</span><X className="h-3 w-3 shrink-0" /></button>)}
              {props.years.map((year) => <button key={`active-year-${year}`} type="button" onClick={() => props.onYearChange(props.years.filter((value) => value !== year))} className="inline-flex items-center gap-1 rounded bg-mist px-1.5 py-0.5 text-[11px] font-medium text-slate-600" title={`Quitar año ${year}`}>{year}<X className="h-3 w-3" /></button>)}
              {props.type !== 'all' && <button type="button" onClick={() => props.onTypeChange('all')} className="inline-flex items-center gap-1 rounded bg-mist px-1.5 py-0.5 text-[11px] font-medium text-slate-600" title="Quitar filtro de tipo">{props.type === 'movie' ? 'Película' : 'Serie'}<X className="h-3 w-3" /></button>}
              {props.watched !== 'all' && <button type="button" onClick={() => props.onWatchedChange('all')} className="inline-flex items-center gap-1 rounded bg-mist px-1.5 py-0.5 text-[11px] font-medium text-slate-600" title={`Quitar filtro ${props.watched === 'watched' ? 'Watch' : 'No Watch'}`}>{props.watched === 'watched' ? 'Watch' : 'No Watch'}<X className="h-3 w-3" /></button>}
              {props.favorite === 'favorites' && <button type="button" onClick={() => props.onFavoriteChange('all')} className="inline-flex items-center gap-1 rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-coral" title="Quitar filtro Like">Like<X className="h-3 w-3" /></button>}
              {props.watchlist === 'watchlist' && <button type="button" onClick={() => props.onWatchlistChange('all')} className="inline-flex items-center gap-1 rounded bg-mist px-1.5 py-0.5 text-[11px] font-medium text-slate-600" title="Quitar filtro Watchlist">Watchlist<X className="h-3 w-3" /></button>}
              {props.emptyFieldsCount > 0 && <button type="button" onClick={props.onClearEmptyFields} className="inline-flex items-center gap-1 rounded bg-mist px-1.5 py-0.5 text-[11px] font-medium text-slate-600" title="Quitar búsqueda de campos vacíos">Campos vacíos: {props.emptyFieldsCount}<X className="h-3 w-3" /></button>}
              <button type="button" onClick={() => { props.onClearFilters(); setGenreSearch(''); setPlatformSearch(''); setYearDraft(''); setOpenMenu(null); }} className="ml-1 px-1 py-0.5 text-[11px] font-semibold uppercase text-coral hover:underline">Limpiar</button>
            </div>
          )}
        </div>

        <div className="min-w-0 xl:ml-2">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input ref={searchInputRef} type="search" value={props.search} onChange={(event) => props.onSearchChange(event.target.value)} className={`control w-full pl-9 ${props.search ? '' : 'pr-16'}`} placeholder="Buscar" />
            {!props.search && <button type="button" onClick={() => void pasteSearch()} className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase text-slate-600 transition-colors hover:bg-slate-200 hover:text-ink">Pegar</button>}
          </label>
          <div className="search-scope-selector mt-1.5 inline-flex items-center rounded-md border border-slate-200 bg-slate-100 p-0.5" role="radiogroup" aria-label="Campo de búsqueda">
            {searchScopeOptions.map((option) => {
              const active = props.searchScope === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => props.onSearchScopeChange(option.value)}
                  className={`search-scope-option min-w-[62px] rounded px-2 py-1 text-[10px] font-semibold uppercase transition-all ${active ? 'search-scope-option-active bg-coral text-white shadow-sm' : 'text-slate-600 hover:bg-white hover:text-ink'}`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-4">
          <div className="relative">
            <button type="button" onClick={() => setOpenMenu(openMenu === 'view' ? null : 'view')} className={menuButton} aria-expanded={openMenu === 'view'}>{activeViewIcon}Ver<ChevronDown className="h-4 w-4 shrink-0" /></button>
            {openMenu === 'view' && <div className="library-toolbar-dropdown absolute right-0 top-[80px] z-40 w-52 rounded-md border border-slate-200 bg-white p-1.5 shadow-card xl:top-10">{viewOptions.map((option) => <button key={option.value} type="button" onClick={() => { props.onViewModeChange(option.value); setOpenMenu(null); }} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${props.viewMode === option.value ? 'bg-mist font-semibold text-ink' : 'text-slate-600 hover:bg-slate-50'}`}>{option.icon}<span className="flex-1">{option.label}</span>{props.viewMode === option.value && <Check className="h-4 w-4 text-coral" />}</button>)}</div>}
          </div>
          <div className="relative">
            <button type="button" onClick={() => setOpenMenu(openMenu === 'sort' ? null : 'sort')} className={menuButton} aria-expanded={openMenu === 'sort'}><ArrowUpDown className="h-5 w-5 shrink-0" />Ordenar<ChevronDown className="h-4 w-4 shrink-0" /></button>
            {openMenu === 'sort' && <div className="library-toolbar-dropdown absolute right-0 top-[80px] z-40 w-52 rounded-md border border-slate-200 bg-white p-1.5 shadow-card xl:top-10">{sortOptions.map((option) => { const active = props.sortKey === option.value; return <button key={option.value} type="button" onClick={() => { props.onSortChange(option.value); setOpenMenu(null); }} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${active ? 'bg-mist font-semibold text-ink' : 'text-slate-600 hover:bg-slate-50'}`}><Check className={`h-4 w-4 ${active ? 'text-coral' : 'text-transparent'}`} /><span className="flex-1">{option.label}</span>{active ? (props.sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-30" />}</button>; })}</div>}
          </div>
          <button type="button" onClick={() => { setOpenMenu(null); props.onFiltersToggle(); }} className={`${menuButton} ${props.filtersOpen ? 'border-coral bg-red-50 text-coral' : ''}`}><Filter className="h-5 w-5 shrink-0" />Filtrar<ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${props.filtersOpen ? 'rotate-180' : ''}`} /></button>
          <div className="relative">
            <button type="button" onClick={() => setOpenMenu(openMenu === 'actions' ? null : 'actions')} className={`${menuButton} ${props.emptyFieldsCount ? 'border-coral bg-red-50 text-coral' : ''}`} aria-expanded={openMenu === 'actions'}><ListChecks className="h-5 w-5 shrink-0" />Acciones<ChevronDown className="h-4 w-4 shrink-0" /></button>
            {openMenu === 'actions' && <div className="library-toolbar-dropdown absolute right-0 top-[80px] z-40 w-64 rounded-md border border-slate-200 bg-white p-1.5 shadow-card xl:top-10">
              <button type="button" onClick={() => { setOpenMenu(null); props.onBulkModeChange('edit'); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"><Edit3 className="h-4 w-4" />Editar campos comunes</button>
              <button type="button" onClick={() => { setOpenMenu(null); props.onEmptyFieldsSearch(); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"><Search className="h-4 w-4" />Buscar campos vacíos</button>
            </div>}
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <button type="button" aria-pressed={props.type === 'movie'} onClick={() => { setOpenMenu(null); props.onTypeChange(props.type === 'movie' ? 'all' : 'movie'); }} className={quickTypeButtonClass(props.type === 'movie')}>Películas</button>
              <button type="button" aria-pressed={props.type === 'series'} onClick={() => { setOpenMenu(null); props.onTypeChange(props.type === 'series' ? 'all' : 'series'); }} className={quickTypeButtonClass(props.type === 'series')}>Series</button>
            </div>
          </div>
        </div>
      </div>

      {props.filtersOpen && (
        <div className="relative border-t border-slate-100 bg-canvas">
          <button type="button" onClick={() => { setGenreSearch(''); setPlatformSearch(''); setOpenMenu(null); props.onFiltersToggle(); }} className="absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-slate-200 hover:text-ink" title="Cerrar filtros" aria-label="Cerrar filtros"><X className="h-4 w-4" /></button>
          <div className="mx-auto grid max-w-[1500px] gap-4 px-4 py-4 pr-11 sm:px-6 sm:pr-12 xl:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_130px] xl:items-start 2xl:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_110px_auto]">
            <div className="relative">
              <span className="field-label">Género</span>
              <button type="button" onClick={() => { setGenreSearch(''); setOpenMenu(openMenu === 'genre' ? null : 'genre'); }} className={`control flex w-full items-center justify-between gap-2 text-left ${openMenu === 'genre' ? 'border-coral' : ''}`} aria-haspopup="listbox" aria-expanded={openMenu === 'genre'}>
                <span className={`truncate ${props.genreIds.length ? 'text-ink' : 'text-slate-400'}`}>{props.genreIds.length ? `${props.genreIds.length} seleccionado${props.genreIds.length > 1 ? 's' : ''}` : 'Filtrar por género'}</span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
              </button>
              {openMenu === 'genre' && (
                <div className="library-toolbar-dropdown absolute left-0 top-full z-50 mt-1 w-full min-w-[280px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-card">
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

            <div className="relative">
              <span className="field-label">Plataforma</span>
              <button type="button" onClick={() => { setPlatformSearch(''); setOpenMenu(openMenu === 'platform' ? null : 'platform'); }} className={`control flex w-full items-center justify-between gap-2 text-left ${openMenu === 'platform' ? 'border-coral' : ''}`} aria-haspopup="listbox" aria-expanded={openMenu === 'platform'}>
                <span className={`truncate ${props.platformIds.length ? 'text-ink' : 'text-slate-400'}`}>{props.platformIds.length ? `${props.platformIds.length} seleccionada${props.platformIds.length > 1 ? 's' : ''}` : 'Filtrar por plataforma'}</span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
              </button>
              {openMenu === 'platform' && (
                <div className="library-toolbar-dropdown absolute left-0 top-full z-50 mt-1 w-full min-w-[220px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-card">
                  <label className="relative block border-b border-slate-200">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input autoFocus type="search" value={platformSearch} onChange={(event) => setPlatformSearch(event.target.value)} className="h-11 w-full pl-9 pr-3 text-sm outline-none" placeholder="Buscar plataforma..." />
                  </label>
                  <div className="max-h-64 overflow-y-auto p-1.5" role="listbox" aria-multiselectable="true">
                    {filteredPlatforms.length ? filteredPlatforms.map((platform) => {
                      const selected = props.platformIds.includes(platform.id);
                      return <button key={platform.id} type="button" onClick={() => togglePlatform(platform.id)} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${selected ? 'bg-mist font-semibold text-ink' : 'text-slate-600 hover:bg-slate-50'}`} role="option" aria-selected={selected}><Check className={`h-4 w-4 shrink-0 ${selected ? 'text-coral' : 'text-transparent'}`} /><span className="min-w-0 flex-1 truncate">{platform.name}</span></button>;
                    }) : <p className="px-3 py-4 text-center text-sm text-slate-400">Sin resultados.</p>}
                  </div>
                </div>
              )}
              {selectedPlatformNames.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{selectedPlatformNames.map((platform) => <button key={platform.id} type="button" onClick={() => togglePlatform(platform.id)} className="inline-flex items-center gap-1 rounded bg-mist px-2 py-1 text-xs font-medium text-slate-600" title={`Quitar ${platform.name}`}>{platform.name}<X className="h-3 w-3" /></button>)}</div>}
            </div>

            <div>
              <label htmlFor="movie-year-filter" className="field-label">Año</label>
              <input id="movie-year-filter" className="control w-full" type="text" inputMode="numeric" value={yearDraft} onChange={(event) => setYearDraft(event.target.value.replace(/\D/g, '').slice(0, 4))} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addYear(); } }} placeholder="Escribir y Enter" aria-label="Agregar año" />
              {props.years.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{props.years.map((year) => <button key={year} type="button" onClick={() => props.onYearChange(props.years.filter((value) => value !== year))} className="inline-flex items-center gap-1 rounded bg-mist px-2 py-1 text-xs font-medium text-slate-600" title={`Quitar ${year}`}>{year}<X className="h-3 w-3" /></button>)}</div>}
            </div>

            <div className="flex flex-wrap gap-2 xl:col-span-3 2xl:col-span-1 2xl:flex-nowrap 2xl:pt-[22px]">
              <button type="button" aria-pressed={props.type === 'movie'} onClick={() => props.onTypeChange(props.type === 'movie' ? 'all' : 'movie')} className={filterButtonClass(props.type === 'movie')}><Film className="h-4 w-4" />Película</button>
              <button type="button" aria-pressed={props.type === 'series'} onClick={() => props.onTypeChange(props.type === 'series' ? 'all' : 'series')} className={filterButtonClass(props.type === 'series')}><Tv className="h-4 w-4" />Serie</button>
              <button type="button" aria-pressed={props.watched === 'watched'} onClick={() => props.onWatchedChange(props.watched === 'watched' ? 'all' : 'watched')} className={filterButtonClass(props.watched === 'watched')}><Eye className="h-4 w-4" />Watch</button>
              <button type="button" aria-pressed={props.watched === 'unwatched'} onClick={() => props.onWatchedChange(props.watched === 'unwatched' ? 'all' : 'unwatched')} className={filterButtonClass(props.watched === 'unwatched')}><EyeOff className="h-4 w-4" />No Watch</button>
              <button type="button" aria-pressed={props.favorite === 'favorites'} onClick={() => props.onFavoriteChange(props.favorite === 'favorites' ? 'all' : 'favorites')} className={filterButtonClass(props.favorite === 'favorites')}><Heart className={`h-4 w-4 ${props.favorite === 'favorites' ? 'fill-current' : ''}`} />Like</button>
              <button type="button" aria-pressed={props.watchlist === 'watchlist'} onClick={() => props.onWatchlistChange(props.watchlist === 'watchlist' ? 'all' : 'watchlist')} className={filterButtonClass(props.watchlist === 'watchlist')}><Bookmark className={`h-4 w-4 ${props.watchlist === 'watchlist' ? 'fill-current' : ''}`} />Watchlist</button>
              <button type="button" aria-pressed={allFiltersClear} onClick={() => { props.onClearFilters(); setGenreSearch(''); setPlatformSearch(''); setYearDraft(''); setOpenMenu(null); }} className={filterButtonClass(allFiltersClear)}>Todos</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
