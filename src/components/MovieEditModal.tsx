import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Bookmark, Check, ChevronsUpDown, Eye, Heart, ImagePlus, Loader2, Plus, Search, Tags, ThumbsDown, ThumbsUp, Trash2, Tv, X } from 'lucide-react';
import { api, resolveMovieImageUrl } from '@/services/api';
import { resolvePlatformLogoUrl } from '@/components/PlatformLogos';
import { StarRating } from '@/components/StarRating';
import { getGenreIconImage } from '@/utils/genreIcons';
import { movieToInput } from '@/utils/movieInput';
import { MAX_PRINCIPAL_CAST } from '@/types/movie';
import type { MovieItem, MovieType } from '@/types/movie';

const normalizeValue = (value: string) => value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
const splitValues = (value: string) => Array.from(new Map(value.split(',').map((item) => item.trim()).filter(Boolean).map((item) => [normalizeValue(item), item])).values());
const numberOrNull = (value: string) => value.trim() === '' ? null : Number(value);

type AssociationOption = { id: string; name: string; logoPath?: string | null };
type AssociationKind = 'genre' | 'platform';

const AssociationOptionIcon = ({ kind, option }: { kind: AssociationKind; option: AssociationOption }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = kind === 'genre'
    ? getGenreIconImage(option.name)
    : resolvePlatformLogoUrl({ name: option.name, logoPath: option.logoPath || null });

  if (!imageUrl || imageFailed) {
    return <span className="grid h-6 w-8 shrink-0 place-items-center" aria-hidden="true">{kind === 'genre' ? <Tags className="h-4 w-4 text-aqua" /> : <Tv className="h-4 w-4 text-aqua" />}</span>;
  }

  return <span className="grid h-6 w-8 shrink-0 place-items-center"><img src={imageUrl} alt="" className="max-h-6 max-w-8 object-contain" loading="lazy" onError={() => setImageFailed(true)} /></span>;
};

const AssociationPicker = ({ label, kind, options, selected, onChange }: {
  label: string;
  kind: AssociationKind;
  options: AssociationOption[];
  selected: string[];
  onChange: (names: string[]) => void;
}) => {
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const visibleOptions = useMemo(() => {
    const byName = new Map(options.map((option) => [option.name.toLocaleLowerCase('es'), option]));
    selected.forEach((name) => {
      const key = name.toLocaleLowerCase('es');
      if (!byName.has(key)) byName.set(key, { id: `selected-${key}`, name });
    });
    return Array.from(byName.values()).sort((left, right) => left.name.localeCompare(right.name, 'es'));
  }, [options, selected]);
  const toggle = (name: string) => {
    onChange(selected.includes(name)
      ? selected.filter((item) => item !== name)
      : [...selected, name]);
    setDraft('');
    setOpen(false);
  };
  const addDraft = () => {
    const name = draft.trim();
    if (!name) return;
    const existing = visibleOptions.find((option) => normalizeValue(option.name) === normalizeValue(name));
    const value = existing?.name || name;
    if (!selected.some((item) => normalizeValue(item) === normalizeValue(value))) onChange([...selected, value]);
    setDraft('');
    setOpen(false);
  };
  const filteredOptions = visibleOptions.filter((option) => !draft.trim() || normalizeValue(option.name).includes(normalizeValue(draft)));

  return (
    <div ref={rootRef} className="relative min-w-0">
      <span className="field-label">{label}</span>
      <button type="button" onClick={() => { setDraft(''); setOpen((current) => !current); }} className={`control flex w-full items-center justify-between gap-2 text-left ${open ? 'border-coral' : ''}`} aria-haspopup="listbox" aria-expanded={open}>
        <span className={`truncate ${selected.length ? 'text-ink' : 'text-slate-400'}`}>{selected.length ? selected.join(', ') : `Elegir ${label.toLocaleLowerCase('es')}`}</span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>
      {open && (
        <div className="library-toolbar-dropdown absolute left-0 top-full z-50 mt-1 w-full min-w-[220px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-card">
          <label className="relative block border-b border-slate-200">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input autoFocus type="search" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addDraft(); } }} className="h-10 w-full pl-9 pr-3 text-sm outline-none" placeholder={`Buscar o crear ${label.toLocaleLowerCase('es')} con Enter`} />
          </label>
          <div className="max-h-[min(16rem,38vh)] overflow-y-auto p-1.5" role="listbox" aria-multiselectable="true">
            {filteredOptions.map((option) => {
              const isSelected = selected.includes(option.name);
              return (
                <button key={option.id} type="button" onClick={() => toggle(option.name)} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${isSelected ? 'bg-mist font-semibold text-ink' : 'text-slate-600 hover:bg-slate-50'}`} role="option" aria-selected={isSelected}>
                  <Check className={`h-4 w-4 shrink-0 ${isSelected ? 'text-coral' : 'text-transparent'}`} />
                  <AssociationOptionIcon kind={kind} option={option} />
                  <span className="min-w-0 flex-1 truncate">{option.name}</span>
                </button>
              );
            })}
            {!filteredOptions.length && <p className="px-3 py-3 text-center text-sm text-slate-400">{draft.trim() ? `Enter para crear "${draft.trim()}".` : 'No hay opciones.'}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export const MovieEditModal = ({ movie, onClose, onSaved, onPrevious, onNext }: {
  movie: MovieItem;
  onClose: () => void;
  onSaved: (movie: MovieItem) => void;
  onPrevious?: () => void;
  onNext?: () => void;
}) => {
  const queryClient = useQueryClient();
  const collections = useQuery({ queryKey: ['collections'], queryFn: api.collections.getAll });
  const metadata = useQuery({ queryKey: ['metadata'], queryFn: api.metadata.getAll });
  const [watched, setWatched] = useState(movie.watched);
  const [favorite, setFavorite] = useState(movie.favorite);
  const [watchlist, setWatchlist] = useState(movie.watchlist);
  const [thumbsUp, setThumbsUp] = useState(movie.thumbsUp);
  const [thumbsDown, setThumbsDown] = useState(movie.thumbsDown);
  const [comments, setComments] = useState(movie.comments || '');
  const [instagramRecommendation, setInstagramRecommendation] = useState(movie.instagramRecommendation);
  const [genreNames, setGenreNames] = useState(movie.genres.map((genre) => genre.name));
  const [platformNames, setPlatformNames] = useState(movie.platforms.map((platform) => platform.name));
  const [collectionIds, setCollectionIds] = useState(movie.collections.map((collection) => collection.id));
  const [collectionDraft, setCollectionDraft] = useState('');
  const [collectionOpen, setCollectionOpen] = useState(false);
  const collectionRootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!collectionOpen) return undefined;
    const close = (event: MouseEvent) => { if (!collectionRootRef.current?.contains(event.target as Node)) setCollectionOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [collectionOpen]);
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
  const [notice, setNotice] = useState('');

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
      setCollectionOpen(false);
    },
    onError: (reason: Error) => setError(reason.message),
  });

  const save = useMutation({
    mutationFn: (_closeAfter: boolean) => {
      const castNames = splitValues(cast);
      if (castNames.length > MAX_PRINCIPAL_CAST) throw new Error(`El reparto principal admite hasta ${MAX_PRINCIPAL_CAST} personas`);
      return api.movies.update(movie.id, {
        ...movieToInput(movie),
        watched,
        favorite,
        watchlist,
        thumbsUp,
        thumbsDown,
        comments: comments.trim() || null,
        instagramRecommendation,
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
      });
    },
    onSuccess: (saved, closeAfter) => {
      if (closeAfter) {
        onSaved(saved);
        return;
      }
      // Actualizar: guarda y deja el cuadro abierto.
      queryClient.setQueryData(['movie', saved.id], saved);
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      queryClient.invalidateQueries({ queryKey: ['metadata'] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      setNotice('Cambios guardados');
      window.setTimeout(() => setNotice(''), 2500);
    },
    onError: (reason: Error) => { setNotice(''); setError(reason.message); },
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
    setCollectionDraft('');
    setCollectionOpen(false);
  };
  const submitCollection = () => {
    const name = collectionDraft.trim();
    if (!name || createCollection.isPending) return;
    const existing = collections.data?.find((collection) => collection.name.toLocaleLowerCase('es') === name.toLocaleLowerCase('es'));
    if (existing) {
      setCollectionIds((current) => current.includes(existing.id) ? current : [...current, existing.id]);
      setCollectionDraft('');
      setCollectionOpen(false);
      return;
    }
    setError('');
    createCollection.mutate(name);
  };

  // Botones de estado: en mobile van dentro del formulario (debajo de Reparto o Temporadas/Episodios); desde tablet, a la izquierda.
  const estadoSection = (
  <section>
      <h3 className="field-label">Estado</h3>
      <div className="grid grid-cols-2 gap-2">
    <button type="button" aria-pressed={watched} onClick={() => setWatched((current) => !current)} className={`moviebox-translucent-action secondary-button gap-2 text-xs uppercase ${watched ? 'border-[#2cbc63] bg-[#2cbc63]/10 text-[#218f4c]' : ''}`}><Eye className="h-[18px] w-[18px]" />Vista</button>
    <button type="button" aria-pressed={favorite} onClick={() => setFavorite((current) => !current)} className={`moviebox-translucent-action secondary-button gap-2 text-xs uppercase ${favorite ? 'border-coral bg-red-50 text-coral' : ''}`}><Heart className={`h-4 w-4 ${favorite ? 'fill-current' : ''}`} />Me encanta</button>
    <button type="button" aria-pressed={watchlist} onClick={() => setWatchlist((current) => !current)} className={`moviebox-translucent-action secondary-button gap-2 text-xs uppercase ${watchlist ? 'border-aqua bg-mist text-aqua' : ''}`}><Bookmark className={`h-4 w-4 ${watchlist ? 'fill-current' : ''}`} />Watchlist</button>
      <div className="grid min-w-0 grid-cols-2 gap-2">
        <button type="button" aria-pressed={thumbsUp} onClick={() => { setThumbsUp((current) => !current); setThumbsDown(false); }} title="Me gusta" aria-label="Me gusta" className={`moviebox-translucent-action secondary-button h-10 min-w-0 px-1.5 ${thumbsUp ? 'border-[#3b82f6] bg-mist text-[#3b82f6]' : ''}`}><ThumbsUp className="h-[18px] w-[18px]" /></button>
        <button type="button" aria-pressed={thumbsDown} onClick={() => { setThumbsDown((current) => !current); setThumbsUp(false); }} title="No me gusta" aria-label="No me gusta" className={`moviebox-translucent-action secondary-button h-10 min-w-0 px-1.5 ${thumbsDown ? 'border-[#3b82f6] bg-mist text-[#3b82f6]' : ''}`}><ThumbsDown className="h-[18px] w-[18px]" /></button>
      </div>
      </div>
    </section>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/55 sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="movie-edit-title">
      <form onSubmit={(event) => { event.preventDefault(); setError(''); setNotice(''); save.mutate(true); }} className="movie-detail-modal flex flex-col max-h-[85vh] sm:max-h-[92vh] sm:min-h-[560px] md:min-h-[600px] w-full overflow-hidden rounded-t-md bg-canvas shadow-xl sm:max-w-5xl sm:rounded-md">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <h2 id="movie-edit-title" className="font-bebas truncate text-[24px] font-normal uppercase leading-7 text-ink">Editar {movie.originalTitle}</h2>
            <p className="text-xs text-slate-500">Todos los datos del título</p>
          </div>
          <div className="ml-auto flex shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white shadow-card">
            <button type="button" onClick={onPrevious} disabled={!onPrevious} className="icon-button rounded-none border-0 shadow-none" title="Título anterior" aria-label="Título anterior"><ArrowLeft className="h-5 w-5" /></button>
            <button type="button" onClick={onNext} disabled={!onNext} className="icon-button rounded-none border-0 border-l border-slate-200 shadow-none" title="Título siguiente" aria-label="Título siguiente"><ArrowRight className="h-5 w-5" /></button>
            <button type="button" onClick={onClose} className="icon-button rounded-none border-0 border-l border-slate-200 shadow-none" title="Cerrar" aria-label="Cerrar"><X className="h-5 w-5" /></button>
          </div>
        </header>

        <div className="flex max-h-[calc(85vh-128px)] sm:max-h-[calc(92vh-128px)] flex-1 flex-col overflow-y-auto p-4 sm:p-6">
          {/* Mismo orden que la ficha del título: portada y estado a la izquierda; datos a la derecha. */}
          <div className="grid gap-6 md:grid-cols-[250px_minmax(0,1fr)]">
            <div className="contents md:block">
            <section className={`relative order-3 rounded-md border-2 border-dashed p-3 transition-colors md:order-none ${isDraggingImages ? 'border-coral bg-red-50' : 'border-slate-200'}`}
              onDragEnter={(event) => { event.preventDefault(); setIsDraggingImages(true); }}
              onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; setIsDraggingImages(true); }}
              onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDraggingImages(false); }}
              onDrop={handleImageDrop}>
            {isDraggingImages && <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center rounded-md border-2 border-coral bg-white/90 text-coral"><div className="flex items-center gap-2 text-sm font-semibold"><ImagePlus className="h-5 w-5" />Soltar imágenes</div></div>}
            <h3 className="field-label">Imágenes (máximo 5)</h3>
            {imageList.length > 0 && (
              <div className="mb-3 grid grid-cols-2 gap-2">
                {imageList.map((url, index) => (
                  <div key={`${url}-${index}`} className="overflow-hidden rounded-md border border-slate-200 bg-white">
                    <img src={resolveMovieImageUrl(url)} alt="" className="aspect-[2/3] w-full bg-slate-100 object-contain" />
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
              <div className="hidden md:mt-4 md:block">{estadoSection}</div>
            </div>

            <section className="order-2 min-w-0 space-y-5 md:order-none">
              <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                <label><span className="field-label">Título original</span><input value={originalTitle} onChange={(event) => setOriginalTitle(event.target.value)} className="control w-full" maxLength={250} required /></label>
                <label><span className="field-label">Título en español</span><input value={spanishTitle} onChange={(event) => setSpanishTitle(event.target.value)} className="control w-full" maxLength={250} /></label>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4">
                <label><span className="field-label">Año</span><input type="number" min="1888" max="2200" value={year} onChange={(event) => setYear(event.target.value)} className="control w-full" /></label>
                <label><span className="field-label">Puntuación IMDb</span><input type="number" min="0" max="10" step="0.1" value={imdbRating} onChange={(event) => setImdbRating(event.target.value)} className="control w-full" /></label>
                <label><span className="field-label">Duración en minutos</span><input type="number" min="1" max="9999" value={duration} onChange={(event) => setDuration(event.target.value)} className="control w-full" /></label>
                <label><span className="field-label">Tipo</span><select value={type} onChange={(event) => setType(event.target.value as MovieType)} className="control w-full"><option value="movie">Película</option><option value="series">Serie</option></select></label>
              </div>
              <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                <AssociationPicker label="Género" kind="genre" options={metadata.data?.genres || []} selected={genreNames} onChange={setGenreNames} />
                <AssociationPicker label="Plataforma" kind="platform" options={metadata.data?.platforms || []} selected={platformNames} onChange={setPlatformNames} />
              </div>
              <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                <label><span className="field-label">Link IMDb</span><input type="url" value={imdbUrl} onChange={(event) => setImdbUrl(event.target.value)} className="control w-full" placeholder="https://..." /></label>
                <label><span className="field-label">Link TMDB</span><input type="url" value={tmdbUrl} onChange={(event) => setTmdbUrl(event.target.value)} className="control w-full" placeholder="https://..." /></label>
                <label><span className="field-label">Link JustWatch</span><input type="url" value={justwatchUrl} onChange={(event) => setJustwatchUrl(event.target.value)} className="control w-full" placeholder="https://..." /></label>
                <label><span className="field-label">Link del trailer</span><input type="url" value={trailerUrl} onChange={(event) => setTrailerUrl(event.target.value)} className="control w-full" placeholder="https://..." /></label>
              </div>
              <label className="block"><span className="field-label">Sinopsis</span><textarea value={synopsis} onChange={(event) => setSynopsis(event.target.value)} className="control min-h-36 w-full py-2" maxLength={10000} /></label>
              <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                <label><span className="field-label">País</span><input value={countries} onChange={(event) => setCountries(event.target.value)} className="control w-full" placeholder="Separar con comas" /></label>
                <label><span className="field-label">Dirección</span><input value={directors} onChange={(event) => setDirectors(event.target.value)} className="control w-full" placeholder="Separar con comas" /></label>
                <label className="sm:col-span-2"><span className="field-label">Reparto</span><input value={cast} onChange={(event) => setCast(event.target.value)} className="control w-full" placeholder={`Hasta ${MAX_PRINCIPAL_CAST}, separados con comas`} /></label>
                {type === 'series' && (
                  <div className="grid grid-cols-2 gap-x-6 sm:col-span-2">
                    <label><span className="field-label">Temporadas</span><input type="number" min="1" max="999" value={seasons} onChange={(event) => setSeasons(event.target.value)} className="control w-full" /></label>
                    <label><span className="field-label">Episodios</span><input type="number" min="1" max="99999" value={episodes} onChange={(event) => setEpisodes(event.target.value)} className="control w-full" /></label>
                  </div>
                )}
                <div className="sm:col-span-2 md:hidden">{estadoSection}</div>
            <div ref={collectionRootRef} className="relative min-w-0">
              <span className="field-label">Colección</span>
              <button type="button" onClick={() => { setCollectionDraft(''); setCollectionOpen((current) => !current); }} className={`control flex w-full items-center justify-between gap-2 text-left ${collectionOpen ? 'border-coral' : ''}`} aria-haspopup="listbox" aria-expanded={collectionOpen}>
                <span className={`truncate ${collectionIds.length ? 'text-ink' : 'text-slate-400'}`}>{collectionIds.length ? (collections.data || []).filter((collection) => collectionIds.includes(collection.id)).map((collection) => collection.name).join(', ') || 'Cargando…' : 'Elegir colección'}</span>
                {createCollection.isPending ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-aqua" /> : <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />}
              </button>
              {collectionOpen && (
                <div className="library-toolbar-dropdown absolute left-0 top-full z-50 mt-1 w-full min-w-[220px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-card">
                  <label className="relative block border-b border-slate-200">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input autoFocus type="search" value={collectionDraft} onChange={(event) => setCollectionDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); submitCollection(); } }} className="h-10 w-full pl-9 pr-3 text-sm outline-none" placeholder="Buscar o crear colección con Enter" />
                  </label>
                  <div className="max-h-[min(16rem,38vh)] overflow-y-auto p-1.5" role="listbox" aria-multiselectable="true">
                    {collections.isLoading && <p className="px-3 py-3 text-center text-sm text-slate-400">Cargando…</p>}
                    {(collections.data || []).filter((collection) => !collectionDraft.trim() || normalizeValue(collection.name).includes(normalizeValue(collectionDraft))).map((collection) => {
                      const isSelected = collectionIds.includes(collection.id);
                      return (
                        <button key={collection.id} type="button" onClick={() => toggleCollection(collection.id)} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${isSelected ? 'bg-mist font-semibold text-ink' : 'text-slate-600 hover:bg-slate-50'}`} role="option" aria-selected={isSelected}>
                          <Check className={`h-4 w-4 shrink-0 ${isSelected ? 'text-coral' : 'text-transparent'}`} />
                          <span className="min-w-0 flex-1 truncate">{collection.name}</span>
                        </button>
                      );
                    })}
                    {!collections.isLoading && !(collections.data || []).some((collection) => !collectionDraft.trim() || normalizeValue(collection.name).includes(normalizeValue(collectionDraft))) && <p className="px-3 py-3 text-center text-sm text-slate-400">{collectionDraft.trim() ? `Enter para crear "${collectionDraft.trim()}".` : 'Todavía no hay colecciones.'}</p>}
                  </div>
                </div>
              )}
            </div>
                <div>
            <div>
              <span className="field-label">Mi puntuación{personalRating ? ` · ${personalRating} de 10` : ''}</span>
              <StarRating small value={personalRating} onChange={setPersonalRating} disabled={save.isPending} />
            </div>
                </div>
              </div>
              <label className="block"><span className="field-label">Palabras clave</span><input value={keywords} onChange={(event) => setKeywords(event.target.value)} className="control w-full" placeholder="Separar con comas" /></label>
              <label className="block"><span className="field-label">Comentarios</span><textarea value={comments} onChange={(event) => setComments(event.target.value)} className="control min-h-28 w-full py-2" maxLength={5000} placeholder="Tus notas o comentarios sobre este título" /></label>
            </section>
          </div>
          {error && <p className="order-last mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        </div>

        <footer className="flex h-16 items-center justify-end gap-2 border-t border-slate-200 bg-white px-4 sm:px-6">
          {notice && <span className="mr-auto text-sm font-medium text-[#218f4c]" role="status">{notice}</span>}
          <button type="button" onClick={onClose} className="secondary-button">Cancelar</button>
          <button type="button" onClick={() => { setError(''); setNotice(''); save.mutate(false); }} disabled={save.isPending || imageUpload.isPending || createCollection.isPending || !originalTitle.trim()} className="secondary-button">{save.isPending && save.variables === false && <Loader2 className="h-4 w-4 animate-spin" />}Actualizar</button>
          <button type="submit" disabled={save.isPending || imageUpload.isPending || createCollection.isPending || !originalTitle.trim()} className="primary-button">{save.isPending && save.variables === true && <Loader2 className="h-4 w-4 animate-spin" />}Guardar</button>
        </footer>
      </form>
    </div>
  );
};
