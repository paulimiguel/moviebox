import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const token = process.env.TMDB_API_TOKEN;
const TMDB_URL = 'https://api.themoviedb.org/3';

const tmdbRequest = async <T>(path: string): Promise<T> => {
  if (!token) throw new Error('TMDB_TOKEN_MISSING');
  const url = new URL(`${TMDB_URL}${path}`);
  const usesBearerToken = token.startsWith('ey');
  if (!usesBearerToken) url.searchParams.set('api_key', token);
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      ...(usesBearerToken ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`TMDB_${response.status}`);
  return response.json() as Promise<T>;
};

router.use(authenticateToken);
router.get('/status', (_req, res) => res.json({ configured: Boolean(token), protectedFields: ['favorite', 'watched', 'watchlist', 'personalRating', 'collectionIds'] }));
router.get('/search', async (req, res) => {
  if (!token) return res.status(503).json({ error: 'TMDB todavia no esta configurado' });
  const query = String(req.query.query || '').trim(); if (!query) return res.json([]);
  try {
    const payload = await tmdbRequest<{ results?: any[] }>(`/search/multi?language=es-AR&query=${encodeURIComponent(query)}`);
    return res.json((payload.results || []).filter((item) => item.media_type === 'movie' || item.media_type === 'tv').slice(0, 10).map((item) => ({ tmdbId: item.id, type: item.media_type === 'movie' ? 'movie' : 'series', title: item.title || item.name, originalTitle: item.original_title || item.original_name, year: Number((item.release_date || item.first_air_date || '').slice(0, 4)) || null, posterPath: item.poster_path || null })));
  } catch {
    return res.status(502).json({ error: 'TMDB no respondio correctamente' });
  }
});

router.get('/suggestions', async (req, res) => {
  if (!token) return res.status(503).json({ error: 'TMDB todavia no esta configurado' });
  const query = String(req.query.query || '').trim();
  try {
    const path = query
      ? `/search/multi?language=es-AR&include_adult=false&query=${encodeURIComponent(query)}`
      : '/trending/all/week?language=es-AR';
    const [payload, movieGenres, seriesGenres] = await Promise.all([
      tmdbRequest<{ results?: any[] }>(path),
      tmdbRequest<{ genres?: Array<{ id: number; name: string }> }>('/genre/movie/list?language=es-AR'),
      tmdbRequest<{ genres?: Array<{ id: number; name: string }> }>('/genre/tv/list?language=es-AR'),
    ]);
    const movieGenreNames = new Map((movieGenres.genres || []).map((genre) => [genre.id, genre.name]));
    const seriesGenreNames = new Map((seriesGenres.genres || []).map((genre) => [genre.id, genre.name]));
    const candidates = (payload.results || [])
      .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
      .slice(0, 18);
    const suggestions = await Promise.all(candidates.map(async (item) => {
      const type = item.media_type === 'movie' ? 'movie' : 'series';
      const resource = type === 'movie' ? 'movie' : 'tv';
      try {
        const external = await tmdbRequest<{ imdb_id?: string | null }>(`/${resource}/${item.id}/external_ids`);
        if (!external.imdb_id) return null;
        return {
          tmdbId: item.id,
          imdbId: external.imdb_id,
          type,
          title: item.title || item.name,
          originalTitle: item.original_title || item.original_name || item.title || item.name,
          year: Number((item.release_date || item.first_air_date || '').slice(0, 4)) || null,
          overview: String(item.overview || '').trim() || null,
          genres: (item.genre_ids || []).map((id: number) => (type === 'movie' ? movieGenreNames : seriesGenreNames).get(id)).filter(Boolean).slice(0, 3),
          posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
          rating: Number.isFinite(Number(item.vote_average)) ? Number(item.vote_average) : null,
          popularity: Number.isFinite(Number(item.popularity)) ? Number(item.popularity) : 0,
        };
      } catch {
        return null;
      }
    }));
    return res.json(suggestions.filter(Boolean).slice(0, 12));
  } catch {
    return res.status(502).json({ error: 'No se pudieron cargar las sugerencias de TMDB' });
  }
});
export default router;
