import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, LayoutGrid, LogOut, Moon, Sun } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';

export const Header = () => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [collectionMenuOpen, setCollectionMenuOpen] = useState(false);
  const [platformMenuOpen, setPlatformMenuOpen] = useState(false);
  const [genreMenuOpen, setGenreMenuOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profilePhotoFailed, setProfilePhotoFailed] = useState(false);
  const collectionMenuRef = useRef<HTMLDivElement>(null);
  const platformMenuRef = useRef<HTMLDivElement>(null);
  const genreMenuRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const metadataQuery = useQuery({ queryKey: ['metadata'], queryFn: api.metadata.getAll });
  const collectionsQuery = useQuery({ queryKey: ['collections'], queryFn: api.collections.getAll });

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!collectionMenuRef.current?.contains(event.target as Node)) setCollectionMenuOpen(false);
      if (!platformMenuRef.current?.contains(event.target as Node)) setPlatformMenuOpen(false);
      if (!genreMenuRef.current?.contains(event.target as Node)) setGenreMenuOpen(false);
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
  const filterLibraryByGenre = (genreId: string) => {
    try {
      window.sessionStorage.setItem('moviebox:genre-filter', genreId);
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
    } catch {
      // The event below still applies the filter when already in the library.
    }
    setPlatformMenuOpen(false);
    setMenuOpen(false);
    navigate('/');
    window.setTimeout(() => window.dispatchEvent(new CustomEvent('moviebox:filter-platform', { detail: platformId })), 0);
  };

  return (
    <header className="moviebox-header sticky top-0 z-40 border-b border-slate-200 bg-canvas/95 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-[1500px] items-center gap-5 px-4 sm:px-6">
        <Link to="/" className="shrink-0"><img src={theme === 'dark' ? '/moviebox-logo-white.png' : '/moviebox-logo-red.png'} alt="MovieBox" className="h-10 w-auto max-w-[190px] object-contain sm:h-11" /></Link>
        <div className="ml-auto flex h-full min-w-0 items-center gap-2 sm:gap-4">
          <nav className="main-navigation hidden h-full items-end xl:flex">
            <NavLink to="/" className={({ isActive }) => `flex h-full items-center border-b-2 px-3 text-sm font-semibold ${isActive ? 'border-coral text-ink' : 'border-transparent text-slate-500'}`}>BIBLIOTECA</NavLink>
            <div ref={platformMenuRef} className="relative h-full">
              <button type="button" onClick={() => { setPlatformMenuOpen((current) => !current); setCollectionMenuOpen(false); setGenreMenuOpen(false); }} className={`flex h-full items-center gap-1.5 border-b-2 px-3 text-sm font-semibold ${platformMenuOpen ? 'border-coral text-ink' : 'border-transparent text-slate-500 hover:text-ink'}`} aria-expanded={platformMenuOpen}>PLATAFORMAS<ChevronDown className="h-4 w-4" /></button>
              {platformMenuOpen && <div className="header-dropdown absolute left-0 top-full w-56 rounded-b-md border border-t-0 border-slate-200 bg-white p-1.5 shadow-card">
                <div className="max-h-72 overflow-y-auto">
                  {(metadataQuery.data?.platforms || []).length ? (metadataQuery.data?.platforms || []).map((platform) => <button key={platform.id} type="button" onClick={() => filterLibraryByPlatform(platform.id)} className="flex w-full rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-ink">{platform.name}</button>) : <p className="px-3 py-3 text-sm text-slate-400">No hay plataformas.</p>}
                </div>
                <Link to="/plataformas" onClick={() => setPlatformMenuOpen(false)} className="mt-1 flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-ink"><LayoutGrid className="h-4 w-4" />Mostrar plataformas</Link>
              </div>}
            </div>
            <div ref={genreMenuRef} className="relative h-full">
              <button type="button" onClick={() => { setGenreMenuOpen((current) => !current); setCollectionMenuOpen(false); setPlatformMenuOpen(false); }} className={`flex h-full items-center gap-1.5 border-b-2 px-3 text-sm font-semibold ${genreMenuOpen ? 'border-coral text-ink' : 'border-transparent text-slate-500 hover:text-ink'}`} aria-expanded={genreMenuOpen}>GÉNEROS<ChevronDown className="h-4 w-4" /></button>
              {genreMenuOpen && <div className="header-dropdown absolute left-0 top-full w-56 rounded-b-md border border-t-0 border-slate-200 bg-white p-1.5 shadow-card">
                <div className="max-h-72 overflow-y-auto">
                  {(metadataQuery.data?.genres || []).length ? (metadataQuery.data?.genres || []).map((genre) => <button key={genre.id} type="button" onClick={() => filterLibraryByGenre(genre.id)} className="flex w-full rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-ink">{genre.name}</button>) : <p className="px-3 py-3 text-sm text-slate-400">No hay géneros.</p>}
                </div>
                <Link to="/generos" onClick={() => setGenreMenuOpen(false)} className="mt-1 flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-ink"><LayoutGrid className="h-4 w-4" />Mostrar géneros</Link>
              </div>}
            </div>
            <div ref={collectionMenuRef} className="relative h-full">
              <button type="button" onClick={() => { setCollectionMenuOpen((current) => !current); setPlatformMenuOpen(false); setGenreMenuOpen(false); }} className={`flex h-full items-center gap-1.5 border-b-2 px-3 text-sm font-semibold ${collectionMenuOpen ? 'border-coral text-ink' : 'border-transparent text-slate-500 hover:text-ink'}`} aria-expanded={collectionMenuOpen}>COLECCIONES<ChevronDown className="h-4 w-4" /></button>
              {collectionMenuOpen && <div className="header-dropdown absolute left-0 top-full w-64 rounded-b-md border border-t-0 border-slate-200 bg-white p-1.5 shadow-card">
                <div className="max-h-72 overflow-y-auto">
                  {(collectionsQuery.data || []).length ? (collectionsQuery.data || []).map((collection) => <Link key={collection.id} to={`/colecciones/${collection.id}`} onClick={() => setCollectionMenuOpen(false)} className="flex w-full rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-ink">{collection.name}</Link>) : <p className="px-3 py-3 text-sm text-slate-400">No hay colecciones.</p>}
                </div>
                <Link to="/colecciones" onClick={() => setCollectionMenuOpen(false)} className="mt-1 flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-ink"><LayoutGrid className="h-4 w-4" />Mostrar colecciones</Link>
              </div>}
            </div>
            <NavLink to="/agregar" className={({ isActive }) => `flex h-full items-center gap-1.5 border-b-2 px-3 text-sm font-semibold ${isActive ? 'border-coral text-ink' : 'border-transparent text-slate-500 hover:text-ink'}`}>AGREGAR</NavLink>
          </nav>
          <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            className="flex h-10 items-center gap-2 rounded-md px-1.5 text-sm text-slate-600 hover:bg-slate-100"
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
              <Link to="/agregar" onClick={() => setMenuOpen(false)} className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 xl:hidden">
                Agregar
              </Link>
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
  );
};
