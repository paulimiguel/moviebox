import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const token = process.env.TMDB_API_TOKEN;
const TMDB_URL = 'https://api.themoviedb.org/3';
const JUSTWATCH_URL = 'https://www.justwatch.com';

const decodeHtml = (value: string) => value
  .replace(/&quot;/g, '"')
  .replace(/&#(?:x27|39);/gi, "'")
  .replace(/&amp;/g, '&');

type JustWatchPopularTitle = { path: string; title: string; type: 'movie' | 'series' };

const getJustWatchPopularPage = async (path: string): Promise<JustWatchPopularTitle[]> => {
  const response = await fetch(`${JUSTWATCH_URL}${path}`, {
    headers: { Accept: 'text/html', 'User-Agent': 'Mozilla/5.0 MovieBox/0.1' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`JUSTWATCH_${response.status}`);
  const html = await response.text();
  const matches = Array.from(html.matchAll(/<a\s+[^>]*href="(?:https:\/\/www\.justwatch\.com)?(\/ar\/(?:pelicula|serie)\/[^"?#]+)"[^>]*>[\s\S]{0,1200}?<img[^>]*\salt="([^"]+)"/gi));
  const unique = new Map<string, JustWatchPopularTitle>();
  matches.forEach((match) => {
    const path = decodeHtml(match[1]);
    if (unique.has(path)) return;
    unique.set(path, {
      path,
      title: decodeHtml(match[2]).trim(),
      type: path.startsWith('/ar/pelicula/') ? 'movie' : 'series',
    });
  });
  const popular = Array.from(unique.values()).filter((item) => item.title).slice(0, 40);
  if (!popular.length) throw new Error('JUSTWATCH_POPULAR_EMPTY');
  return popular;
};

const getJustWatchPopularTitles = async () => {
  const [mixed, movies, series] = await Promise.all([
    getJustWatchPopularPage('/ar'),
    getJustWatchPopularPage('/ar/peliculas'),
    getJustWatchPopularPage('/ar/series'),
  ]);
  const unique = new Map(mixed.map((item) => [item.path, item]));
  const supplemental = [movies, series];
  for (let index = 0; unique.size < 80 && supplemental.some((items) => index < items.length); index += 1) {
    supplemental.forEach((items) => {
      const item = items[index];
      if (item && unique.size < 80) unique.set(item.path, item);
    });
  }
  return Array.from(unique.values()).slice(0, 80);
};

const allSettledInBatches = async <T, R>(items: T[], worker: (item: T) => Promise<R>, batchSize = 8) => {
  const results: PromiseSettledResult<R>[] = [];
  for (let index = 0; index < items.length; index += batchSize) {
    results.push(...await Promise.allSettled(items.slice(index, index + batchSize).map(worker)));
  }
  return results;
};

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
    const [movieGenres, seriesGenres] = await Promise.all([
      tmdbRequest<{ genres?: Array<{ id: number; name: string }> }>('/genre/movie/list?language=es-AR'),
      tmdbRequest<{ genres?: Array<{ id: number; name: string }> }>('/genre/tv/list?language=es-AR'),
    ]);
    const movieGenreNames = new Map((movieGenres.genres || []).map((genre) => [genre.id, genre.name]));
    const seriesGenreNames = new Map((seriesGenres.genres || []).map((genre) => [genre.id, genre.name]));
    let candidates: any[];
    if (query) {
      const payload = await tmdbRequest<{ results?: any[] }>(`/search/multi?language=es-AR&include_adult=false&query=${encodeURIComponent(query)}`);
      candidates = (payload.results || []).filter((item) => item.media_type === 'movie' || item.media_type === 'tv').slice(0, 18);
    } else {
      const popular = await getJustWatchPopularTitles();
      const resolved = await allSettledInBatches(popular, async (popularItem) => {
        const payload = await tmdbRequest<{ results?: any[] }>(`/search/multi?language=es-AR&include_adult=false&query=${encodeURIComponent(popularItem.title)}`);
        const mediaType = popularItem.type === 'movie' ? 'movie' : 'tv';
        return (payload.results || []).find((item) => item.media_type === mediaType) || null;
      });
      const unique = new Map<string, any>();
      resolved.forEach((result) => {
        if (result.status !== 'fulfilled' || !result.value) return;
        unique.set(`${result.value.media_type}-${result.value.id}`, result.value);
      });
      candidates = Array.from(unique.values());
    }
    const suggestionResults = await allSettledInBatches(candidates, async (item) => {
      const type = item.media_type === 'movie' ? 'movie' : 'series';
      const resource = type === 'movie' ? 'movie' : 'tv';
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
    });
    const suggestions = suggestionResults.flatMap((result) => result.status === 'fulfilled' && result.value ? [result.value] : []);
    return res.json(suggestions.slice(0, query ? 12 : 56));
  } catch {
    return res.status(502).json({ error: query ? 'No se pudieron cargar los resultados de TMDB' : 'No se pudieron cargar los títulos populares de JustWatch' });
  }
});
router.get('/new-releases', async (req, res) => {
  if (!token) return res.status(503).json({ error: 'TMDB todavia no esta configurado' });
  const platform = String(req.query.platform || 'netflix');
  const providerId = platform === 'prime' ? 119 : platform === 'apple' ? 350 : 8;
  try {
    const [moviesP1, moviesP2, seriesP1, seriesP2, movieGenresReq, seriesGenresReq] = await Promise.all([
      tmdbRequest<{ results?: any[] }>(`/discover/movie?language=es-AR&sort_by=primary_release_date.desc&with_watch_providers=${providerId}&watch_region=AR&vote_count.gte=5&page=1`),
      tmdbRequest<{ results?: any[] }>(`/discover/movie?language=es-AR&sort_by=primary_release_date.desc&with_watch_providers=${providerId}&watch_region=AR&vote_count.gte=5&page=2`),
      tmdbRequest<{ results?: any[] }>(`/discover/tv?language=es-AR&sort_by=first_air_date.desc&with_watch_providers=${providerId}&watch_region=AR&vote_count.gte=5&page=1`),
      tmdbRequest<{ results?: any[] }>(`/discover/tv?language=es-AR&sort_by=first_air_date.desc&with_watch_providers=${providerId}&watch_region=AR&vote_count.gte=5&page=2`),
      tmdbRequest<{ genres?: Array<{ id: number; name: string }> }>('/genre/movie/list?language=es-AR'),
      tmdbRequest<{ genres?: Array<{ id: number; name: string }> }>('/genre/tv/list?language=es-AR'),
    ]);
    const movieGenreNames = new Map((movieGenresReq.genres || []).map((g) => [g.id, g.name]));
    const seriesGenreNames = new Map((seriesGenresReq.genres || []).map((g) => [g.id, g.name]));

    const processItems = async (items: any[], type: 'movie' | 'series') => {
      const candidates = (items || []).slice(0, 24);
      const results = await allSettledInBatches(candidates, async (item) => {
        const resource = type === 'movie' ? 'movie' : 'tv';
        const external = await tmdbRequest<{ imdb_id?: string | null }>(`/${resource}/${item.id}/external_ids`);
        if (!external.imdb_id) return null;
        return {
          tmdbId: item.id,
          imdbId: external.imdb_id,
          type,
          title: item.title || item.name,
          originalTitle: item.original_title || item.original_name,
          year: Number((item.release_date || item.first_air_date || '').slice(0, 4)) || null,
          posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
          overview: item.overview || '',
          genres: (item.genre_ids || []).map((id: number) => (type === 'movie' ? movieGenreNames : seriesGenreNames).get(id)).filter(Boolean).slice(0, 3),
          rating: Number.isFinite(Number(item.vote_average)) ? Number(item.vote_average) : null,
          popularity: Number.isFinite(Number(item.popularity)) ? Number(item.popularity) : 0,
        };
      });
      return results.flatMap((r) => r.status === 'fulfilled' && r.value ? [r.value] : []);
    };
    
    const [movies, series] = await Promise.all([
      processItems([...(moviesP1.results || []), ...(moviesP2.results || [])], 'movie'),
      processItems([...(seriesP1.results || []), ...(seriesP2.results || [])], 'series'),
    ]);
    
    return res.json({ movies, series });
  } catch (error) {
    return res.status(502).json({ error: 'No se pudieron cargar las novedades' });
  }
});

export default router;
