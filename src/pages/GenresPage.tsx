import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clapperboard, Compass, Drama, Eye, Ghost, Heart, ImagePlus, Landmark, Laugh, Loader2, MoreVertical, Mountain, Music2, Pencil, Rocket, Search, ShieldAlert, Sparkles, Swords, Plus, Tags, Trash2, Tv, UsersRound, WandSparkles, X, type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { CatalogCreateForm } from '@/components/CatalogCreateForm';
import { CatalogToolbar, catalogGridClass, type CatalogViewMode } from '@/components/CatalogToolbar';
import { api, resolveMovieImageUrl } from '@/services/api';
import { getGenreIconImage, normalizeGenreName } from '@/utils/genreIcons';
import { getPersistedCatalogView, persistCatalogView } from '@/utils/persistedCatalogView';
import { getPersistedSortDirection, persistSortDirection } from '@/utils/persistedSort';
import type { GenreCatalogItem, SortDirection } from '@/types/movie';

const resolveGenreImageUrl = (genre: Pick<GenreCatalogItem, 'imagePath'>) => {
  if (!genre.imagePath) return null;
  if (genre.imagePath.startsWith('/uploads/') || genre.imagePath.startsWith('uploads/')) return resolveMovieImageUrl(genre.imagePath);
  if (/^(https?:|data:|blob:)/i.test(genre.imagePath)) return genre.imagePath;
  return genre.imagePath.startsWith('/') ? genre.imagePath : `/${genre.imagePath}`;
};

const genreIconMatchers: Array<{ terms: string[]; icon: LucideIcon }> = [
  { terms: ['ciencia ficcion', 'science fiction', 'sci-fi'], icon: Rocket },
  { terms: ['pelicula de tv', 'tv movie'], icon: Tv },
  { terms: ['aventura', 'adventure'], icon: Compass },
  { terms: ['animacion', 'animation'], icon: Sparkles },
  { terms: ['comedia', 'comedy'], icon: Laugh },
  { terms: ['crimen', 'crime'], icon: ShieldAlert },
  { terms: ['documental', 'documentary'], icon: Clapperboard },
  { terms: ['drama'], icon: Drama },
  { terms: ['familia', 'family'], icon: UsersRound },
  { terms: ['fantasia', 'fantasy'], icon: WandSparkles },
  { terms: ['historia', 'history'], icon: Landmark },
  { terms: ['terror', 'horror'], icon: Ghost },
  { terms: ['musica', 'music'], icon: Music2 },
  { terms: ['misterio', 'mystery'], icon: Search },
  { terms: ['romance'], icon: Heart },
  { terms: ['suspense', 'thriller'], icon: Eye },
  { terms: ['belica', 'guerra', 'war'], icon: Swords },
  { terms: ['western', 'oeste'], icon: Mountain },
];

const getGenreIcon = (name: string) => {
  const normalizedName = normalizeGenreName(name);
  return genreIconMatchers.find(({ terms }) => terms.some((term) => normalizedName.includes(term)))?.icon || Tags;
};

export const GenresPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const genres = useQuery({ queryKey: ['genres'], queryFn: api.genres.getAll });
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editing, setEditing] = useState<GenreCatalogItem | null>(null);
  const [deleting, setDeleting] = useState<GenreCatalogItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [editName, setEditName] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editDroppedUrl, setEditDroppedUrl] = useState<string | null>(null);
  const [editPreview, setEditPreview] = useState<string | null>(null);
  const [editImageRemoved, setEditImageRemoved] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [editError, setEditError] = useState('');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<CatalogViewMode>(() => getPersistedCatalogView('moviebox:genres-view', 'large'));
  const [sortDirection, setSortDirection] = useState<SortDirection>(() => getPersistedSortDirection('moviebox:genres-sort'));

  useEffect(() => persistSortDirection('moviebox:genres-sort', sortDirection), [sortDirection]);
  useEffect(() => persistCatalogView('moviebox:genres-view', viewMode), [viewMode]);

  const visibleGenres = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es');
    const direction = sortDirection === 'asc' ? 1 : -1;
    return (genres.data || [])
      .filter((genre) => !query || genre.name.toLocaleLowerCase('es').includes(query))
      .sort((left, right) => direction * left.name.localeCompare(right.name, 'es', { sensitivity: 'base' }));
  }, [genres.data, search, sortDirection]);

  useEffect(() => {
    if (!editFile) return undefined;
    const previewUrl = URL.createObjectURL(editFile);
    setEditPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [editFile]);

  const showGenreMovies = (genreId: string) => {
    try {
      window.sessionStorage.setItem('moviebox:genre-filter', genreId);
    } catch {
      // The library remains accessible even if session storage is unavailable.
    }
    navigate('/biblioteca');
  };

  const createGenre = async (name: string, imagePath: string | null) => {
    const created = await api.metadata.create('genres', name);
    if (imagePath) await api.genres.update(created.id, { name: created.name, imagePath });
    queryClient.invalidateQueries({ queryKey: ['genres'] });
    queryClient.invalidateQueries({ queryKey: ['metadata'] });
  };
  const beginEdit = (genre: GenreCatalogItem) => {
    setOpenMenuId(null);
    setCreating(false);
    setEditing(genre);
    setEditName(genre.name);
    setEditFile(null);
    setEditDroppedUrl(null);
    setEditPreview(resolveGenreImageUrl(genre));
    setEditImageRemoved(false);
    setIsDraggingImage(false);
    setEditError('');
  };

  const updateGenre = useMutation({
    mutationFn: async () => {
      if (!editing) throw new Error('Género no encontrado');
      const name = editName.trim();
      if (!name) throw new Error('Escribí un título para el género');
      let imagePath: string | null | undefined = editImageRemoved ? null : undefined;
      if (editFile) {
        const uploaded = await api.uploads.images([editFile]);
        imagePath = uploaded.images[0]?.url;
        if (!imagePath) throw new Error('No se pudo guardar la imagen');
      } else if (editDroppedUrl) {
        imagePath = editDroppedUrl;
      }
      return api.genres.update(editing.id, { name, ...(imagePath !== undefined ? { imagePath } : {}) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['genres'] });
      queryClient.invalidateQueries({ queryKey: ['metadata'] });
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      setEditing(null);
    },
    onError: (reason: Error) => setEditError(reason.message),
  });

  const deleteGenre = useMutation({
    mutationFn: (genre: GenreCatalogItem) => api.genres.remove(genre.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['genres'] });
      queryClient.invalidateQueries({ queryKey: ['metadata'] });
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      setDeleting(null);
    },
  });

  const handleImageDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDraggingImage(false);
    setEditError('');
    const file = Array.from(event.dataTransfer.files).find((item) => /^image\/(jpeg|png|webp)$/i.test(item.type));
    if (file) {
      setEditDroppedUrl(null);
      setEditFile(file);
      setEditImageRemoved(false);
      return;
    }
    const html = event.dataTransfer.getData('text/html');
    const htmlUrls = html ? Array.from(new DOMParser().parseFromString(html, 'text/html').querySelectorAll('img')).map((image) => image.src) : [];
    const uriUrls = event.dataTransfer.getData('text/uri-list').split(/\r?\n/).map((url) => url.trim()).filter((url) => url && !url.startsWith('#'));
    const plainUrl = event.dataTransfer.getData('text/plain').trim();
    const imageUrl = [...htmlUrls, ...uriUrls, plainUrl].find((url) => /^https?:\/\//i.test(url));
    if (imageUrl) {
      setEditFile(null);
      setEditDroppedUrl(imageUrl);
      setEditPreview(imageUrl);
      setEditImageRemoved(false);
      return;
    }
    setEditError('Arrastrá un archivo JPG, PNG o WebP, o una imagen desde una página web.');
  };

  return (
    <main className="min-h-screen bg-canvas">
      <Header />
      <CatalogToolbar title="Géneros" itemLabel="géneros" visibleCount={visibleGenres.length} totalCount={genres.data?.length || 0} search={search} onSearchChange={setSearch} viewMode={viewMode} onViewModeChange={setViewMode} sortDirection={sortDirection} onSortDirectionChange={setSortDirection} inlineControlsOnTablet action={<button type="button" onClick={() => { setEditing(null); setCreating(true); }} className="primary-button h-9 px-3"><Plus className="h-4 w-4" />Nuevo</button>} />

      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8">
        {creating && <CatalogCreateForm heading="Nuevo género" nameLabel="Nombre" duplicateMessage="Ya existe un género con ese nombre" existingNames={(genres.data || []).map((genre) => genre.name)} onCreate={createGenre} onClose={() => setCreating(false)} />}
        {genres.isLoading ? <div className="grid min-h-[45vh] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-aqua" /></div>
          : genres.isError ? <div className="grid min-h-[45vh] place-items-center text-center"><div><p className="font-semibold text-ink">No se pudieron cargar los géneros</p><button type="button" onClick={() => genres.refetch()} className="primary-button mt-4">Reintentar</button></div></div>
            : genres.data?.length ? visibleGenres.length ? <section className={catalogGridClass[viewMode]}>
              {visibleGenres.map((genre) => {
                const imageUrl = resolveGenreImageUrl(genre);
                const iconImage = getGenreIconImage(genre.name);
                const GenreIcon = getGenreIcon(genre.name);
                return <article key={genre.id} role="button" tabIndex={0} onClick={() => showGenreMovies(genre.id)} onKeyDown={(event) => { if ((event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget) { event.preventDefault(); showGenreMovies(genre.id); } }} className={`movie-card relative flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-md bg-white shadow-card transition-transform hover:-translate-y-0.5 ${openMenuId === genre.id ? 'z-20 overflow-visible' : ''}`}>
                  <div className="relative aspect-square overflow-hidden rounded-t-md bg-slate-100">
                    {iconImage
                      ? <div className="grid h-full place-items-center" title={`Icono de ${genre.name}`}><img src={iconImage} alt={`Icono de ${genre.name}`} className="h-[72%] w-[72%] object-contain" /></div>
                      : imageUrl
                      ? <><img src={imageUrl} alt={genre.name} className="h-full w-full object-cover" loading="lazy" /><div className="absolute bottom-2 left-2 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-aqua shadow-sm backdrop-blur-sm" title={`Icono de ${genre.name}`}><GenreIcon className="h-5 w-5" /></div></>
                      : <div className="grid h-full place-items-center" title={`Icono de ${genre.name}`}><GenreIcon className="h-16 w-16 text-aqua" /></div>}
                    <div className="absolute right-2 top-2" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpenMenuId(null); }}>
                      <button type="button" onClick={() => setOpenMenuId((current) => current === genre.id ? null : genre.id)} className={`moviebox-translucent-action grid place-items-center rounded-md border border-white/60 bg-white/80 text-slate-600 shadow-sm backdrop-blur-sm hover:bg-white ${viewMode === 'large' ? 'h-8 w-8' : 'h-6 w-6'}`} title="Más acciones" aria-label={`Acciones de ${genre.name}`} aria-expanded={openMenuId === genre.id}><MoreVertical className={viewMode === 'large' ? 'h-4 w-4' : 'h-3.5 w-3.5'} /></button>
                      {openMenuId === genre.id && <div className={`movie-card-dropdown absolute right-0 z-30 w-40 rounded-md border border-slate-200 bg-white p-1.5 text-sm shadow-card ${viewMode === 'large' ? 'top-9' : 'top-7'}`}>
                        <button type="button" onClick={() => beginEdit(genre)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-slate-600 hover:bg-slate-50"><Pencil className="h-4 w-4" />Editar</button>
                        <button type="button" onClick={() => { setOpenMenuId(null); setDeleting(genre); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" />Eliminar</button>
                      </div>}
                    </div>
                  </div>
                  <div className="p-3">
                    <h2 className="font-bebas line-clamp-2 text-[24px] font-normal uppercase leading-7 text-ink">{genre.name}</h2>
                    <p className="mt-1 text-xs text-slate-500">{genre.movieCount} {genre.movieCount === 1 ? 'título' : 'títulos'}</p>
                  </div>
                </article>;
              })}
            </section> : <div className="grid min-h-[45vh] place-items-center text-center"><div><Tags className="mx-auto h-14 w-14 text-aqua" /><h2 className="mt-4 text-lg font-semibold text-ink">No hay coincidencias</h2></div></div> : <div className="grid min-h-[45vh] place-items-center text-center"><div><Tags className="mx-auto h-14 w-14 text-aqua" /><h2 className="mt-4 text-lg font-semibold text-ink">No hay géneros</h2></div></div>}
      </div>

      {editing && <div className="fixed inset-0 z-[70] grid place-items-center bg-ink/55 p-4" role="dialog" aria-modal="true" aria-labelledby="edit-genre-title">
        <form onSubmit={(event) => { event.preventDefault(); setEditError(''); updateGenre.mutate(); }} className="movie-detail-modal w-full max-w-lg overflow-hidden rounded-md bg-canvas shadow-xl">
          <header className="flex min-h-16 items-center border-b border-slate-200 bg-white px-5"><h2 id="edit-genre-title" className="font-bebas text-2xl uppercase text-ink">Editar género</h2><button type="button" onClick={() => setEditing(null)} className="icon-button ml-auto border-0 shadow-none" title="Cerrar" aria-label="Cerrar"><X className="h-5 w-5" /></button></header>
          <div className="space-y-5 p-5">
            <label className="block"><span className="field-label">Título</span><input autoFocus value={editName} onChange={(event) => setEditName(event.target.value)} className="control w-full" maxLength={80} /></label>
            <div><span className="field-label">Imagen</span><label className={`relative flex cursor-pointer items-center gap-4 rounded-md border-2 border-dashed bg-white p-3 transition-colors ${isDraggingImage ? 'border-coral bg-red-50' : 'border-slate-300 hover:border-aqua'}`} onDragEnter={(event) => { event.preventDefault(); setIsDraggingImage(true); }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; setIsDraggingImage(true); }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDraggingImage(false); }} onDrop={handleImageDrop}>
              {isDraggingImage && <span className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-md bg-white/90 text-sm font-semibold text-coral"><span className="flex items-center gap-2"><ImagePlus className="h-5 w-5" />Soltar imagen</span></span>}
              <span className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-md bg-slate-100">{editPreview ? <img src={editPreview} alt="Vista previa" className="h-full w-full object-cover" /> : <ImagePlus className="h-8 w-8 text-aqua" />}</span>
              <span><span className="block text-sm font-semibold text-ink">Cambiar o arrastrar imagen</span><span className="mt-1 block text-xs text-slate-500">Archivo JPG, PNG o WebP, o imagen de una página web</span></span>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0] || null; setEditDroppedUrl(null); setEditFile(file); if (file) setEditImageRemoved(false); }} className="hidden" />
            </label>{editPreview && <button type="button" onClick={() => { setEditFile(null); setEditDroppedUrl(null); setEditPreview(null); setEditImageRemoved(true); }} className="secondary-button mt-2 gap-2 text-red-600"><Trash2 className="h-4 w-4" />Eliminar imagen</button>}</div>
            {editError && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{editError}</p>}
          </div>
          <footer className="flex justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4"><button type="button" onClick={() => setEditing(null)} className="secondary-button">Cancelar</button><button type="submit" disabled={updateGenre.isPending || !editName.trim()} className="primary-button">{updateGenre.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Guardar</button></footer>
        </form>
      </div>}

      {deleting && <div className="fixed inset-0 z-[70] grid place-items-center bg-ink/55 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-genre-title">
        <div className="movie-detail-modal w-full max-w-md overflow-hidden rounded-md bg-canvas shadow-xl">
          <header className="flex min-h-16 items-center border-b border-slate-200 bg-white px-5"><h2 id="delete-genre-title" className="text-lg font-semibold text-ink">Eliminar género</h2></header>
          <div className="p-5">
            <p className="text-sm leading-6 text-slate-600">¿Eliminar {deleting.name}? Se quitará de {deleting.movieCount} {deleting.movieCount === 1 ? 'título asociado' : 'títulos asociados'}. Los títulos no se eliminarán.</p>
            {deleteGenre.isError && <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{deleteGenre.error.message}</p>}
          </div>
          <footer className="flex justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4"><button type="button" onClick={() => setDeleting(null)} className="secondary-button">Cancelar</button><button type="button" onClick={() => deleteGenre.mutate(deleting)} disabled={deleteGenre.isPending} className="primary-button bg-red-600 hover:bg-red-700">{deleteGenre.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Eliminar</button></footer>
        </div>
      </div>}
    </main>
  );
};
