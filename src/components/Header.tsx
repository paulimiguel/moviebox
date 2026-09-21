import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bookmark, ChevronDown, Eye, EyeOff, Film, Heart, LayoutGrid, LogOut, Moon, Sun, Tv } from 'lucide-react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';
import { AddMovieModal } from '@/components/AddMovieModal';

type LibraryFilterPreset = 'all' | 'movie' | 'series' | 'watchlist' | 'favorite' | 'watched' | 'unwatched';

const libraryOptions: Array<{ label: string; preset: LibraryFilterPreset; icon: React.ReactNode }> = [
  { label: 'Todos los títulos', preset: 'all', icon: <LayoutGrid className="h-4 w-4" /> },
  { label: 'Películas', preset: 'movie', icon: <Film className="h-4 w-4" /> },
  { label: 'Series', preset: 'series', icon: <Tv className="h-4 w-4" /> },
  { label: 'Watchlist', preset: 'watchlist', icon: <Bookmark className="h-4 w-4" /> },
  { label: 'Like', preset: 'favorite', icon: <Heart className="h-4 w-4" /> },
  { label: 'Watched', preset: 'watched', icon: <Eye className="h-4 w-4" /> },
  { label: 'Unwatched', preset: 'unwatched', icon: <EyeOff className="h-4 w-4" /> },
];

export const Header = () => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [addModalOpen, setAddModalOpen] = useState(searchParams.get('agregar') === '1');
  const [libraryMenuOpen, setLibraryMenuOpen] = useState(false);
  const [collectionMenuOpen, setCollectionMenuOpen] = useState(false);
  const [platformMenuOpen, setPlatformMenuOpen] = useState(false);
  const [genreMenuOpen, setGenreMenuOpen] = useState(false);
  const [newsMenuOpen, setNewsMenuOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profilePhotoFailed, setProfilePhotoFailed] = useState(false);

  useEffect(() => {
    if (searchParams.get('agregar') === '1') {
      setAddModalOpen(true);
    }
  }, [searchParams]);

  const handleCloseAddModal = () => {
    setAddModalOpen(false);
    if (searchParams.get('agregar') === '1') {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('agregar');
      setSearchParams(nextParams, { replace: true });
    }
  };
  const libraryMenuRef = useRef<HTMLDivElement>(null);
  const collectionMenuRef = useRef<HTMLDivElement>(null);
  const platformMenuRef = useRef<HTMLDivElement>(null);
  const genreMenuRef = useRef<HTMLDivElement>(null);
  const newsMenuRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const metadataQuery = useQuery({ queryKey: ['metadata'], queryFn: api.metadata.getAll });
  const collectionsQuery = useQuery({ queryKey: ['collections'], queryFn: api.collections.getAll });

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!libraryMenuRef.current?.contains(event.target as Node)) setLibraryMenuOpen(false);
      if (!collectionMenuRef.current?.contains(event.target as Node)) setCollectionMenuOpen(false);
      if (!platformMenuRef.current?.contains(event.target as Node)) setPlatformMenuOpen(false);
      if (!genreMenuRef.current?.contains(event.target as Node)) setGenreMenuOpen(false);
      if (!newsMenuRef.current?.contains(event.target as Node)) setNewsMenuOpen(false);
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    setProfilePhotoFailed(false);
  }, [user?.profilePhoto]);

  const initials = (user?.name || 'U')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toLocaleUpperCase();
  const filterLibrary = (preset: LibraryFilterPreset) => {
    try {
      window.sessionStorage.setItem('moviebox:library-filter', preset);
      window.sessionStorage.removeItem('moviebox:genre-filter');
      window.sessionStorage.removeItem('moviebox:platform-filter');
    } catch {
      // The event below still applies the filter when already in the library.
    }
    setLibraryMenuOpen(false);
    setMenuOpen(false);
    navigate('/');
    window.setTimeout(() => window.dispatchEvent(new CustomEvent('moviebox:filter-library', { detail: preset })), 0);
  };
  const filterLibraryByGenre = (genreId: string) => {
    try {
      window.sessionStorage.setItem('moviebox:genre-filter', genreId);
      window.sessionStorage.removeItem('moviebox:library-filter');
    } catch {
      // The event below still applies the filter when already in the library.
    }
    setGenreMenuOpen(false);
    setMenuOpen(false);
    navigate('/');
    window.setTimeout(() => window.dispatchEvent(new CustomEvent('moviebox:filter-genre', { detail: genreId })), 0);
  };
  const filterLibraryByPlatform = (platformId: string) => {
    try {
      window.sessionStorage.setItem('moviebox:platform-filter', platformId);
      window.sessionStorage.removeItem('moviebox:library-filter');
    } catch {
      // The event below still applies the filter when already in the library.
    }
    setPlatformMenuOpen(false);
    setMenuOpen(false);
    navigate('/');
    window.setTimeout(() => window.dispatchEvent(new CustomEvent('moviebox:filter-platform', { detail: platformId })), 0);
  };

  const navigateToNewsSection = (sectionId: string) => {
    setNewsMenuOpen(false);
    setMenuOpen(false);
    if (location.pathname === '/novedades') {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
      window.history.replaceState(null, '', `/novedades#${sectionId}`);
    } else {
      navigate(`/novedades#${sectionId}`);
    }
  };

  return (
    <>
      <header className="moviebox-header sticky top-0 z-40 border-b border-slate-200 bg-canvas/95 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-[1500px] items-center gap-5 px-4 sm:px-6">
        <Link to="/" className="shrink-0"><img src={theme === 'dark' ? '/moviebox-logo-white.png' : '/moviebox-logo-red.png'} alt="MovieBox" className="h-10 w-auto max-w-[190px] object-contain sm:h-11" /></Link>
        <div className="ml-auto flex h-full min-w-0 items-center gap-2 sm:gap-4">
          <nav className="main-navigation hidden h-full items-end xl:flex">
            <div ref={libraryMenuRef} className="relative h-full" onMouseEnter={() => setLibraryMenuOpen(true)} onMouseLeave={() => setLibraryMenuOpen(false)}>
              <button type="button" onClick={() => { filterLibrary('all'); setPlatformMenuOpen(false); setGenreMenuOpen(false); setCollectionMenuOpen(false); setNewsMenuOpen(false); }} className={`flex h-full items-center gap-1.5 border-b-2 px-3 text-sm font-semibold ${libraryMenuOpen || location.pathname === '/' ? 'border-coral text-ink' : 'border-transparent text-slate-500 hover:text-ink'}`} aria-expanded={libraryMenuOpen}>BIBLIOTECA<ChevronDown className="h-4 w-4" /></button>
              {libraryMenuOpen && <div className="header-dropdown absolute left-0 top-full w-52 rounded-b-md border border-t-0 border-slate-200 bg-white p-1.5 shadow-card">
                {libraryOptions.map((option) => <button key={option.preset} type="button" onClick={() => filterLibrary(option.preset)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-ink">{option.icon}<span>{option.label}</span></button>)}
              </div>}
            </div>
            <div ref={newsMenuRef} className="relative h-full" onMouseEnter={() => setNewsMenuOpen(true)} onMouseLeave={() => setNewsMenuOpen(false)}>
              <button
                type="button"
                onClick={() => {
                  setNewsMenuOpen((current) => !current);
                  setLibraryMenuOpen(false);
                  setPlatformMenuOpen(false);
                  setGenreMenuOpen(false);
                  setCollectionMenuOpen(false);
                  if (location.pathname !== '/novedades') {
                    navigate('/novedades');
                  }
                }}
                className={`flex h-full items-center gap-1.5 border-b-2 px-3 text-sm font-semibold ${newsMenuOpen || location.pathname === '/novedades' ? 'border-coral text-ink' : 'border-transparent text-slate-500 hover:text-ink'}`}
                aria-expanded={newsMenuOpen}
              >
                NOVEDADES<ChevronDown className="h-4 w-4" />
              </button>
              {newsMenuOpen && (
                <div className="header-dropdown absolute left-0 top-full w-64 rounded-b-md border border-t-0 border-slate-200 bg-white p-1.5 shadow-card">
                  <button
                    type="button"
                    onClick={() => navigateToNewsSection('populares-plataforma')}
                    className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-ink"
                  >
                    Populares por plataforma
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateToNewsSection('top-10-plataforma')}
                    className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-ink"
                  >
                    Top 10 por plataforma
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateToNewsSection('top-10-ar')}
                    className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-ink"
                  >
                    Top 10 en AR
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateToNewsSection('sugerencias-plataforma')}
                    className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-ink"
                  >
                    Sugerencias por plataforma
                  </button>
                </div>
              )}
            </div>
            <div ref={platformMenuRef} className="relative h-full">
              <button type="button" onClick={() => { setPlatformMenuOpen((current) => !current); setLibraryMenuOpen(false); setCollectionMenuOpen(false); setGenreMenuOpen(false); setNewsMenuOpen(false); }} className={`flex h-full items-center gap-1.5 border-b-2 px-3 text-sm font-semibold ${platformMenuOpen ? 'border-coral text-ink' : 'border-transparent text-slate-500 hover:text-ink'}`} aria-expanded={platformMenuOpen}>PLATAFORMAS<ChevronDown className="h-4 w-4" /></button>
              {platformMenuOpen && <div className="header-dropdown absolute left-0 top-full w-56 rounded-b-md border border-t-0 border-slate-200 bg-white p-1.5 shadow-card">
                <div className="max-h-72 overflow-y-auto">
                  {(metadataQuery.data?.platforms || []).length ? (metadataQuery.data?.platforms || []).map((platform) => <button key={platform.id} type="button" onClick={() => filterLibraryByPlatform(platform.id)} className="flex w-full rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-ink">{platform.name}</button>) : <p className="px-3 py-3 text-sm text-slate-400">No hay plataformas.</p>}
                </div>
                <Link to="/plataformas" onClick={() => setPlatformMenuOpen(false)} className="mt-1 flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-ink"><LayoutGrid className="h-4 w-4" />Mostrar plataformas</Link>
              </div>}
            </div>
            <div ref={genreMenuRef} className="relative h-full">
              <button type="button" onClick={() => { setGenreMenuOpen((current) => !current); setLibraryMenuOpen(false); setCollectionMenuOpen(false); setPlatformMenuOpen(false); setNewsMenuOpen(false); }} className={`flex h-full items-center gap-1.5 border-b-2 px-3 text-sm font-semibold ${genreMenuOpen ? 'border-coral text-ink' : 'border-transparent text-slate-500 hover:text-ink'}`} aria-expanded={genreMenuOpen}>GÉNEROS<ChevronDown className="h-4 w-4" /></button>
              {genreMenuOpen && <div className="header-dropdown absolute left-0 top-full w-56 rounded-b-md border border-t-0 border-slate-200 bg-white p-1.5 shadow-card">
                <div className="max-h-72 overflow-y-auto">
                  {(metadataQuery.data?.genres || []).length ? (metadataQuery.data?.genres || []).map((genre) => <button key={genre.id} type="button" onClick={() => filterLibraryByGenre(genre.id)} className="flex w-full rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-ink">{genre.name}</button>) : <p className="px-3 py-3 text-sm text-slate-400">No hay géneros.</p>}
                </div>
                <Link to="/generos" onClick={() => setGenreMenuOpen(false)} className="mt-1 flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-ink"><LayoutGrid className="h-4 w-4" />Mostrar géneros</Link>
              </div>}
            </div>
            <div ref={collectionMenuRef} className="relative h-full">
              <button type="button" onClick={() => { setCollectionMenuOpen((current) => !current); setLibraryMenuOpen(false); setPlatformMenuOpen(false); setGenreMenuOpen(false); setNewsMenuOpen(false); }} className={`flex h-full items-center gap-1.5 border-b-2 px-3 text-sm font-semibold ${collectionMenuOpen ? 'border-coral text-ink' : 'border-transparent text-slate-500 hover:text-ink'}`} aria-expanded={collectionMenuOpen}>COLECCIONES<ChevronDown className="h-4 w-4" /></button>
              {collectionMenuOpen && <div className="header-dropdown absolute left-0 top-full w-64 rounded-b-md border border-t-0 border-slate-200 bg-white p-1.5 shadow-card">
                <div className="max-h-72 overflow-y-auto">
                  {(collectionsQuery.data || []).length ? (collectionsQuery.data || []).map((collection) => <Link key={collection.id} to={`/colecciones/${collection.id}`} onClick={() => setCollectionMenuOpen(false)} className="flex w-full rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-ink">{collection.name}</Link>) : <p className="px-3 py-3 text-sm text-slate-400">No hay colecciones.</p>}
                </div>
                <Link to="/colecciones" onClick={() => setCollectionMenuOpen(false)} className="mt-1 flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-ink"><LayoutGrid className="h-4 w-4" />Mostrar colecciones</Link>
              </div>}
            </div>
            <button
              type="button"
              onClick={() => setAddModalOpen(true)}
              className={`flex h-full items-center gap-1.5 border-b-2 px-3 text-sm font-semibold transition-colors ${addModalOpen ? 'border-coral text-ink' : 'border-transparent text-slate-500 hover:text-ink'}`}
            >
              AGREGAR
            </button>
          </nav>
          <button type="button" onClick={() => filterLibrary('all')} className="header-all-button inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-coral px-3 text-xs font-semibold text-white transition-colors hover:bg-[#e7473d]" title="Mostrar todos los títulos"><Film className="h-4 w-4" />TODOS</button>
          <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            className="profile-menu-trigger flex h-10 items-center gap-2 rounded-md px-1.5 text-sm text-slate-600 hover:bg-slate-100"
            aria-expanded={menuOpen}
          >
            {user?.profilePhoto && !profilePhotoFailed
              ? <img src={user.profilePhoto} alt={user.name} referrerPolicy="no-referrer" onError={() => setProfilePhotoFailed(true)} className="h-8 w-8 rounded-full bg-mist object-cover" />
              : <span className="grid h-8 w-8 place-items-center rounded-full bg-mist font-semibold text-ink">{initials}</span>}
            <ChevronDown className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="header-dropdown absolute right-0 top-12 w-60 rounded-md border border-slate-200 bg-white p-1.5 shadow-card">
              <div className="border-b border-slate-100 px-3 py-2.5">
                <p className="truncate text-sm font-semibold text-ink">{user?.name}</p>
                <p className="truncate text-xs text-slate-500">{user?.email}</p>
              </div>
              <div className="mt-1 border-b border-slate-100 py-1 xl:hidden">
                <p className="px-3 py-1.5 text-xs font-semibold uppercase text-slate-400">Biblioteca</p>
                {libraryOptions.map((option) => <button key={`mobile-library-${option.preset}`} type="button" onClick={() => filterLibrary(option.preset)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50">{option.icon}<span>{option.label}</span></button>)}
              </div>
              <div className="mt-1 border-b border-slate-100 py-1 xl:hidden">
                <p className="px-3 py-1.5 text-xs font-semibold uppercase text-slate-400">Novedades</p>
                <button
                  type="button"
                  onClick={() => navigateToNewsSection('top-10-plataforma')}
                  className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
                >
                  Top 10 por plataforma
                </button>
                <button
                  type="button"
                  onClick={() => navigateToNewsSection('top-10-ar')}
                  className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
                >
                  Top 10 en AR
                </button>
                <button
                  type="button"
                  onClick={() => navigateToNewsSection('sugerencias-plataforma')}
                  className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
                >
                  Sugerencias por plataforma
                </button>
              </div>
              <div className="mt-1 border-t border-slate-100 py-1 xl:hidden">
                <p className="px-3 py-1.5 text-xs font-semibold uppercase text-slate-400">Plataformas</p>
                <div className="max-h-40 overflow-y-auto">
                  {(metadataQuery.data?.platforms || []).length ? (metadataQuery.data?.platforms || []).map((platform) => <button key={`mobile-platform-${platform.id}`} type="button" onClick={() => filterLibraryByPlatform(platform.id)} className="flex w-full rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50">{platform.name}</button>) : <p className="px-3 py-2 text-sm text-slate-400">No hay plataformas.</p>}
                </div>
                <Link to="/plataformas" onClick={() => setMenuOpen(false)} className="mt-1 flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"><LayoutGrid className="h-4 w-4" />Mostrar plataformas</Link>
              </div>
              <div className="mt-1 border-y border-slate-100 py-1 xl:hidden">
                <p className="px-3 py-1.5 text-xs font-semibold uppercase text-slate-400">Géneros</p>
                <div className="max-h-40 overflow-y-auto">
                  {(metadataQuery.data?.genres || []).length ? (metadataQuery.data?.genres || []).map((genre) => <button key={`mobile-${genre.id}`} type="button" onClick={() => filterLibraryByGenre(genre.id)} className="flex w-full rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50">{genre.name}</button>) : <p className="px-3 py-2 text-sm text-slate-400">No hay géneros.</p>}
                </div>
                <Link to="/generos" onClick={() => setMenuOpen(false)} className="mt-1 flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"><LayoutGrid className="h-4 w-4" />Mostrar géneros</Link>
              </div>
              <div className="mt-1 border-b border-slate-100 py-1 xl:hidden">
                <p className="px-3 py-1.5 text-xs font-semibold uppercase text-slate-400">Colecciones</p>
                <div className="max-h-40 overflow-y-auto">
                  {(collectionsQuery.data || []).length ? (collectionsQuery.data || []).map((collection) => <Link key={`mobile-collection-${collection.id}`} to={`/colecciones/${collection.id}`} onClick={() => setMenuOpen(false)} className="flex w-full rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50">{collection.name}</Link>) : <p className="px-3 py-2 text-sm text-slate-400">No hay colecciones.</p>}
                </div>
                <Link to="/colecciones" onClick={() => setMenuOpen(false)} className="mt-1 flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"><LayoutGrid className="h-4 w-4" />Mostrar colecciones</Link>
              </div>
              <div className="border-b border-slate-100 px-3 py-2">
                <p className="mb-2 text-xs font-semibold uppercase text-slate-400">Temas</p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => { setTheme('light'); setMenuOpen(false); }} className={`flex items-center justify-center gap-2 rounded-md border px-2 py-2 text-sm ${theme === 'light' ? 'border-coral text-ink' : 'border-slate-200 text-slate-600'}`}><Sun className="h-4 w-4" />Claro</button>
                  <button type="button" onClick={() => { setTheme('dark'); setMenuOpen(false); }} className={`flex items-center justify-center gap-2 rounded-md border px-2 py-2 text-sm ${theme === 'dark' ? 'border-coral text-ink' : 'border-slate-200 text-slate-600'}`}><Moon className="h-4 w-4" />Oscuro</button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setAddModalOpen(true);
                }}
                className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 xl:hidden"
              >
                Agregar
              </button>
              <button type="button" onClick={logout} className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                <LogOut className="h-4 w-4" />
                Cerrar sesion
              </button>
            </div>
          )}
          </div>
        </div>
      </div>
    </header>
    <AddMovieModal isOpen={addModalOpen} onClose={handleCloseAddModal} />
  </>
);
};
