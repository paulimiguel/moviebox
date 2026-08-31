import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Film, Grid2X2, List, Loader2, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { Header } from '@/components/Header';
import { MovieCard } from '@/components/MovieCard';
import { MovieFormModal } from '@/components/MovieFormModal';
import { api } from '@/services/api';
import type { FavoriteFilter, MovieItem, MovieSortKey, MovieTypeFilter, SortDirection, WatchedFilter } from '@/types/movie';

const normalize = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('es');

const searchableText = (movie: MovieItem) => normalize([
  movie.spanishTitle,
  movie.originalTitle,
  ...movie.countries.map((country) => country.name),
  ...movie.credits.map((credit) => credit.name),
  ...movie.genres.map((genre) => genre.name),
  ...movie.keywords.map((keyword) => keyword.name),
  ...movie.platforms.map((platform) => platform.name),
  ...movie.collections.map((collection) => collection.name),
].filter(Boolean).join(' '));

export const MovieLibraryPage = () => {
  const [search, setSearch] = useState('');
  const [type, setType] = useState<MovieTypeFilter>('all');
  const [watched, setWatched] = useState<WatchedFilter>('all');
  const [favorite, setFavorite] = useState<FavoriteFilter>('all');
  const [sortKey, setSortKey] = useState<MovieSortKey>('createdAt');
  const [direction, setDirection] = useState<SortDirection>('desc');
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [formOpen, setFormOpen] = useState(false);
  const [genreId, setGenreId] = useState('');
  const [keywordId, setKeywordId] = useState('');
  const [platformId, setPlatformId] = useState('');
  const [collectionId, setCollectionId] = useState('');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [personalMin, setPersonalMin] = useState('');
  const [imdbMin, setImdbMin] = useState('');
  const queryClient = useQueryClient();

  const moviesQuery = useQuery({
    queryKey: ['movies'],
    queryFn: api.movies.getAll,
  });
  const metadataQuery = useQuery({ queryKey: ['metadata'], queryFn: api.metadata.getAll });
  const collectionsQuery = useQuery({ queryKey: ['collections'], queryFn: api.collections.getAll });
  const personalMutation = useMutation({ mutationFn: ({ movie, field }: { movie: MovieItem; field: 'favorite' | 'watched' }) => api.movies.updatePersonal(movie.id, { [field]: !movie[field] }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['movies'] }) });

  const filteredMovies = useMemo(() => {
    const query = normalize(search.trim());
    const list = (moviesQuery.data || []).filter((movie) => {
      if (query && !searchableText(movie).includes(query)) return false;
      if (type !== 'all' && movie.type !== type) return false;
      if (watched === 'watched' && !movie.watched) return false;
      if (watched === 'unwatched' && movie.watched) return false;
      if (favorite === 'favorites' && !movie.favorite) return false;
      if (genreId && !movie.genres.some((item) => item.id === genreId)) return false;
      if (keywordId && !movie.keywords.some((item) => item.id === keywordId)) return false;
      if (platformId && !movie.platforms.some((item) => item.id === platformId)) return false;
      if (collectionId && !movie.collections.some((item) => item.id === collectionId)) return false;
      if (yearFrom && (movie.year == null || movie.year < Number(yearFrom))) return false;
      if (yearTo && (movie.year == null || movie.year > Number(yearTo))) return false;
      if (personalMin && (movie.personalRating == null || movie.personalRating < Number(personalMin))) return false;
      if (imdbMin && (movie.imdbRating == null || movie.imdbRating < Number(imdbMin))) return false;
      return true;
    });

    return list.sort((left, right) => {
      const factor = direction === 'asc' ? 1 : -1;
      const title = (movie: MovieItem) => movie.spanishTitle || movie.originalTitle;
      const value = (movie: MovieItem) => {
        if (sortKey === 'title') return normalize(title(movie));
        if (sortKey === 'createdAt') return new Date(movie.createdAt).getTime();
        return movie[sortKey] ?? Number.NEGATIVE_INFINITY;
      };
      const leftValue = value(left);
      const rightValue = value(right);
      if (typeof leftValue === 'string' && typeof rightValue === 'string') return factor * leftValue.localeCompare(rightValue, 'es');
      return factor * (Number(leftValue) - Number(rightValue));
    });
  }, [collectionId, direction, favorite, genreId, imdbMin, keywordId, moviesQuery.data, personalMin, platformId, search, sortKey, type, watched, yearFrom, yearTo]);

  const clearFilters = () => {
    setSearch('');
    setType('all');
    setWatched('all');
    setFavorite('all');
    setGenreId(''); setKeywordId(''); setPlatformId(''); setCollectionId('');
    setYearFrom(''); setYearTo(''); setPersonalMin(''); setImdbMin('');
  };

  const hasFilters = Boolean(search || genreId || keywordId || platformId || collectionId || yearFrom || yearTo || personalMin || imdbMin) || type !== 'all' || watched !== 'all' || favorite !== 'all';

  return (
    <main className="min-h-screen bg-canvas">
      <Header onAdd={() => setFormOpen(true)} />
      <div className="mx-auto max-w-[1500px] px-3 py-5 sm:px-6 sm:py-7">
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-ink sm:text-2xl">Biblioteca</h1>
            <p className="mt-1 text-sm text-slate-500">
              {moviesQuery.data?.length || 0} {(moviesQuery.data?.length || 0) === 1 ? 'titulo' : 'titulos'}
            </p>
          </div>
        </div>

        <section className="mb-5 border-y border-slate-200 bg-white px-3 py-3 sm:rounded-md sm:border">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <label className="relative min-w-0 flex-1 xl:max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por titulo, direccion, reparto, genero o etiqueta"
                className="control w-full pl-9"
              />
            </label>

            <div className="grid grid-cols-3 overflow-hidden rounded-md border border-slate-200 bg-slate-50 sm:flex">
              {([
                ['all', 'Todos'],
                ['movie', 'Peliculas'],
                ['series', 'Series'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value)}
                  className={`h-10 px-3 text-xs font-semibold sm:text-sm ${type === value ? 'bg-ink text-white' : 'text-slate-600 hover:bg-white'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex">
              <select value={watched} onChange={(event) => setWatched(event.target.value as WatchedFilter)} className="control min-w-0 sm:w-36" aria-label="Estado">
                <option value="all">Todas</option>
                <option value="watched">Vistas</option>
                <option value="unwatched">No vistas</option>
              </select>
              <select value={favorite} onChange={(event) => setFavorite(event.target.value as FavoriteFilter)} className="control min-w-0 sm:w-36" aria-label="Favoritas">
                <option value="all">Todas</option>
                <option value="favorites">Favoritas</option>
              </select>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <SlidersHorizontal className="h-4 w-4 text-slate-400" />
            <select value={sortKey} onChange={(event) => setSortKey(event.target.value as MovieSortKey)} className="control w-[190px]" aria-label="Ordenar por">
              <option value="createdAt">Fecha de incorporacion</option>
              <option value="title">Titulo</option>
              <option value="year">Ano</option>
              <option value="personalRating">Mi puntuacion</option>
              <option value="imdbRating">Puntuacion IMDb</option>
            </select>
            <select value={direction} onChange={(event) => setDirection(event.target.value as SortDirection)} className="control w-[125px]" aria-label="Direccion">
              <option value="desc">Descendente</option>
              <option value="asc">Ascendente</option>
            </select>
            {hasFilters && (
              <button type="button" onClick={clearFilters} className="icon-button" title="Limpiar filtros" aria-label="Limpiar filtros">
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
            <div className="ml-auto flex gap-1">
              <button type="button" onClick={() => setLayout('grid')} className={`icon-button ${layout === 'grid' ? 'border-aqua bg-mist text-ink' : ''}`} title="Cuadricula" aria-label="Vista cuadricula">
                <Grid2X2 className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setLayout('list')} className={`icon-button ${layout === 'list' ? 'border-aqua bg-mist text-ink' : ''}`} title="Lista" aria-label="Vista lista">
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 sm:grid-cols-4 xl:grid-cols-8">
            <select className="control min-w-0" value={genreId} onChange={(e) => setGenreId(e.target.value)} aria-label="Genero"><option value="">Generos</option>{metadataQuery.data?.genres.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <select className="control min-w-0" value={keywordId} onChange={(e) => setKeywordId(e.target.value)} aria-label="Etiqueta"><option value="">Etiquetas</option>{metadataQuery.data?.keywords.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <select className="control min-w-0" value={platformId} onChange={(e) => setPlatformId(e.target.value)} aria-label="Plataforma"><option value="">Plataformas</option>{metadataQuery.data?.platforms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <select className="control min-w-0" value={collectionId} onChange={(e) => setCollectionId(e.target.value)} aria-label="Coleccion"><option value="">Colecciones</option>{collectionsQuery.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <input className="control min-w-0" type="number" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} placeholder="Ano desde" aria-label="Ano desde" />
            <input className="control min-w-0" type="number" value={yearTo} onChange={(e) => setYearTo(e.target.value)} placeholder="Ano hasta" aria-label="Ano hasta" />
            <input className="control min-w-0" type="number" min="0" max="10" step="0.5" value={personalMin} onChange={(e) => setPersonalMin(e.target.value)} placeholder="Mi nota min." aria-label="Mi puntuacion minima" />
            <input className="control min-w-0" type="number" min="0" max="10" step="0.1" value={imdbMin} onChange={(e) => setImdbMin(e.target.value)} placeholder="IMDb min." aria-label="IMDb minima" />
          </div>
        </section>

        {moviesQuery.isLoading ? (
          <div className="grid min-h-[45vh] place-items-center text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-aqua" />
          </div>
        ) : moviesQuery.isError ? (
          <div className="grid min-h-[45vh] place-items-center text-center">
            <div>
              <p className="font-semibold text-ink">No se pudo cargar la biblioteca</p>
              <button type="button" onClick={() => moviesQuery.refetch()} className="primary-button mt-4">Reintentar</button>
            </div>
          </div>
        ) : filteredMovies.length === 0 ? (
          <div className="grid min-h-[45vh] place-items-center px-4 text-center">
            <div className="max-w-sm">
              <Film className="mx-auto h-14 w-14 text-aqua" />
              <h2 className="mt-4 text-lg font-semibold text-ink">{hasFilters ? 'No hay coincidencias' : 'Tu biblioteca esta vacia'}</h2>
              <p className="mt-2 text-sm text-slate-500">{hasFilters ? 'Proba cambiando los filtros aplicados.' : 'Los titulos que agregues apareceran aca.'}</p>
              {hasFilters && <button type="button" onClick={clearFilters} className="primary-button mt-5">Limpiar filtros</button>}
            </div>
          </div>
        ) : layout === 'grid' ? (
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 2xl:grid-cols-5">
            {filteredMovies.map((movie) => <MovieCard key={movie.id} movie={movie} layout="grid" onPersonal={(item, field) => personalMutation.mutate({ movie: item, field })} />)}
          </section>
        ) : (
          <section className="overflow-hidden rounded-md border border-slate-200">
            {filteredMovies.map((movie) => <MovieCard key={movie.id} movie={movie} layout="list" onPersonal={(item, field) => personalMutation.mutate({ movie: item, field })} />)}
          </section>
        )}
      </div>
      {formOpen && <MovieFormModal onClose={() => setFormOpen(false)} onSaved={() => { queryClient.invalidateQueries({ queryKey: ['movies'] }); queryClient.invalidateQueries({ queryKey: ['metadata'] }); queryClient.invalidateQueries({ queryKey: ['collections'] }); setFormOpen(false); }} />}
    </main>
  );
};
