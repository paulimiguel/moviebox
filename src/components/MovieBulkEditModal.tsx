import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Bookmark, ChevronDown, Eye, Heart, Loader2, Plus, Search, X } from 'lucide-react';
import { StarRating } from '@/components/StarRating';
import { api } from '@/services/api';
import { movieToInput } from '@/utils/movieInput';
import type { MovieCollection, MovieItem, MovieType } from '@/types/movie';

const BulkMultiSelect = ({
  label,
  options,
  selected,
  onChange,
  placeholder = 'No cambiar',
}: {
  label: string;
  options: { id: string; name: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const allOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    options.forEach((opt) => map.set(opt.name.toLowerCase(), opt));
    selected.forEach((name) => {
      const lower = name.toLowerCase();
      if (!map.has(lower)) {
        map.set(lower, { id: `sel-${lower}`, name });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [options, selected]);

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allOptions;
    return allOptions.filter((opt) => opt.name.toLowerCase().includes(q));
  }, [allOptions, search]);

  const exactMatch = filteredOptions.some((opt) => opt.name.toLowerCase() === search.trim().toLowerCase());

  const toggle = (name: string) => {
    if (selected.includes(name)) {
      onChange(selected.filter((item) => item !== name));
    } else {
      onChange([...selected, name]);
    }
  };

  const handleAddCustom = () => {
    const trimmed = search.trim();
    if (!trimmed) return;
    if (!selected.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
      onChange([...selected, trimmed]);
    }
    setSearch('');
  };

  return (
    <div className="relative" ref={containerRef}>
      <span className="field-label">{label}</span>
      <button
        type="button"
        onClick={() => setOpen((c) => !c)}
        className={`control flex w-full items-center justify-between gap-2 text-left ${open ? 'border-coral' : ''}`}
        aria-expanded={open}
      >
        <span className={`truncate text-sm ${selected.length ? 'font-medium text-ink' : 'text-slate-400'}`}>
          {selected.length ? selected.join(', ') : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="library-toolbar-dropdown absolute left-0 top-full z-50 mt-1 w-full min-w-[220px] rounded-md border border-slate-200 bg-white p-2 shadow-card">
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustom();
                }
              }}
              placeholder={`Buscar o agregar ${label.toLowerCase()}...`}
              className="control h-8 w-full pl-8 pr-2 text-xs"
            />
          </div>

          <div className="max-h-44 overflow-y-auto space-y-0.5">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isChecked = selected.includes(opt.name);
                return (
                  <label
                    key={opt.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs text-ink hover:bg-slate-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggle(opt.name)}
                      className="h-3.5 w-3.5 rounded accent-coral"
                    />
                    <span className="truncate">{opt.name}</span>
                  </label>
                );
              })
            ) : (
              <p className="px-2 py-2 text-xs text-slate-400">Sin coincidencias.</p>
            )}
          </div>

          {search.trim() && !exactMatch && (
            <button
              type="button"
              onClick={handleAddCustom}
              className="mt-1.5 flex w-full items-center gap-1.5 rounded-md border border-dashed border-slate-200 px-2 py-1.5 text-left text-xs font-medium text-coral hover:bg-red-50 transition-colors"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span>Agregar "{search.trim()}"</span>
            </button>
          )}

          {selected.length > 0 && (
            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-1.5 text-[11px]">
              <span className="text-slate-400">{selected.length} seleccionado{selected.length > 1 ? 's' : ''}</span>
              <button
                type="button"
                onClick={() => onChange([])}
                className="font-medium text-coral hover:underline"
              >
                Limpiar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const MovieBulkEditModal = ({
  movies,
  genres,
  platforms,
  countries = [],
  collections,
  onClose,
  onSaved,
}: {
  movies: MovieItem[];
  genres: { id: string; name: string }[];
  platforms: { id: string; name: string }[];
  countries?: { id: string; name: string }[];
  collections: MovieCollection[];
  onClose: () => void;
  onSaved: () => void;
}) => {
  const [type, setType] = useState<'' | MovieType>('');
  const [year, setYear] = useState('');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [rate, setRate] = useState<number | null>(null);
  const [collectionId, setCollectionId] = useState('');
  const [markWatched, setMarkWatched] = useState(false);
  const [markFavorite, setMarkFavorite] = useState(false);
  const [markWatchlist, setMarkWatchlist] = useState(false);
  const [error, setError] = useState('');

  const numericYear = year ? Number(year) : null;
  const validYear = numericYear === null || (Number.isInteger(numericYear) && numericYear >= 1888 && numericYear <= 2200);

  const hasChanges = Boolean(
    type ||
    numericYear !== null ||
    selectedCountries.length > 0 ||
    selectedGenres.length > 0 ||
    selectedPlatforms.length > 0 ||
    rate !== null ||
    collectionId ||
    markWatched ||
    markFavorite ||
    markWatchlist
  );

  const mutation = useMutation({
    mutationFn: () => Promise.all(movies.map((movie) => {
      const input = movieToInput(movie);
      if (type) input.type = type;
      if (numericYear !== null) input.year = numericYear;
      if (markWatched) input.watched = true;
      if (markFavorite) input.favorite = true;
      if (markWatchlist) input.watchlist = true;
      if (rate !== null) input.personalRating = rate;

      if (selectedCountries.length > 0) {
        const existing = new Set((input.countries || []).map((c) => c.name.toLowerCase()));
        const toAdd = selectedCountries.filter((c) => !existing.has(c.toLowerCase()));
        if (toAdd.length > 0) {
          input.countries = [
            ...(input.countries || []),
            ...toAdd.map((name, idx) => ({ name, isoCode: null, order: (input.countries?.length || 0) + idx })),
          ];
        }
      }

      if (selectedGenres.length > 0) {
        const existing = new Set((input.genres || []).map((g) => g.name.toLowerCase()));
        const toAdd = selectedGenres.filter((g) => !existing.has(g.toLowerCase()));
        if (toAdd.length > 0) {
          input.genres = [
            ...(input.genres || []),
            ...toAdd.map((name, idx) => ({ name, order: (input.genres?.length || 0) + idx })),
          ];
        }
      }

      if (selectedPlatforms.length > 0) {
        const existing = new Set((input.platforms || []).map((p) => p.name.toLowerCase()));
        const toAdd = selectedPlatforms.filter((p) => !existing.has(p.toLowerCase()));
        if (toAdd.length > 0) {
          input.platforms = [
            ...(input.platforms || []),
            ...toAdd.map((name, idx) => ({
              name,
              order: (input.platforms?.length || 0) + idx,
              isPrimary: (input.platforms?.length || 0) === 0 && idx === 0,
            })),
          ];
        }
      }

      if (collectionId && !input.collectionIds?.includes(collectionId)) {
        input.collectionIds = [...(input.collectionIds || []), collectionId];
      }

      return api.movies.update(movie.id, input);
    })),
    onSuccess: onSaved,
    onError: (reason: Error) => setError(reason.message),
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/55 sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="bulk-edit-title">
      <div className="movie-detail-modal w-full rounded-t-md bg-canvas shadow-xl sm:max-w-xl sm:rounded-md">
        <header className="flex h-16 items-center border-b border-slate-200 bg-white px-4 sm:px-6">
          <div>
            <h2 id="bulk-edit-title" className="font-semibold text-ink">Editar campos comunes</h2>
            <p className="text-xs text-slate-500">{movies.length} seleccionadas</p>
          </div>
          <button type="button" onClick={onClose} className="icon-button ml-auto border-0 shadow-none" title="Cerrar" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="grid gap-4 bg-canvas p-4 sm:grid-cols-2 sm:p-6">
          {/* Fila 1: Tipo y Año */}
          <label>
            <span className="field-label">Tipo</span>
            <select className="control w-full" value={type} onChange={(event) => setType(event.target.value as '' | MovieType)}>
              <option value="">No cambiar</option>
              <option value="movie">Película</option>
              <option value="series">Serie</option>
            </select>
          </label>
          <label>
            <span className="field-label">Año</span>
            <input className="control w-full" type="number" min="1888" max="2200" value={year} onChange={(event) => setYear(event.target.value)} placeholder="No cambiar" />
          </label>

          {/* Fila 2: País y Género */}
          <BulkMultiSelect
            label="País"
            options={countries}
            selected={selectedCountries}
            onChange={setSelectedCountries}
          />
          <BulkMultiSelect
            label="Género"
            options={genres}
            selected={selectedGenres}
            onChange={setSelectedGenres}
          />

          {/* Fila 3: Plataforma y Rate */}
          <BulkMultiSelect
            label="Plataforma"
            options={platforms}
            selected={selectedPlatforms}
            onChange={setSelectedPlatforms}
          />
          <div>
            <span className="field-label">Rate</span>
            <div className="control flex h-10 items-center justify-between">
              <StarRating
                compact
                value={rate}
                onChange={setRate}
                disabled={mutation.isPending}
              />
              <span className="text-xs text-slate-400">
                {rate !== null ? `${rate} de 5` : 'No cambiar'}
              </span>
            </div>
          </div>

          {/* Fila 4: Colección */}
          <label className="sm:col-span-2">
            <span className="field-label">Colección</span>
            <select className="control w-full" value={collectionId} onChange={(event) => setCollectionId(event.target.value)}>
              <option value="">No cambiar</option>
              {collections.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>

          {/* Estado */}
          <div className="sm:col-span-2">
            <span className="field-label">Estado</span>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                aria-pressed={markWatched}
                onClick={() => setMarkWatched((current) => !current)}
                className={`moviebox-translucent-action inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition-colors ${markWatched ? 'border-coral bg-coral text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                <Eye className="h-4 w-4 shrink-0" />
                Watched
              </button>
              <button
                type="button"
                aria-pressed={markFavorite}
                onClick={() => setMarkFavorite((current) => !current)}
                className={`moviebox-translucent-action inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition-colors ${markFavorite ? 'border-coral bg-coral text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                <Heart className={`h-4 w-4 shrink-0 ${markFavorite ? 'fill-current' : ''}`} />
                Like
              </button>
              <button
                type="button"
                aria-pressed={markWatchlist}
                onClick={() => setMarkWatchlist((current) => !current)}
                className={`moviebox-translucent-action inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition-colors ${markWatchlist ? 'border-aqua bg-aqua text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                <Bookmark className={`h-4 w-4 shrink-0 ${markWatchlist ? 'fill-current' : ''}`} />
                Watchlist
              </button>
            </div>
          </div>

          {!validYear && <p className="text-sm text-red-600 sm:col-span-2">El año debe estar entre 1888 y 2200.</p>}
          {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{error}</p>}
        </div>

        <footer className="flex h-16 items-center justify-end gap-2 border-t border-slate-200 bg-white px-4 sm:px-6">
          <button type="button" onClick={onClose} className="secondary-button">Cancelar</button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !validYear || !hasChanges}
            className="primary-button"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Aplicar cambios
          </button>
        </footer>
      </div>
    </div>
  );
};
