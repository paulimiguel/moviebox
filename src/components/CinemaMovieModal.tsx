import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { MovieDetailModal } from '@/components/MovieDetailModal';
import { api, type CinemaMovie } from '@/services/api';
import type { ImdbSearchCandidate, MovieItem } from '@/types/movie';

const normalize = (text: string) => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

// Busca la película de la cartelera en IMDb por título original (o local) y año.
export const resolveImdbCandidate = async (movie: CinemaMovie): Promise<ImdbSearchCandidate | null> => {
  const queries = [...new Set([movie.originalTitle, movie.title].filter((value): value is string => Boolean(value)))];
  for (const query of queries) {
    const results = (await api.imdb.search(query)).filter((item) => item.type === 'movie');
    if (!results.length) continue;
    const names = [movie.originalTitle, movie.title].filter(Boolean).map((value) => normalize(value as string));
    const byName = results.filter((item) => names.includes(normalize(item.title)) || names.includes(normalize(item.originalTitle)));
    const pool = byName.length ? byName : results;
    const byYear = movie.year ? pool.find((item) => item.year && Math.abs(item.year - movie.year!) <= 1) : null;
    if (byYear) return byYear;
    if (byName.length) return byName[0];
    if (!movie.year) return results[0];
  }
  return null;
};

export const CinemaMovieModal = ({ cinemaMovie, onClose }: { cinemaMovie: CinemaMovie; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const library = useQuery({ queryKey: ['movies'], queryFn: api.movies.getAll });
  const resolved = useQuery({ queryKey: ['cinema-imdb', cinemaMovie.slug], queryFn: () => resolveImdbCandidate(cinemaMovie), staleTime: 60 * 60 * 1000, retry: 1 });
  const candidate = resolved.data || null;
  const libraryMovie = candidate ? (library.data || []).find((item) => item.imdbId === candidate.imdbId) || null : null;
  const details = useQuery({
    queryKey: ['candidateDetails', candidate?.imdbId],
    queryFn: () => api.imdb.import({ imdbId: candidate!.imdbId, type: candidate!.type }),
    enabled: Boolean(candidate && !libraryMovie),
    staleTime: 30 * 60 * 1000,
  });

  const refreshLibrary = () => {
    queryClient.invalidateQueries({ queryKey: ['movies'] });
    queryClient.invalidateQueries({ queryKey: ['metadata'] });
    queryClient.invalidateQueries({ queryKey: ['collections'] });
  };
  const replaceInLibrary = (updated: MovieItem) => {
    queryClient.setQueryData<MovieItem[]>(['movies'], (current = []) => current.map((item) => (item.id === updated.id ? updated : item)));
    refreshLibrary();
  };
  const addMutation = useMutation({
    mutationFn: async () => {
      const imported = details.data || await api.imdb.import({ imdbId: candidate!.imdbId, type: candidate!.type });
      return api.movies.create({ ...imported, favorite: false, watched: false, watchlist: false, personalRating: null, collectionIds: [] });
    },
    onSuccess: (saved) => {
      queryClient.setQueryData<MovieItem[]>(['movies'], (current = []) => current.some((item) => item.id === saved.id) ? current : [saved, ...current]);
      refreshLibrary();
    },
  });
  const updatePersonal = useMutation({
    mutationFn: ({ movie, field }: { movie: MovieItem; field: 'favorite' | 'watched' | 'watchlist' | 'thumbsUp' | 'thumbsDown' }) => api.movies.updatePersonal(movie.id, { [field]: !movie[field] }),
    onSuccess: replaceInLibrary,
  });
  const updateRating = useMutation({
    mutationFn: ({ movie, rating }: { movie: MovieItem; rating: number | null }) => api.movies.updatePersonal(movie.id, { personalRating: rating }),
    onSuccess: replaceInLibrary,
  });

  const previewMovie: MovieItem | null = useMemo(() => {
    if (libraryMovie) return libraryMovie;
    const data = details.data;
    if (!data) return null;
    const now = new Date().toISOString();
    return {
      id: `preview-${candidate!.imdbId}`,
      userId: 'preview',
      type: data.type || 'movie',
      originalTitle: data.originalTitle || cinemaMovie.originalTitle || cinemaMovie.title,
      spanishTitle: data.spanishTitle || cinemaMovie.title,
      year: data.year || cinemaMovie.year || null,
      synopsis: data.synopsis || cinemaMovie.synopsis || 'Sin descripción disponible.',
      durationMinutes: data.durationMinutes ?? cinemaMovie.durationMinutes ?? null,
      seasons: data.seasons ?? null,
      totalEpisodes: data.totalEpisodes ?? null,
      watched: false,
      favorite: false,
      watchlist: false,
      thumbsUp: false,
      thumbsDown: false,
      comments: null,
      instagramRecommendation: false,
      personalRating: null,
      imdbRating: data.imdbRating ?? null,
      tmdbId: data.tmdbId ?? null,
      imdbId: candidate!.imdbId,
      imdbUrl: `https://www.imdb.com/title/${candidate!.imdbId}`,
      tmdbUrl: data.tmdbId ? `https://www.themoviedb.org/movie/${data.tmdbId}` : null,
      justwatchUrl: data.justwatchUrl || null,
      trailerUrl: data.trailerUrl || cinemaMovie.trailerUrl || null,
      tmdbCollectionId: data.tmdbCollectionId ?? null,
      tmdbCollectionName: data.tmdbCollectionName ?? null,
      tmdbImportedAt: null,
      tmdbLastSyncedAt: null,
      createdAt: now,
      updatedAt: now,
      images: data.images?.length
        ? data.images.map((img, i) => ({ id: String(i), url: img.url, localPath: null, tmdbFilePath: null, order: i, isPrimary: i === 0, altText: null }))
        : cinemaMovie.posterUrl ? [{ id: '1', url: cinemaMovie.posterUrl, localPath: null, tmdbFilePath: null, order: 0, isPrimary: true, altText: null }] : [],
      genres: (data.genres || []).map((genre, i) => ({ id: String(i), name: genre.name, normalizedName: genre.name.toLowerCase(), tmdbGenreId: null, tmdbMediaType: 'movie', imagePath: null, order: i })),
      platforms: (data.platforms || []).map((platform, index) => ({ id: `preview-platform-${platform.tmdbProviderId || index}`, name: platform.name, tmdbProviderId: platform.tmdbProviderId ?? null, logoPath: platform.logoPath ?? null, isPrimary: platform.isPrimary ?? index === 0, order: platform.order ?? index })),
      keywords: [],
      credits: (data.credits || []).map((credit, i) => ({ id: String(i), name: credit.name, creditType: credit.creditType, order: credit.order ?? i, characterName: credit.characterName ?? null, tmdbPersonId: credit.tmdbPersonId ?? null, profilePath: credit.profilePath ?? null, tmdbCreditId: null })),
      countries: (data.countries || []).map((country, i) => ({ id: String(i), name: typeof country === 'string' ? country : country.name, normalizedName: (typeof country === 'string' ? country : country.name).toLowerCase(), isoCode: typeof country === 'string' ? null : country.isoCode ?? null, order: i })),
      collections: [],
    };
  }, [libraryMovie, details.data, candidate, cinemaMovie]);

  const failed = resolved.isError || (resolved.isSuccess && !candidate) || details.isError;
  if (!previewMovie) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4" onClick={onClose}>
        <div className={`max-w-sm rounded-lg bg-white p-6 text-center shadow-xl ${failed ? '' : 'hidden lg:block'}`} onClick={(event) => event.stopPropagation()}>
          {failed ? (
            <>
              <p className="text-sm text-slate-600">No se pudo encontrar la ficha de “{cinemaMovie.title}” para agregarla a tu biblioteca.</p>
              <div className="mt-4 flex justify-center gap-2">
                <a href={cinemaMovie.url} target="_blank" rel="noopener noreferrer" className="secondary-button">Ver horarios</a>
                <button type="button" onClick={onClose} className="primary-button">Cerrar</button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 text-sm text-slate-600"><Loader2 className="h-5 w-5 animate-spin text-aqua" /> Buscando “{cinemaMovie.title}”…</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <MovieDetailModal
      movie={previewMovie}
      showNavigation={false}
      hideWatchNow
      hidePlatforms
      onClose={onClose}
      onAdd={!libraryMovie ? () => addMutation.mutate() : undefined}
      onPersonal={(movie, field) => updatePersonal.mutate({ movie, field })}
      onRating={(movie, rating) => updateRating.mutate({ movie, rating })}
    />
  );
};
