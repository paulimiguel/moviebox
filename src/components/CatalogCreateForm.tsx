import { useEffect, useState } from 'react';
import { FolderOpen, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { api } from '@/services/api';

const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLocaleLowerCase('es');

export const CatalogCreateForm = ({ heading, nameLabel, duplicateMessage, existingNames, imageFit = 'cover', onCreate, onClose }: {
  heading: string;
  nameLabel: string;
  duplicateMessage: string;
  existingNames: string[];
  imageFit?: 'cover' | 'contain';
  onCreate: (name: string, imageUrl: string | null) => Promise<unknown>;
  onClose: () => void;
}) => {
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [droppedUrl, setDroppedUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!file) return undefined;
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [file]);

  const clearImage = () => {
    setFile(null);
    setDroppedUrl(null);
    setPreview(null);
  };

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    setError('');
    const droppedFile = Array.from(event.dataTransfer.files).find((item) => /^image\/(jpeg|png|webp)$/i.test(item.type));
    if (droppedFile) {
      setDroppedUrl(null);
      setFile(droppedFile);
      return;
    }
    const html = event.dataTransfer.getData('text/html');
    const htmlUrls = html ? Array.from(new DOMParser().parseFromString(html, 'text/html').querySelectorAll('img')).map((image) => image.src) : [];
    const uriUrls = event.dataTransfer.getData('text/uri-list').split(/\r?\n/).map((url) => url.trim()).filter((url) => url && !url.startsWith('#'));
    const plainUrl = event.dataTransfer.getData('text/plain').trim();
    const imageUrl = [...htmlUrls, ...uriUrls, plainUrl].find((url) => /^https?:\/\//i.test(url));
    if (imageUrl) {
      setFile(null);
      setDroppedUrl(imageUrl);
      setPreview(imageUrl);
      return;
    }
    setError('Arrastrá un archivo JPG, PNG o WebP, o una imagen desde una página web.');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    if (existingNames.some((existing) => normalize(existing) === normalize(trimmed))) {
      setError(duplicateMessage);
      return;
    }
    setSaving(true);
    setError('');
    try {
      let imageUrl: string | null = null;
      if (file) {
        const uploaded = await api.uploads.images([file]);
        imageUrl = uploaded.images[0]?.url || null;
        if (!imageUrl) throw new Error('No se pudo guardar la imagen');
      } else if (droppedUrl) {
        imageUrl = droppedUrl;
      }
      await onCreate(trimmed, imageUrl);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo crear');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="movie-detail-modal mb-6 border-y border-slate-200 bg-white p-4 sm:rounded-md sm:border sm:p-5">
      <h2 className="font-bebas text-xl uppercase text-ink">{heading}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <label className="block">
            <span className="field-label">{nameLabel}</span>
            <input className="control w-full" value={name} onChange={(event) => { setName(event.target.value); setError(''); }} placeholder={nameLabel} maxLength={80} autoFocus />
          </label>
          <div>
            <span className="field-label">Imagen de portada</span>
            <label
              className={`relative flex cursor-pointer items-center gap-4 rounded-md border-2 border-dashed bg-white p-3 transition-colors ${dragging ? 'border-coral bg-red-50' : 'border-slate-300 hover:border-aqua'}`}
              onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
              onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; setDragging(true); }}
              onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
              onDrop={handleDrop}
            >
              {dragging && <span className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-md bg-white/90 text-sm font-semibold text-coral"><span className="flex items-center gap-2"><ImagePlus className="h-5 w-5" />Soltar imagen</span></span>}
              <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-md bg-slate-100">
                {preview ? <img src={preview} alt="Vista previa" className={`h-full w-full ${imageFit === 'contain' ? 'object-contain p-2' : 'object-cover'}`} /> : <FolderOpen className="h-8 w-8 text-aqua" />}
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink">Elegir o arrastrar imagen</span>
                <span className="mt-1 block text-xs text-slate-500">Archivo JPG, PNG o WebP, o imagen de una página web. Es opcional.</span>
              </span>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const chosen = event.target.files?.[0] || null; setDroppedUrl(null); setFile(chosen); if (!chosen) setPreview(null); }} className="hidden" />
            </label>
            {preview && <button type="button" onClick={clearImage} className="secondary-button mt-2 gap-2 text-red-600"><Trash2 className="h-4 w-4" />Quitar imagen</button>}
          </div>
        </div>
        <div className="flex items-start gap-2 sm:pt-6">
          <button type="button" onClick={onClose} className="secondary-button">Cancelar</button>
          <button type="submit" className="primary-button" disabled={saving || !name.trim()}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}Guardar</button>
        </div>
      </div>
      {error && <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </form>
  );
};
