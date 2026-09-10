import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Loader2, MonitorPlay, MoreVertical, Pencil, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { resolvePlatformLogoUrl } from '@/components/PlatformLogos';
import { api } from '@/services/api';
import type { PlatformCatalogItem } from '@/types/movie';

export const PlatformsPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const platforms = useQuery({ queryKey: ['platforms'], queryFn: api.platforms.getAll });
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editing, setEditing] = useState<PlatformCatalogItem | null>(null);
  const [deleting, setDeleting] = useState<PlatformCatalogItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editDroppedUrl, setEditDroppedUrl] = useState<string | null>(null);
  const [editPreview, setEditPreview] = useState<string | null>(null);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    if (!editFile) return undefined;
    const previewUrl = URL.createObjectURL(editFile);
    setEditPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [editFile]);

  const beginEdit = (platform: PlatformCatalogItem) => {
    setOpenMenuId(null);
    setEditing(platform);
    setEditName(platform.name);
    setEditFile(null);
    setEditDroppedUrl(null);
    setEditPreview(resolvePlatformLogoUrl(platform));
    setIsDraggingImage(false);
    setEditError('');
  };
  const showPlatformMovies = (platformId: string) => {
    try {
      window.sessionStorage.setItem('moviebox:platform-filter', platformId);
    } catch {
      // The library remains accessible even if session storage is unavailable.
    }
    navigate('/');
  };

  const updatePlatform = useMutation({
    mutationFn: async () => {
      if (!editing) throw new Error('Plataforma no encontrada');
      const name = editName.trim();
      if (!name) throw new Error('Escribí un título para la plataforma');
      let logoPath: string | undefined = editing.logoPath ? undefined : resolvePlatformLogoUrl(editing) || undefined;
      if (editFile) {
        const uploaded = await api.uploads.images([editFile]);
        logoPath = uploaded.images[0]?.url;
        if (!logoPath) throw new Error('No se pudo guardar la imagen');
      } else if (editDroppedUrl) {
        logoPath = editDroppedUrl;
      }
      return api.platforms.update(editing.id, { name, ...(logoPath ? { logoPath } : {}) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platforms'] });
      queryClient.invalidateQueries({ queryKey: ['metadata'] });
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      setEditing(null);
    },
    onError: (reason: Error) => setEditError(reason.message),
  });

  const deletePlatform = useMutation({
    mutationFn: (platform: PlatformCatalogItem) => api.platforms.remove(platform.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platforms'] });
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
      return;
    }
    const html = event.dataTransfer.getData('text/html');
    const htmlUrls = html ? Array.from(new DOMParser().parseFromString(html, 'text/html')
      .querySelectorAll('img')).map((image) => image.src) : [];
    const uriUrls = event.dataTransfer.getData('text/uri-list').split(/\r?\n/).map((url) => url.trim()).filter((url) => url && !url.startsWith('#'));
    const plainUrl = event.dataTransfer.getData('text/plain').trim();
    const imageUrl = [...htmlUrls, ...uriUrls, plainUrl].find((url) => /^https?:\/\//i.test(url));
    if (imageUrl) {
      setEditFile(null);
      setEditDroppedUrl(imageUrl);
      setEditPreview(imageUrl);
      return;
    }
    setEditError('Arrastrá un archivo JPG, PNG o WebP, o una imagen desde una página web.');
  };

  return (
    <main className="min-h-screen bg-canvas">
      <Header />
      <section className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-[1500px] px-4 py-4 sm:px-6">
          <h1 className="font-bebas text-2xl font-normal uppercase text-ink">Plataformas</h1>
          <p className="mt-0.5 text-xs text-slate-500">{platforms.data?.length || 0} plataformas</p>
        </div>
      </section>

      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8">
        {platforms.isLoading ? (
          <div className="grid min-h-[45vh] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-aqua" /></div>
        ) : platforms.isError ? (
          <div className="grid min-h-[45vh] place-items-center text-center"><div><p className="font-semibold text-ink">No se pudieron cargar las plataformas</p><button type="button" onClick={() => platforms.refetch()} className="primary-button mt-4">Reintentar</button></div></div>
        ) : platforms.data?.length ? (
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {platforms.data.map((platform) => {
              const imageUrl = resolvePlatformLogoUrl(platform);
              return (
                <article key={platform.id} role="button" tabIndex={0} onClick={() => showPlatformMovies(platform.id)} onKeyDown={(event) => { if ((event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget) { event.preventDefault(); showPlatformMovies(platform.id); } }} className={`relative flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-md bg-white shadow-card transition-transform hover:-translate-y-0.5 ${openMenuId === platform.id ? 'z-20 overflow-visible' : ''}`}>
                  <div className="relative aspect-square overflow-hidden rounded-t-md bg-slate-100">
                    {imageUrl ? <img src={imageUrl} alt={platform.name} className="h-full w-full object-contain p-3" loading="lazy" /> : <div className="grid h-full place-items-center"><MonitorPlay className="h-16 w-16 text-aqua" /></div>}
                    <div className="absolute right-2 top-2" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpenMenuId(null); }}>
                      <button type="button" onClick={() => setOpenMenuId((current) => current === platform.id ? null : platform.id)} className="grid h-8 w-8 place-items-center rounded-md border border-white/60 bg-white/80 text-slate-600 shadow-sm backdrop-blur-sm hover:bg-white" title="Más acciones" aria-label={`Acciones de ${platform.name}`} aria-expanded={openMenuId === platform.id}><MoreVertical className="h-4 w-4" /></button>
                      {openMenuId === platform.id && <div className="absolute right-0 top-9 z-30 w-40 rounded-md border border-slate-200 bg-white p-1.5 text-sm shadow-card">
                        <button type="button" onClick={() => beginEdit(platform)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-slate-600 hover:bg-slate-50"><Pencil className="h-4 w-4" />Editar</button>
                        <button type="button" onClick={() => { setOpenMenuId(null); setDeleting(platform); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" />Eliminar</button>
                      </div>}
                    </div>
                  </div>
                  <div className="p-3"><h2 className="font-bebas line-clamp-2 text-[24px] font-normal uppercase leading-7 text-ink">{platform.name}</h2></div>
                </article>
              );
            })}
          </section>
        ) : (
          <div className="grid min-h-[45vh] place-items-center text-center"><div><MonitorPlay className="mx-auto h-14 w-14 text-aqua" /><h2 className="mt-4 text-lg font-semibold text-ink">No hay plataformas</h2></div></div>
        )}
      </div>

      {editing && <div className="fixed inset-0 z-[70] grid place-items-center bg-ink/55 p-4" role="dialog" aria-modal="true" aria-labelledby="edit-platform-title">
        <form onSubmit={(event) => { event.preventDefault(); setEditError(''); updatePlatform.mutate(); }} className="w-full max-w-lg overflow-hidden rounded-md bg-canvas shadow-xl">
          <header className="flex min-h-16 items-center border-b border-slate-200 bg-white px-5">
            <h2 id="edit-platform-title" className="font-bebas text-2xl uppercase text-ink">Editar plataforma</h2>
            <button type="button" onClick={() => setEditing(null)} className="icon-button ml-auto border-0 shadow-none" title="Cerrar" aria-label="Cerrar"><X className="h-5 w-5" /></button>
          </header>
          <div className="space-y-5 p-5">
            <label className="block"><span className="field-label">Título</span><input autoFocus value={editName} onChange={(event) => setEditName(event.target.value)} className="control w-full" maxLength={80} /></label>
            <div>
              <span className="field-label">Imagen</span>
              <label
                className={`relative flex cursor-pointer items-center gap-4 rounded-md border-2 border-dashed bg-white p-3 transition-colors ${isDraggingImage ? 'border-coral bg-red-50' : 'border-slate-300 hover:border-aqua'}`}
                onDragEnter={(event) => { event.preventDefault(); setIsDraggingImage(true); }}
                onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; setIsDraggingImage(true); }}
                onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDraggingImage(false); }}
                onDrop={handleImageDrop}
              >
                {isDraggingImage && <span className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-md bg-white/90 text-sm font-semibold text-coral"><span className="flex items-center gap-2"><ImagePlus className="h-5 w-5" />Soltar imagen</span></span>}
                <span className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-md bg-slate-100">{editPreview ? <img src={editPreview} alt="Vista previa" className="h-full w-full object-contain p-2" /> : <ImagePlus className="h-8 w-8 text-aqua" />}</span>
                <span><span className="block text-sm font-semibold text-ink">Cambiar o arrastrar imagen</span><span className="mt-1 block text-xs text-slate-500">Archivo JPG, PNG o WebP, o imagen de una página web</span></span>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { setEditDroppedUrl(null); setEditFile(event.target.files?.[0] || null); }} className="hidden" />
              </label>
            </div>
            {editError && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{editError}</p>}
          </div>
          <footer className="flex justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4"><button type="button" onClick={() => setEditing(null)} className="secondary-button">Cancelar</button><button type="submit" disabled={updatePlatform.isPending || !editName.trim()} className="primary-button">{updatePlatform.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Guardar</button></footer>
        </form>
      </div>}

      {deleting && <div className="fixed inset-0 z-[70] grid place-items-center bg-ink/55 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-platform-title">
        <div className="w-full max-w-md rounded-md bg-white p-5 shadow-xl">
          <h2 id="delete-platform-title" className="text-lg font-semibold text-ink">Eliminar plataforma</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">¿Eliminar {deleting.name}? Se quitará de {deleting.movieCount} {deleting.movieCount === 1 ? 'título asociado' : 'títulos asociados'}. Los títulos no se eliminarán.</p>
          {deletePlatform.isError && <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{deletePlatform.error.message}</p>}
          <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setDeleting(null)} className="secondary-button">Cancelar</button><button type="button" onClick={() => deletePlatform.mutate(deleting)} disabled={deletePlatform.isPending} className="primary-button bg-red-600 hover:bg-red-700">{deletePlatform.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Eliminar</button></div>
        </div>
      </div>}
    </main>
  );
};
