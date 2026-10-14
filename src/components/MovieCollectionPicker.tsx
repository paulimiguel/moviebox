import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api } from '@/services/api';
import type { MovieItem } from '@/types/movie';

const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLocaleLowerCase('es');

export const MovieCollectionPicker = ({ movie }: { movie: MovieItem }) => {
  const queryClient = useQueryClient();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const collectionsQuery = useQuery({ queryKey: ['collections'], queryFn: api.collections.getAll, enabled: open });
  const collections = collectionsQuery.data || [];
  const selectedIds = movie.collections.map((collection) => collection.id);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['movies'] });
    queryClient.invalidateQueries({ queryKey: ['collections'] });
  };
  const saveMutation = useMutation({
    mutationFn: (collectionIds: string[]) => api.movies.updatePersonal(movie.id, { collectionIds }),
    onSuccess: refresh,
  });
  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const created = await api.collections.create({ name });
      return api.movies.updatePersonal(movie.id, { collectionIds: [...selectedIds, created.id] });
    },
    onSuccess: () => { setSearch(''); refresh(); },
  });

  useEffect(() => {
    if (!open) return undefined;
    const close = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const toggle = (id: string) => saveMutation.mutate(selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id]);
  const query = normalize(search);
  const visible = collections.filter((collection) => !query || normalize(collection.name).includes(query));
  const exactMatch = collections.find((collection) => normalize(collection.name) === query);
  const busy = saveMutation.isPending || createMutation.isPending;

  const submit = () => {
    if (!search.trim() || busy) return;
    if (exactMatch) {
      if (!selectedIds.includes(exactMatch.id)) toggle(exactMatch.id);
      setSearch('');
      return;
    }
    createMutation.mutate(search.trim());
  };

  return (
    <div ref={rootRef} className="relative mt-2" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="field-label !mb-0">Colecciones</span>
        {movie.collections.map((collection) => (
          <span key={collection.id} className="rounded bg-aqua px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white shadow-sm">{collection.name}</span>
        ))}
        <button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} className="grid h-5 w-5 place-items-center rounded bg-aqua text-white shadow-sm transition hover:brightness-110" title="Agregar a una colección" aria-label="Agregar a una colección">
          <Plus className="h-3.5 w-3.5" strokeWidth={3} />
        </button>
      </div>
      {open && (
        <div className="movie-card-dropdown absolute left-0 top-full z-50 mt-1 w-64 rounded-md border border-slate-200 bg-white p-2 shadow-card">
          <input
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); submit(); } }}
            placeholder="Buscar o crear con Enter"
            className="control h-8 w-full text-xs"
          />
          <div className="mt-2 max-h-44 space-y-0.5 overflow-y-auto">
            {collectionsQuery.isLoading && <p className="px-1 py-2 text-xs text-slate-400">Cargando…</p>}
            {visible.map((collection) => (
              <label key={collection.id} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs text-slate-600 hover:bg-slate-50">
                <input type="checkbox" checked={selectedIds.includes(collection.id)} disabled={busy} onChange={() => toggle(collection.id)} className="h-3.5 w-3.5 accent-[#65b9bb]" />
                <span className="truncate">{collection.name}</span>
              </label>
            ))}
            {!collectionsQuery.isLoading && !visible.length && <p className="px-1 py-2 text-xs text-slate-400">{search.trim() ? 'Enter para crear esta colección.' : 'No hay colecciones.'}</p>}
          </div>
        </div>
      )}
    </div>
  );
};
