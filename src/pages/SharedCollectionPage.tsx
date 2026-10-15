import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Film, FolderOpen, Loader2, Tv } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { api, resolveMovieImageUrl, type SharedCollectionImportResult } from '@/services/api';

export const SharedCollectionPage = () => {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [result, setResult] = useState<SharedCollectionImportResult | null>(null);
  const preview = useQuery({ queryKey: ['shared-collection', token], queryFn: () => api.sharedCollections.get(token), retry: false });

  const importCollection = useMutation({
    mutationFn: () => api.sharedCollections.import(token),
    onSuccess: (data) => {
      setResult(data);
      ['collections', 'movies', 'metadata', 'genres', 'platforms'].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
    },
  });

  const openImported = (collectionId: string) => {
    try {
      window.sessionStorage.setItem('moviebox:collection-filter', collectionId);
      window.sessionStorage.removeItem('moviebox:library-filter');
    } catch {
      // La biblioteca sigue accesible sin almacenamiento.
    }
    navigate('/biblioteca');
  };

  const data = preview.data;

  return (
    <main className="min-h-screen bg-canvas">
      <Header />
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        {preview.isLoading ? (
          <div className="grid min-h-[45vh] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-aqua" /></div>
        ) : preview.isError || !data ? (
          <div className="grid min-h-[45vh] place-items-center text-center">
            <div>
              <FolderOpen className="mx-auto h-14 w-14 text-aqua" />
              <h1 className="mt-4 text-lg font-semibold text-ink">{preview.error instanceof Error ? preview.error.message : 'El enlace no es válido o ya no está disponible'}</h1>
              <Link to="/colecciones" className="primary-button mt-5">Ir a mis colecciones</Link>
            </div>
          </div>
        ) : (
          <>
            <section className="movie-detail-modal flex flex-col gap-4 rounded-md border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:p-5">
              <div className="grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-md bg-slate-100">
                {data.coverImage ? <img src={resolveMovieImageUrl(data.coverImage)} alt={data.name} className="h-full w-full object-cover" /> : <FolderOpen className="h-10 w-10 text-aqua" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase text-slate-500">Colección compartida por {data.ownerName}</p>
                <h1 className="font-bebas break-words text-3xl font-normal uppercase leading-tight text-ink sm:text-4xl">{data.name}</h1>
                {data.description && <p className="mt-1 text-sm text-slate-600">{data.description}</p>}
                <p className="mt-1 text-sm text-slate-500">{data.titleCount} {data.titleCount === 1 ? 'título' : 'títulos'}</p>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                {data.isOwner ? (
                  <>
                    <p className="text-sm text-slate-500">Esta colección es tuya.</p>
                    <Link to="/colecciones" className="secondary-button">Volver a mis colecciones</Link>
                  </>
                ) : result ? null : (
                  <button type="button" onClick={() => importCollection.mutate()} disabled={importCollection.isPending || !data.titleCount} className="primary-button gap-2">
                    {importCollection.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Importar a mis colecciones
                  </button>
                )}
              </div>
            </section>

            {importCollection.isError && !result && (
              <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">{importCollection.error instanceof Error ? importCollection.error.message : 'No se pudo importar la colección'}</p>
            )}

            {result && (
              <section className="movie-detail-modal mt-4 rounded-md border border-slate-200 bg-white p-4 sm:p-5" role="status">
                <h2 className="font-bebas text-2xl uppercase text-ink">Colección importada</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Se creó la colección <strong className="text-ink">{result.collection.name}</strong> en tu cuenta.
                  {' '}{result.added} {result.added === 1 ? 'título nuevo' : 'títulos nuevos'}
                  {result.alreadyHad > 0 && <>, {result.alreadyHad} que ya tenías en tu biblioteca</>}.
                </p>
                {result.failed.length > 0 && (
                  <p className="movie-import-feedback mt-2 rounded-md bg-red-50 p-3 text-sm text-red-700">No se pudieron importar {result.failed.length} {result.failed.length === 1 ? 'título' : 'títulos'}: {result.failed.join(', ')}.</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => openImported(result.collection.id)} className="primary-button">Ver colección</button>
                  <Link to="/colecciones" className="secondary-button">Ir a mis colecciones</Link>
                </div>
              </section>
            )}

            <section className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-6">
              {data.titles.map((title) => (
                <div key={title.id} className="min-w-0">
                  <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-slate-100">
                    {title.posterUrl
                      ? <img src={resolveMovieImageUrl(title.posterUrl)} alt={title.title} className="h-full w-full object-cover" loading="lazy" />
                      : <div className="grid h-full place-items-center">{title.type === 'series' ? <Tv className="h-8 w-8 text-aqua/70" /> : <Film className="h-8 w-8 text-aqua/70" />}</div>}
                    {title.inLibrary && <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded bg-[#2cbc63] text-white" title="Ya está en tu biblioteca"><Check className="h-3.5 w-3.5" strokeWidth={3} /></span>}
                  </div>
                  <p className="mt-1.5 truncate text-xs font-semibold text-ink">{title.title}</p>
                  <p className="truncate text-[11px] text-slate-500">{title.year || ''}</p>
                </div>
              ))}
            </section>
          </>
        )}
      </div>
    </main>
  );
};
