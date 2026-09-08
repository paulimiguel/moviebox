import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, FilePlus2, FolderOpen, LogOut, Plus } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const Header = ({ onNew, onImport }: { onNew?: () => void; onImport?: () => void }) => {
  const { user, logout } = useAuth();
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!addMenuRef.current?.contains(event.target as Node)) setAddMenuOpen(false);
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const initials = (user?.name || 'U')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toLocaleUpperCase();
  const hasAddMenu = Boolean(onNew && onImport);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-[1500px] items-center gap-5 px-4 sm:px-6">
        <Link to="/"><img src="/moviebox-logo-red.png" alt="MovieBox" className="h-10 w-auto max-w-[190px] object-contain sm:h-11" /></Link>
        <nav className="hidden h-full items-end sm:flex">
          <NavLink to="/" className={({ isActive }) => `flex h-full items-center border-b-2 px-3 text-sm font-semibold ${isActive ? 'border-coral text-ink' : 'border-transparent text-slate-500'}`}>BIBLIOTECA</NavLink>
          <NavLink to="/colecciones" className={({ isActive }) => `flex h-full items-center border-b-2 px-3 text-sm font-semibold ${isActive ? 'border-coral text-ink' : 'border-transparent text-slate-500'}`}>COLECCIONES</NavLink>
        </nav>
        {hasAddMenu && (
          <div ref={addMenuRef} className="relative ml-auto sm:ml-2">
            <button
              type="button"
              onClick={() => setAddMenuOpen((current) => !current)}
              className="primary-button"
              aria-label="Agregar"
              aria-expanded={addMenuOpen}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Agregar</span>
              <ChevronDown className="h-4 w-4" />
            </button>
            {addMenuOpen && (
              <div className="absolute right-0 top-12 w-52 rounded-md border border-slate-200 bg-white p-1.5 shadow-card">
                <button
                  type="button"
                  onClick={() => { setAddMenuOpen(false); onNew?.(); }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  <FilePlus2 className="h-4 w-4" />
                  Nueva
                </button>
                <button
                  type="button"
                  onClick={() => { setAddMenuOpen(false); onImport?.(); }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" />
                  Importar
                </button>
              </div>
            )}
          </div>
        )}
        <div ref={menuRef} className={`relative ${hasAddMenu ? '' : 'ml-auto'}`}>
          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            className="flex h-10 items-center gap-2 rounded-md px-1.5 text-sm text-slate-600 hover:bg-slate-100"
            aria-expanded={menuOpen}
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-mist font-semibold text-ink">{initials}</span>
            <ChevronDown className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-12 w-60 rounded-md border border-slate-200 bg-white p-1.5 shadow-card">
              <div className="border-b border-slate-100 px-3 py-2.5">
                <p className="truncate text-sm font-semibold text-ink">{user?.name}</p>
                <p className="truncate text-xs text-slate-500">{user?.email}</p>
              </div>
              <Link to="/colecciones" onClick={() => setMenuOpen(false)} className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 sm:hidden">
                <FolderOpen className="h-4 w-4" />
                Colecciones
              </Link>
              <button type="button" onClick={logout} className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                <LogOut className="h-4 w-4" />
                Cerrar sesion
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
