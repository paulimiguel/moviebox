import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronsUpDown, Check, Loader2, Search } from 'lucide-react';
import { api } from '@/services/api';
import type { MovieItem } from '@/types/movie';

const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLocaleLowerCase('es');

// Selector de colecciones dentro de la ficha: permite elegir una o varias sin entrar a editar.
export const MovieCollectionSelect = ({ movie }: { movie: MovieItem }) => {
  const queryClient = useQueryClient();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(() => movie.collections.map((collection) => ({ id: collection.id, name: collection.name })));
  const collectionsQuery = useQuery({ queryKey: ['collections'], queryFn: api.collections.getAll, enabled: open });
  const collections = collectionsQuery.data || [];
  const selectedIds = selected.map((collection) => collection.id);

  useEffect(() => {
    setSelected(movie.collections.map((collection) => ({ id: collection.id, name: collection.name })));
  }, [movie.id, movie.collections]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['movies'] });
    queryClient.invalidateQueries({ queryKey: ['collections'] });
  };
  const applySaved = (saved: MovieItem) => {
    setSelected(saved.collections.map((collection) => ({ id: collection.id, name: collection.name })));
    refresh();
  };
  const saveMutation = useMutation({
    mutationFn: (collectionIds: string[]) => api.movies.updatePersonal(movie.id, { collectionIds }),
    onSuccess: applySaved,
  });
  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const created = await api.collections.create({ name });
      return api.movies.updatePersonal(movie.id, { collectionIds: [...selectedIds, created.id] });
    },
    onSuccess: (saved) => { setSearch(''); applySaved(saved); },
  });
  const busy = saveMutation.isPending || createMutation.isPending;

  // Al elegir una colección se cierra el desplegable; se vuelve a abrir para elegir otra.
  const toggle = (id: string) => {
    saveMutation.mutate(selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id]);
    setOpen(false);
  };
  const query = normalize(search);
  const visible = collections.filter((collection) => !query || normalize(collection.name).includes(query));
  const exactMatch = collections.find((collection) => normalize(collection.name) === query);
  const submit = () => {
    if (!search.trim() || busy) return;
    if (exactMatch) {
      if (!selectedIds.includes(exactMatch.id)) toggle(exactMatch.id);
      else setOpen(false);
      setSearch('');
      return;
    }
    createMutation.mutate(search.trim());
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative min-w-0">
      <span className="field-label">Colección</span>
      <button type="button" onClick={() => { setSearch(''); setOpen((current) => !current); }} className={`control flex w-full items-center justify-between gap-2 text-left ${open ? 'border-coral' : ''}`} aria-haspopup="listbox" aria-expanded={open}>
        <span className={`truncate ${selected.length ? 'text-ink' : 'text-slate-400'}`}>{selected.length ? selected.map((collection) => collection.name).join(', ') : 'Elegir colección'}</span>
        {busy ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-aqua" /> : <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />}
      </button>
      {open && (
        <div className="library-toolbar-dropdown absolute left-0 top-full z-50 mt-1 w-full min-w-[200px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-card">
          <label className="relative block border-b border-slate-200">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input autoFocus type="search" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); submit(); } }} className="h-10 w-full pl-9 pr-3 text-sm outline-none" placeholder="Buscar o crear con Enter" />
          </label>
          <div className="max-h-[min(14rem,36vh)] overflow-y-auto p-1.5" role="listbox" aria-multiselectable="true">
            {collectionsQuery.isLoading && <p className="px-3 py-3 text-center text-sm text-slate-400">Cargando…</p>}
            {visible.map((collection) => {
              const isSelected = selectedIds.includes(collection.id);
              return (
                <button key={collection.id} type="button" disabled={busy} onClick={() => toggle(collection.id)} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${isSelected ? 'bg-mist font-semibold text-ink' : 'text-slate-600 hover:bg-slate-50'}`} role="option" aria-selected={isSelected}>
                  <Check className={`h-4 w-4 shrink-0 ${isSelected ? 'text-coral' : 'text-transparent'}`} />
                  <span className="min-w-0 flex-1 truncate">{collection.name}</span>
                </button>
              );
            })}
            {!collectionsQuery.isLoading && !visible.length && <p className="px-3 py-3 text-center text-sm text-slate-400">{search.trim() ? 'Enter para crear esta colección.' : 'No hay colecciones.'}</p>}
          </div>
        </div>
      )}
    </div>
  );
};
