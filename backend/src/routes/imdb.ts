import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const CINEMETA_URL = 'https://v3-cinemeta.strem.io';
const TMDB_URL = 'https://api.themoviedb.org/3';
const LOCALIZED_TMDB_GENRES: Record<string, string> = {
  'action & adventure': 'Acción y aventura',
  kids: 'Infantil',
  news: 'Noticias',
  reality: 'Telerrealidad',
  'sci-fi & fantasy': 'Ciencia ficción y fantasía',
  soap: 'Telenovela',
  talk: 'Programa de entrevistas',
  'war & politics': 'Guerra y política',
};

interface TmdbSearchResult {
  id: number;
}

interface TmdbFindResponse {
  movie_results?: TmdbSearchResult[];
  tv_results?: TmdbSearchResult[];
}

interface TmdbDetails {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  genres?: { id: number; name: string }[];
  credits?: { cast?: { name?: string }[] };
}

interface TmdbWatchProvider {
  display_priority?: number;
  logo_path?: string | null;
  provider_id: number;
  provider_name: string;
}

interface TmdbWatchProvidersResponse {
  results?: Record<string, {
    ads?: TmdbWatchProvider[];
    flatrate?: TmdbWatchProvider[];
    free?: TmdbWatchProvider[];
  }>;
}

interface LocalizedTmdbDetails {
  id: number;
  title: string | null;
  synopsis: string | null;
  genres: string[];
  cast: string[];
  platforms: TmdbWatchProvider[];
}

const importSchema = z.object({
  imdbId: z.string().regex(/^tt\d+$/),
  type: z.enum(['movie', 'series']),
});

const cinemetaRequest = async <T>(path: string): Promise<T> => {
  const response = await fetch(`${CINEMETA_URL}${path}`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`CINEMETA_${response.status}`);
  return response.json() as Promise<T>;
};

const tmdbRequest = async <T>(path: string): Promise<T> => {
  if (!env.tmdbApiToken) throw new Error('TMDB_TOKEN_MISSING');
  const url = new URL(`${TMDB_URL}${path}`);
  const usesBearerToken = env.tmdbApiToken.startsWith('ey');
  if (!usesBearerToken) url.searchParams.set('api_key', env.tmdbApiToken);
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      ...(usesBearerToken ? { Authorization: `Bearer ${env.tmdbApiToken}` } : {}),
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`TMDB_${response.status}`);
  return response.json() as Promise<T>;
};

const parseYear = (value: unknown) => {
  const match = String(value || '').match(/\d{4}/);
  return match ? Number(match[0]) : null;
};

const parseRuntime = (value: unknown) => {
  const match = String(value || '').match(/\d+/);
  return match ? Number(match[0]) : null;
};

const getLocalizedTmdbDetails = async (
  imdbId: string,
  type: 'movie' | 'series',
  knownTmdbId: number | null,
): Promise<LocalizedTmdbDetails | null> => {
  let tmdbId = knownTmdbId;
  if (!tmdbId) {
    const find = await tmdbRequest<TmdbFindResponse>(
      `/find/${imdbId}?external_source=imdb_id&language=es-AR`,
    );
    tmdbId = type === 'movie'
      ? find.movie_results?.[0]?.id || null
      : find.tv_results?.[0]?.id || null;
  }
  if (!tmdbId) return null;

  const resource = type === 'movie' ? 'movie' : 'tv';
  const [argentina, spain, providers] = await Promise.all([
    tmdbRequest<TmdbDetails>(`/${resource}/${tmdbId}?language=es-AR&append_to_response=credits`),
    tmdbRequest<TmdbDetails>(`/${resource}/${tmdbId}?language=es-ES&append_to_response=credits`),
    tmdbRequest<TmdbWatchProvidersResponse>(`/${resource}/${tmdbId}/watch/providers`),
  ]);
  const argentinaGenres = argentina.genres?.filter((genre) => genre.name.trim()) || [];
  const spainGenres = spain.genres?.filter((genre) => genre.name.trim()) || [];
  const argentinaProviders = providers.results?.AR;
  const availableProviders = [
    ...(argentinaProviders?.flatrate || []),
    ...(argentinaProviders?.free || []),
    ...(argentinaProviders?.ads || []),
  ];
  const uniqueProviders = Array.from(
    new Map(availableProviders.map((provider) => [provider.provider_id, provider])).values(),
  ).sort((left, right) => (left.display_priority || 0) - (right.display_priority || 0));

  return {
    id: tmdbId,
    title: (argentina.title || argentina.name || spain.title || spain.name || '').trim() || null,
    synopsis: (argentina.overview || spain.overview || '').trim() || null,
    genres: (argentinaGenres.length ? argentinaGenres : spainGenres).map((genre) => (
      LOCALIZED_TMDB_GENRES[genre.name.toLocaleLowerCase('en')] || genre.name
    )),
    cast: (argentina.credits?.cast || spain.credits?.cast || [])
      .map((person) => person.name?.trim() || '')
      .filter(Boolean),
    platforms: uniqueProviders,
  };
};

router.use(authenticateToken);

router.get('/search', async (req, res) => {
  const query = String(req.query.query || '').trim();
  if (!query) return res.json([]);

  try {
    const encodedQuery = encodeURIComponent(query);
    const [movies, series] = await Promise.all([
      cinemetaRequest<{ metas?: any[] }>(`/catalog/movie/top/search=${encodedQuery}.json`),
      cinemetaRequest<{ metas?: any[] }>(`/catalog/series/top/search=${encodedQuery}.json`),
    ]);
    const normalizedQuery = query.toLocaleLowerCase();
    const results = [
      ...(movies.metas || []).map((item, index) => ({ ...item, type: 'movie' as const, sourceIndex: index })),
      ...(series.metas || []).map((item, index) => ({ ...item, type: 'series' as const, sourceIndex: index })),
    ]
      .filter((item) => /^tt\d+$/.test(item.id || ''))
      .sort((left, right) => {
        const score = (name: string) => {
          const normalizedName = name.toLocaleLowerCase();
          if (normalizedName === normalizedQuery) return 0;
          if (normalizedName.startsWith(normalizedQuery)) return 1;
          if (normalizedName.includes(normalizedQuery)) return 2;
          return 3;
        };
        return score(left.name) - score(right.name) || left.sourceIndex - right.sourceIndex;
      })
      .slice(0, 12)
      .map((item) => ({
        imdbId: item.id,
        type: item.type,
        title: item.name,
        originalTitle: item.name,
        year: parseYear(item.releaseInfo || item.year),
        posterUrl: `https://images.metahub.space/poster/small/${item.id}/img`,
      }));

    return res.json(results);
  } catch (error) {
    console.error('IMDb search error:', error);
    return res.status(502).json({ error: 'No se pudo buscar el titulo en IMDb' });
  }
});

router.post('/import', async (req, res) => {
  const parsed = importSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Seleccion no valida' });

  try {
    const { imdbId, type } = parsed.data;
    const payload = await cinemetaRequest<{ meta?: any }>(`/meta/${type}/${imdbId}.json`);
    const details = payload.meta;
    if (!details) return res.status(404).json({ error: 'No se encontraron datos para este titulo' });

    const episodes = type === 'series'
      ? (details.videos || []).filter((episode: any) => Number(episode.season) > 0)
      : [];
    const seasons = episodes.length
      ? Math.max(...episodes.map((episode: any) => Number(episode.season) || 0))
      : null;
    const images = Array.from(new Set(
      [details.poster, details.background, details.logo].filter(Boolean) as string[],
    ));
    const trailer = (details.trailers || []).find((item: any) => item.source);
    const rating = Number(details.imdbRating);
    const tmdbId = Number(details.moviedb_id);
    const knownTmdbId = Number.isInteger(tmdbId) && tmdbId > 0 ? tmdbId : null;
    const localized = await getLocalizedTmdbDetails(imdbId, type, knownTmdbId);

    return res.json({
      type,
      originalTitle: details.name,
      spanishTitle: localized?.title || null,
      year: parseYear(details.year || details.releaseInfo),
      synopsis: localized?.synopsis || details.description || null,
      durationMinutes: parseRuntime(details.runtime),
      seasons,
      totalEpisodes: episodes.length || null,
      imdbRating: Number.isFinite(rating) ? rating : null,
      tmdbId: localized?.id || knownTmdbId,
      imdbId,
      imdbUrl: `https://www.imdb.com/title/${imdbId}/`,
      trailerUrl: trailer ? `https://www.youtube.com/watch?v=${trailer.source}` : null,
      images: images.slice(0, 5).map((url, order) => ({
        url,
        order,
        isPrimary: order === 0,
        altText: details.name,
      })),
      countries: String(details.country || '')
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name, order) => ({ name, order })),
      credits: [
        ...(details.director || []).map((name: string, order: number) => ({
          name,
          creditType: 'director',
          order,
        })),
        ...(localized?.cast.length ? localized.cast : details.cast || [])
          .slice(0, 6)
          .map((name: string, order: number) => ({
          name,
          creditType: 'cast',
          order,
          })),
      ],
      genres: (localized?.genres.length ? localized.genres : details.genres || [])
        .map((name: string, order: number) => ({ name, order })),
      keywords: [],
      platforms: (localized?.platforms || []).map((platform, order) => ({
        name: platform.provider_name,
        tmdbProviderId: platform.provider_id,
        logoPath: platform.logo_path || null,
        isPrimary: order === 0,
        order,
      })),
    });
  } catch (error) {
    console.error('IMDb import error:', error);
    if (error instanceof Error && error.message === 'TMDB_401') {
      return res.status(502).json({
        error: 'La credencial de TMDB no es valida. Revisa TMDB_API_TOKEN.',
      });
    }
    if (error instanceof Error && error.message === 'TMDB_TOKEN_MISSING') {
      return res.status(503).json({ error: 'Falta configurar TMDB_API_TOKEN.' });
    }
    return res.status(502).json({ error: 'No se pudieron importar los datos de IMDb' });
  }
});

export default router;
