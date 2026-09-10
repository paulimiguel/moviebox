import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Bookmark, Eye, Heart, ImagePlus, Loader2, Plus, Trash2, X } from 'lucide-react';
import { api, resolveMovieImageUrl } from '@/services/api';
import { StarRating } from '@/components/StarRating';
import { movieToInput } from '@/utils/movieInput';
import type { MovieItem, MovieType } from '@/types/movie';

const normalizeValue = (value: string) => value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
const splitValues = (value: string) => Array.from(new Map(value.split(',').map((item) => item.trim()).filter(Boolean).map((item) => [normalizeValue(item), item])).values());
const numberOrNull = (value: string) => value.trim() === '' ? null : Number(value);

const AssociationPicker = ({ label, options, selected, onChange }: {
  label: string;
  options: { id: string; name: string }[];
  selected: string[];
  onChange: (names: string[]) => void;
}) => {
  const visibleOptions = useMemo(() => {
    const byName = new Map(options.map((option) => [option.name.toLocaleLowerCase('es'), option]));
    selected.forEach((name) => {
      const key = name.toLocaleLowerCase('es');
      if (!byName.has(key)) byName.set(key, { id: `selected-${key}`, name });
    });
    return Array.from(byName.values()).sort((left, right) => left.name.localeCompare(right.name, 'es'));
  }, [options, selected]);
  const toggle = (name: string) => onChange(selected.includes(name)
    ? selected.filter((item) => item !== name)
    : [...selected, name]);

  return (
    <fieldset>
      <legend className="field-label">{label}</legend>
      <div className="max-h-44 overflow-y-auto rounded-md border border-slate-200 bg-white p-2">
        {visibleOptions.length ? visibleOptions.map((option) => (
          <label key={option.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50">
            <input type="checkbox" checked={selected.includes(option.name)} onChange={() => toggle(option.name)} className="h-4 w-4 accent-aqua" />
            <span>{option.name}</span>
          </label>
        )) : <p className="px-2 py-3 text-sm text-slate-400">No hay opciones.</p>}
      </div>
    </fieldset>
  );
};

export const MovieEditModal = ({ movie, onClose, onSaved }: {
  movie: MovieItem;
  onClose: () => void;
  onSaved: (movie: MovieItem) => void;
}) => {
  const queryClient = useQueryClient();
  const collections = useQuery({ queryKey: ['collections'], queryFn: api.collections.getAll });
  const metadata = useQuery({ queryKey: ['metadata'], queryFn: api.metadata.getAll });
  const [editAdditionalFields, setEditAdditionalFields] = useState(false);
  const [watched, setWatched] = useState(movie.watched);
  const [favorite, setFavorite] = useState(movie.favorite);
  const [watchlist, setWatchlist] = useState(movie.watchlist);
  const [genreNames, setGenreNames] = useState(movie.genres.map((genre) => genre.name));
  const [platformNames, setPlatformNames] = useState(movie.platforms.map((platform) => platform.name));
  const [collectionIds, setCollectionIds] = useState(movie.collections.map((collection) => collection.id));
  const [collectionDraft, setCollectionDraft] = useState('');
  const [personalRating, setPersonalRating] = useState<number | null>(movie.personalRating);
  const [type, setType] = useState<MovieType>(movie.type);
  const [originalTitle, setOriginalTitle] = useState(movie.originalTitle);
  const [spanishTitle, setSpanishTitle] = useState(movie.spanishTitle || '');
  const [year, setYear] = useState(movie.year?.toString() || '');
  const [synopsis, setSynopsis] = useState(movie.synopsis || '');
  const [duration, setDuration] = useState(movie.durationMinutes?.toString() || '');
  const [seasons, setSeasons] = useState(movie.seasons?.toString() || '');
  const [episodes, setEpisodes] = useState(movie.totalEpisodes?.toString() || '');
  const [imdbRating, setImdbRating] = useState(movie.imdbRating?.toString() || '');
  const [countries, setCountries] = useState(movie.countries.map((country) => country.name).join(', '));
  const [directors, setDirectors] = useState(movie.credits.filter((credit) => credit.creditType === 'director').map((credit) => credit.name).join(', '));
  const [cast, setCast] = useState(movie.credits.filter((credit) => credit.creditType === 'cast').map((credit) => credit.name).join(', '));
  const [keywords, setKeywords] = useState(movie.keywords.map((keyword) => keyword.name).join(', '));
  const [imdbUrl, setImdbUrl] = useState(movie.imdbUrl || '');
  const [tmdbUrl, setTmdbUrl] = useState(movie.tmdbUrl || '');
  const [justwatchUrl, setJustwatchUrl] = useState(movie.justwatchUrl || '');
  const [trailerUrl, setTrailerUrl] = useState(movie.trailerUrl || '');
  const [imageUrls, setImageUrls] = useState(movie.images.map((image) => image.url).join('\n'));
  const [isDraggingImages, setIsDraggingImages] = useState(false);
  const [error, setError] = useState('');

  const imageList = useMemo(() => imageUrls
    .split(/\r?\n/)
    .map((url) => url.trim())
    .filter(Boolean)
    .slice(0, 5), [imageUrls]);

  const appendImageUrls = (urls: string[]) => {
    setImageUrls((currentValue) => {
      const current = currentValue.split(/\r?\n/).map((url) => url.trim()).filter(Boolean);
      return Array.from(new Set([...current, ...urls])).slice(0, 5).join('\n');
    });
  };

  const imageUpload = useMutation({
    mutationFn: api.uploads.images,
    onSuccess: ({ images }) => appendImageUrls(images.map((image) => image.url)),
    onError: (reason: Error) => setError(reason.message),
  });

  const createCollection = useMutation({
    mutationFn: (name: string) => api.collections.create({ name }),
    onSuccess: (collection) => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      setCollectionIds((current) => current.includes(collection.id) ? current : [...current, collection.id]);
      setCollectionDraft('');
    },
    onError: (reason: Error) => setError(reason.message),
  });

  const save = useMutation({
    mutationFn: () => {
      const castNames = splitValues(cast);
      if (editAdditionalFields && castNames.length > 6) throw new Error('El reparto principal admite hasta 6 personas');
      return api.movies.update(movie.id, {
        ...movieToInput(movie),
        watched,
        favorite,
        watchlist,
        personalRating,
        collectionIds,
        genres: genreNames.map((name, order) => {
          const current = movie.genres.find((genre) => normalizeValue(genre.name) === normalizeValue(name));
          return current ? { name, tmdbGenreId: current.tmdbGenreId, tmdbMediaType: current.tmdbMediaType, order } : { name, order };
        }),
        platforms: platformNames.map((name, order) => {
          const current = movie.platforms.find((platform) => normalizeValue(platform.name) === normalizeValue(name));
          return current ? { name, tmdbProviderId: current.tmdbProviderId, logoPath: current.logoPath, isPrimary: order === 0, order } : { name, isPrimary: order === 0, order };
        }),
        images: imageList.map((url, order) => {
          const current = movie.images.find((image) => image.url === url);
          return {
            url,
            order,
            isPrimary: order === 0,
            localPath: current?.localPath,
            tmdbFilePath: current?.tmdbFilePath,
            altText: current?.altText,
          };
        }),
        ...(editAdditionalFields ? {
          type,
          originalTitle: originalTitle.trim(),
          spanishTitle: spanishTitle.trim() || null,
          year: numberOrNull(year),
          synopsis: synopsis.trim() || null,
          durationMinutes: numberOrNull(duration),
          seasons: type === 'series' ? numberOrNull(seasons) : null,
          totalEpisodes: type === 'series' ? numberOrNull(episodes) : null,
          imdbRating: numberOrNull(imdbRating),
          countries: splitValues(countries).map((name, order) => {
            const current = movie.countries.find((country) => normalizeValue(country.name) === normalizeValue(name));
            return { name, isoCode: current?.isoCode, order };
          }),
          credits: [
            ...splitValues(directors).map((name, order) => {
              const current = movie.credits.find((credit) => credit.creditType === 'director' && normalizeValue(credit.name) === normalizeValue(name));
              return { name, creditType: 'director' as const, order, tmdbPersonId: current?.tmdbPersonId, profilePath: current?.profilePath, tmdbCreditId: current?.tmdbCreditId, characterName: current?.characterName };
            }),
            ...castNames.map((name, index) => {
              const current = movie.credits.find((credit) => credit.creditType === 'cast' && normalizeValue(credit.name) === normalizeValue(name));
              return { name, creditType: 'cast' as const, order: splitValues(directors).length + index, tmdbPersonId: current?.tmdbPersonId, profilePath: current?.profilePath, tmdbCreditId: current?.tmdbCreditId, characterName: current?.characterName };
            }),
          ],
          keywords: splitValues(keywords).map((name, order) => {
            const current = movie.keywords.find((keyword) => normalizeValue(keyword.name) === normalizeValue(name));
            return { name, tmdbKeywordId: current?.tmdbKeywordId, order };
          }),
          imdbUrl: imdbUrl.trim() || null,
          tmdbUrl: tmdbUrl.trim() || null,
          justwatchUrl: justwatchUrl.trim() || null,
          trailerUrl: trailerUrl.trim() || null,
        } : {}),
      });
    },
    onSuccess: onSaved,
    onError: (reason: Error) => setError(reason.message),
  });

  const handleImageDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingImages(false);
    setError('');
    const remainingSlots = 5 - imageList.length;
    if (remainingSlots <= 0) {
      setError('Podés agregar hasta 5 imágenes.');
      return;
    }

    const files = Array.from(event.dataTransfer.files)
      .filter((file) => /^image\/(jpeg|png|webp)$/i.test(file.type))
      .slice(0, remainingSlots);
    if (files.length) {
      imageUpload.mutate(files);
      return;
    }

    const html = event.dataTransfer.getData('text/html');
    const htmlUrls = html
      ? Array.from(new DOMParser().parseFromString(html, 'text/html').querySelectorAll('img')).map((image) => image.src)
      : [];
    const uriUrls = event.dataTransfer.getData('text/uri-list').split(/\r?\n/).map((url) => url.trim()).filter((url) => url && !url.startsWith('#'));
    const plainUrl = event.dataTransfer.getData('text/plain').trim();
    const droppedUrls = Array.from(new Set([...htmlUrls, ...uriUrls, plainUrl]))
      .filter((url) => /^https?:\/\//i.test(url))
      .slice(0, remainingSlots);
    if (droppedUrls.length) appendImageUrls(droppedUrls);
    else setError('Arrastrá archivos JPG, PNG o WebP, o una imagen desde el navegador.');
  };

  const toggleCollection = (collectionId: string) => {
    setCollectionIds((current) => current.includes(collectionId)
      ? current.filter((id) => id !== collectionId)
      : [...current, collectionId]);
  };
  const submitCollection = () => {
    const name = collectionDraft.trim();
    if (!name || createCollection.isPending) return;
    const existing = collections.data?.find((collection) => collection.name.toLocaleLowerCase('es') === name.toLocaleLowerCase('es'));
    if (existing) {
      setCollectionIds((current) => current.includes(existing.id) ? current : [...current, existing.id]);
      setCollectionDraft('');
      return;
    }
    setError('');
    createCollection.mutate(name);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/55 sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="movie-edit-title">
      <form onSubmit={(event) => { event.preventDefault(); setError(''); save.mutate(); }} className={`max-h-[96vh] w-full overflow-hidden rounded-t-md bg-canvas shadow-xl transition-[max-width] sm:rounded-md ${editAdditionalFields ? 'sm:max-w-5xl' : 'sm:max-w-3xl'}`}>
        <header className="flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="min-w-0">
            <h2 id="movie-edit-title" className="truncate text-lg font-semibold text-ink">Editar {movie.originalTitle}</h2>
            <p className="text-xs text-slate-500">{editAdditionalFields ? 'Todos los datos del título' : 'Datos personales del título'}</p>
          </div>
          <button type="button" onClick={onClose} className="icon-button ml-auto border-0 shadow-none" title="Cerrar" aria-label="Cerrar"><X className="h-5 w-5" /></button>
        </header>

        <div className="flex max-h-[calc(96vh-128px)] flex-col overflow-y-auto p-4 sm:p-6">
          <section>
            <h3 className="field-label">Estado</h3>
            <div className="grid gap-2 sm:grid-cols-3">
              <button type="button" aria-pressed={watched} onClick={() => setWatched((current) => !current)} className={`secondary-button gap-2 text-xs uppercase ${watched ? 'border-[#2cbc63] bg-[#2cbc63]/10 text-[#218f4c]' : ''}`}><Eye className="h-[18px] w-[18px]" />Watch</button>
              <button type="button" aria-pressed={favorite} onClick={() => setFavorite((current) => !current)} className={`secondary-button gap-2 text-xs uppercase ${favorite ? 'border-coral bg-red-50 text-coral' : ''}`}><Heart className={`h-4 w-4 ${favorite ? 'fill-current' : ''}`} />Like</button>
              <button type="button" aria-pressed={watchlist} onClick={() => setWatchlist((current) => !current)} className={`secondary-button gap-2 text-xs uppercase ${watchlist ? 'border-aqua bg-mist text-aqua' : ''}`}><Bookmark className={`h-4 w-4 ${watchlist ? 'fill-current' : ''}`} />Watchlist</button>
            </div>
          </section>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <AssociationPicker label="Género" options={metadata.data?.genres || []} selected={genreNames} onChange={setGenreNames} />
            <AssociationPicker label="Plataforma" options={metadata.data?.platforms || []} selected={platformNames} onChange={setPlatformNames} />
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <fieldset>
              <legend className="field-label">Colección</legend>
              <div className="max-h-44 overflow-y-auto rounded-md border border-slate-200 bg-white p-2">
                {collections.isLoading ? <div className="grid h-20 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-aqua" /></div>
                  : collections.data?.length ? collections.data.map((collection) => (
                    <label key={collection.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50">
                      <input type="checkbox" checked={collectionIds.includes(collection.id)} onChange={() => toggleCollection(collection.id)} className="h-4 w-4 accent-aqua" />
                      <span>{collection.name}</span>
                    </label>
                  )) : <p className="px-2 py-3 text-sm text-slate-400">Todavía no hay colecciones.</p>}
              </div>
              <div className="mt-2 flex gap-2">
                <input value={collectionDraft} onChange={(event) => setCollectionDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); submitCollection(); } }} className="control min-w-0 flex-1" placeholder="Crear colección" />
                <button type="button" onClick={submitCollection} disabled={!collectionDraft.trim() || createCollection.isPending} className="icon-button" title="Crear y seleccionar colección" aria-label="Crear y seleccionar colección">
                  {createCollection.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </button>
              </div>
            </fieldset>

            <div>
              <span className="field-label">Rate</span>
              <StarRating value={personalRating} onChange={setPersonalRating} disabled={save.isPending} />
              <p className="mt-1 text-xs text-slate-400">{personalRating ? `${personalRating} de 5` : 'Sin puntuación'}</p>
            </div>
          </div>

          {editAdditionalFields && <section className="order-last mt-5 flex flex-col rounded-md border border-slate-200 bg-white p-4">
            <h3 className="field-label mb-3">Otros campos</h3>
            <section className={`relative order-last mt-5 rounded-md border-2 border-dashed p-3 transition-colors ${isDraggingImages ? 'border-coral bg-red-50' : 'border-slate-200'}`}
              onDragEnter={(event) => { event.preventDefault(); setIsDraggingImages(true); }}
              onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; setIsDraggingImages(true); }}
              onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDraggingImages(false); }}
              onDrop={handleImageDrop}>
            {isDraggingImages && <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center rounded-md border-2 border-coral bg-white/90 text-coral"><div className="flex items-center gap-2 text-sm font-semibold"><ImagePlus className="h-5 w-5" />Soltar imágenes</div></div>}
            <h3 className="field-label">Imágenes (máximo 5)</h3>
            {imageList.length > 0 && (
              <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {imageList.map((url, index) => (
                  <div key={`${url}-${index}`} className="overflow-hidden rounded-md border border-slate-200 bg-white">
                    <img src={resolveMovieImageUrl(url)} alt="" className="aspect-[2/3] w-full object-cover" />
                    <div className="flex justify-center gap-1 p-1">
                      <button type="button" disabled={index === 0} onClick={() => { const next = [...imageList]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; setImageUrls(next.join('\n')); }} className="icon-button h-8 w-8" title="Mover antes"><ArrowUp className="h-3.5 w-3.5" /></button>
                      <button type="button" disabled={index === imageList.length - 1} onClick={() => { const next = [...imageList]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; setImageUrls(next.join('\n')); }} className="icon-button h-8 w-8" title="Mover después"><ArrowDown className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => setImageUrls(imageList.filter((_, current) => current !== index).join('\n'))} className="icon-button h-8 w-8 text-red-600" title="Quitar"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <label className="secondary-button mb-2 cursor-pointer gap-2">
              <ImagePlus className="h-4 w-4" />
              {imageUpload.isPending ? 'Procesando...' : 'Subir imágenes'}
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" disabled={imageUpload.isPending || imageList.length >= 5} onChange={(event) => { const files = Array.from(event.target.files || []).slice(0, 5 - imageList.length); if (files.length) imageUpload.mutate(files); event.target.value = ''; }} />
            </label>
            <textarea value={imageUrls} onChange={(event) => setImageUrls(event.target.value)} className="control min-h-24 w-full py-2" placeholder="También podés pegar una URL por línea" />
            </section>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label><span className="field-label">Tipo</span><select value={type} onChange={(event) => setType(event.target.value as MovieType)} className="control w-full"><option value="movie">Película</option><option value="series">Serie</option></select></label>
              <label><span className="field-label">Título original</span><input value={originalTitle} onChange={(event) => setOriginalTitle(event.target.value)} className="control w-full" maxLength={250} required /></label>
              <label><span className="field-label">Título en español</span><input value={spanishTitle} onChange={(event) => setSpanishTitle(event.target.value)} className="control w-full" maxLength={250} /></label>
              <label><span className="field-label">Año</span><input type="number" min="1888" max="2200" value={year} onChange={(event) => setYear(event.target.value)} className="control w-full" /></label>
              <label><span className="field-label">Duración en minutos</span><input type="number" min="1" max="9999" value={duration} onChange={(event) => setDuration(event.target.value)} className="control w-full" /></label>
              <label><span className="field-label">Puntuación IMDb</span><input type="number" min="0" max="10" step="0.1" value={imdbRating} onChange={(event) => setImdbRating(event.target.value)} className="control w-full" /></label>
              {type === 'series' && <>
                <label><span className="field-label">Temporadas</span><input type="number" min="1" max="999" value={seasons} onChange={(event) => setSeasons(event.target.value)} className="control w-full" /></label>
                <label><span className="field-label">Episodios</span><input type="number" min="1" max="99999" value={episodes} onChange={(event) => setEpisodes(event.target.value)} className="control w-full" /></label>
              </>}
              <label className="sm:col-span-2 lg:col-span-3"><span className="field-label">Sinopsis</span><textarea value={synopsis} onChange={(event) => setSynopsis(event.target.value)} className="control min-h-32 w-full py-2" maxLength={10000} /></label>
              <label><span className="field-label">País</span><input value={countries} onChange={(event) => setCountries(event.target.value)} className="control w-full" placeholder="Separar con comas" /></label>
              <label><span className="field-label">Dirección</span><input value={directors} onChange={(event) => setDirectors(event.target.value)} className="control w-full" placeholder="Separar con comas" /></label>
              <label><span className="field-label">Reparto</span><input value={cast} onChange={(event) => setCast(event.target.value)} className="control w-full" placeholder="Hasta 6, separados con comas" /></label>
              <label className="sm:col-span-2 lg:col-span-3"><span className="field-label">Palabras clave</span><input value={keywords} onChange={(event) => setKeywords(event.target.value)} className="control w-full" placeholder="Separar con comas" /></label>
              <label><span className="field-label">Link IMDb</span><input type="url" value={imdbUrl} onChange={(event) => setImdbUrl(event.target.value)} className="control w-full" placeholder="https://..." /></label>
              <label><span className="field-label">Link TMDB</span><input type="url" value={tmdbUrl} onChange={(event) => setTmdbUrl(event.target.value)} className="control w-full" placeholder="https://..." /></label>
              <label><span className="field-label">Link JustWatch</span><input type="url" value={justwatchUrl} onChange={(event) => setJustwatchUrl(event.target.value)} className="control w-full" placeholder="https://..." /></label>
              <label><span className="field-label">Link del trailer</span><input type="url" value={trailerUrl} onChange={(event) => setTrailerUrl(event.target.value)} className="control w-full" placeholder="https://..." /></label>
            </div>
          </section>}

          {error && <p className="order-last mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        </div>

        <footer className="flex h-16 items-center justify-end gap-2 border-t border-slate-200 bg-white px-4 sm:px-6">
          <button type="button" onClick={() => setEditAdditionalFields((current) => !current)} className="secondary-button">{editAdditionalFields ? 'Ocultar otros campos' : 'Editar otros campos'}</button>
          <button type="button" onClick={onClose} className="secondary-button">Cancelar</button>
          <button type="submit" disabled={save.isPending || imageUpload.isPending || createCollection.isPending || (editAdditionalFields && !originalTitle.trim())} className="primary-button">{save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Guardar</button>
        </footer>
      </form>
    </div>
  );
};
