import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, FolderOpen, LogOut, Plus, Search } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';

export const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [platformMenuOpen, setPlatformMenuOpen] = useState(false);
  const [genreMenuOpen, setGenreMenuOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profilePhotoFailed, setProfilePhotoFailed] = useState(false);
  const platformMenuRef = useRef<HTMLDivElement>(null);
  const genreMenuRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const metadataQuery = useQuery({ queryKey: ['metadata'], queryFn: api.metadata.getAll });

  useEffect(() => {
    const close = (event: MouseEvent) => {
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
  const focusLibrarySearch = () => {
    try {
      window.sessionStorage.setItem('moviebox:focus-search', 'true');
    } catch {
      // The event below still focuses the field when already in the library.
    }
    navigate('/');
    window.setTimeout(() => window.dispatchEvent(new Event('moviebox:focus-search')), 0);
  };
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
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-[1500px] items-center gap-5 px-4 sm:px-6">
        <Link to="/" className="shrink-0"><img src="/moviebox-logo-red.png" alt="MovieBox" className="h-10 w-auto max-w-[190px] object-contain sm:h-11" /></Link>
        <div className="ml-auto flex h-full min-w-0 items-center gap-2 sm:gap-4">
          <nav className="hidden h-full items-end xl:flex">
            <NavLink to="/" className={({ isActive }) => `flex h-full items-center border-b-2 px-3 text-sm font-semibold ${isActive ? 'border-coral text-ink' : 'border-transparent text-slate-500'}`}>BIBLIOTECA</NavLink>
            <NavLink to="/colecciones" className={({ isActive }) => `flex h-full items-center border-b-2 px-3 text-sm font-semibold ${isActive ? 'border-coral text-ink' : 'border-transparent text-slate-500'}`}>COLECCIONES</NavLink>
            <div ref={platformMenuRef} className="relative h-full">
              <button type="button" onClick={() => { setPlatformMenuOpen((current) => !current); setGenreMenuOpen(false); }} className={`flex h-full items-center gap-1.5 border-b-2 px-3 text-sm font-semibold ${platformMenuOpen ? 'border-coral text-ink' : 'border-transparent text-slate-500 hover:text-ink'}`} aria-expanded={platformMenuOpen}>PLATAFORMAS<ChevronDown className="h-4 w-4" /></button>
              {platformMenuOpen && <div className="absolute left-0 top-full w-56 rounded-b-md border border-t-0 border-slate-200 bg-white p-1.5 shadow-card">
                <div className="max-h-72 overflow-y-auto">
                  {(metadataQuery.data?.platforms || []).length ? (metadataQuery.data?.platforms || []).map((platform) => <button key={platform.id} type="button" onClick={() => filterLibraryByPlatform(platform.id)} className="flex w-full rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-ink">{platform.name}</button>) : <p className="px-3 py-3 text-sm text-slate-400">No hay plataformas.</p>}
                </div>
              </div>}
            </div>
            <div ref={genreMenuRef} className="relative h-full">
              <button type="button" onClick={() => { setGenreMenuOpen((current) => !current); setPlatformMenuOpen(false); }} className={`flex h-full items-center gap-1.5 border-b-2 px-3 text-sm font-semibold ${genreMenuOpen ? 'border-coral text-ink' : 'border-transparent text-slate-500 hover:text-ink'}`} aria-expanded={genreMenuOpen}>GÉNEROS<ChevronDown className="h-4 w-4" /></button>
              {genreMenuOpen && <div className="absolute left-0 top-full w-56 rounded-b-md border border-t-0 border-slate-200 bg-white p-1.5 shadow-card">
                <div className="max-h-72 overflow-y-auto">
                  {(metadataQuery.data?.genres || []).length ? (metadataQuery.data?.genres || []).map((genre) => <button key={genre.id} type="button" onClick={() => filterLibraryByGenre(genre.id)} className="flex w-full rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-ink">{genre.name}</button>) : <p className="px-3 py-3 text-sm text-slate-400">No hay géneros.</p>}
                </div>
              </div>}
            </div>
            <button type="button" onClick={focusLibrarySearch} className="flex h-full items-center gap-1.5 border-b-2 border-transparent px-3 text-sm font-semibold text-slate-500 hover:text-ink"><Search className="h-4 w-4" />BUSCAR</button>
            <NavLink to="/agregar" className={({ isActive }) => `flex h-full items-center gap-1.5 border-b-2 px-3 text-sm font-semibold ${isActive ? 'border-coral text-ink' : 'border-transparent text-slate-500 hover:text-ink'}`}><Plus className="h-4 w-4" />AGREGAR</NavLink>
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
            <div className="absolute right-0 top-12 w-60 rounded-md border border-slate-200 bg-white p-1.5 shadow-card">
              <div className="border-b border-slate-100 px-3 py-2.5">
                <p className="truncate text-sm font-semibold text-ink">{user?.name}</p>
                <p className="truncate text-xs text-slate-500">{user?.email}</p>
              </div>
              <button type="button" onClick={() => { setMenuOpen(false); focusLibrarySearch(); }} className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 xl:hidden">
                <Search className="h-4 w-4" />
                Buscar
              </button>
              <Link to="/colecciones" onClick={() => setMenuOpen(false)} className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 xl:hidden">
                <FolderOpen className="h-4 w-4" />
                Colecciones
              </Link>
              <div className="mt-1 border-t border-slate-100 py-1 xl:hidden">
                <p className="px-3 py-1.5 text-xs font-semibold uppercase text-slate-400">Plataformas</p>
                <div className="max-h-40 overflow-y-auto">
                  {(metadataQuery.data?.platforms || []).length ? (metadataQuery.data?.platforms || []).map((platform) => <button key={`mobile-platform-${platform.id}`} type="button" onClick={() => filterLibraryByPlatform(platform.id)} className="flex w-full rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50">{platform.name}</button>) : <p className="px-3 py-2 text-sm text-slate-400">No hay plataformas.</p>}
                </div>
              </div>
              <div className="mt-1 border-y border-slate-100 py-1 xl:hidden">
                <p className="px-3 py-1.5 text-xs font-semibold uppercase text-slate-400">Géneros</p>
                <div className="max-h-40 overflow-y-auto">
                  {(metadataQuery.data?.genres || []).length ? (metadataQuery.data?.genres || []).map((genre) => <button key={`mobile-${genre.id}`} type="button" onClick={() => filterLibraryByGenre(genre.id)} className="flex w-full rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50">{genre.name}</button>) : <p className="px-3 py-2 text-sm text-slate-400">No hay géneros.</p>}
                </div>
              </div>
              <Link to="/agregar" onClick={() => setMenuOpen(false)} className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 xl:hidden">
                <Plus className="h-4 w-4" />
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
