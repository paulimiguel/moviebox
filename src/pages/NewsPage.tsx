import { useState } from 'react';
import { Header } from '@/components/Header';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Loader2 } from 'lucide-react';

const PLATFORMS = [
  { id: 'netflix', name: 'Netflix' },
  { id: 'prime', name: 'Amazon Prime' },
  { id: 'apple', name: 'Apple TV' }
];

export const NewsPage = () => {
  const [activePlatform, setActivePlatform] = useState('netflix');
  const { data, isLoading, error } = useQuery({
    queryKey: ['newReleases', activePlatform],
    queryFn: () => api.tmdb.newReleases(activePlatform),
  });

  return (
    <>
      <Header />
      <main className="mx-auto max-w-[1500px] p-4 sm:p-6 pb-20">
        <h1 className="font-bebas text-3xl text-ink">Novedades por Plataforma</h1>
        
        <div className="mt-6 flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              onClick={() => setActivePlatform(p.id)}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                activePlatform === p.id 
                  ? 'bg-coral text-white' 
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="mt-12 grid place-items-center">
            <Loader2 className="h-8 w-8 animate-spin text-coral" />
          </div>
        ) : error ? (
          <div className="mt-12 rounded-md bg-red-50 p-4 text-red-700">
            Error al cargar las novedades.
          </div>
        ) : (
          <div className="mt-10 space-y-12">
            <section>
              <h2 className="mb-4 text-xl font-semibold text-ink border-b border-slate-200 pb-2">Películas</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {(data?.movies || []).map((item) => (
                  <div key={item.tmdbId} className="movie-card flex flex-col gap-2 rounded-md bg-white p-3 shadow-sm border border-slate-200">
                    {item.posterUrl ? (
                      <img src={item.posterUrl} alt={item.title} className="w-full rounded object-cover aspect-[2/3]" />
                    ) : (
                      <div className="w-full rounded bg-slate-100 aspect-[2/3] grid place-items-center">
                        <span className="text-xs text-slate-400">Sin póster</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-semibold text-sm text-ink" title={item.title}>{item.title}</p>
                      <p className="text-xs text-slate-500">{item.year}</p>
                    </div>
                  </div>
                ))}
                {(data?.movies || []).length === 0 && (
                  <p className="col-span-full text-slate-500">No se encontraron películas recientes.</p>
                )}
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-xl font-semibold text-ink border-b border-slate-200 pb-2">Series</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {(data?.series || []).map((item) => (
                  <div key={item.tmdbId} className="movie-card flex flex-col gap-2 rounded-md bg-white p-3 shadow-sm border border-slate-200">
                    {item.posterUrl ? (
                      <img src={item.posterUrl} alt={item.title} className="w-full rounded object-cover aspect-[2/3]" />
                    ) : (
                      <div className="w-full rounded bg-slate-100 aspect-[2/3] grid place-items-center">
                        <span className="text-xs text-slate-400">Sin póster</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-semibold text-sm text-ink" title={item.title}>{item.title}</p>
                      <p className="text-xs text-slate-500">{item.year}</p>
                    </div>
                  </div>
                ))}
                {(data?.series || []).length === 0 && (
                  <p className="col-span-full text-slate-500">No se encontraron series recientes.</p>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </>
  );
};

