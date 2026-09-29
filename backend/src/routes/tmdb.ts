import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const token = process.env.TMDB_API_TOKEN;
const TMDB_URL = 'https://api.themoviedb.org/3';
const JUSTWATCH_URL = 'https://www.justwatch.com';
const CINEMETA_URL = 'https://v3-cinemeta.strem.io';

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

const allSettledInBatches = async <T, R>(items: T[], worker: (item: T, index: number) => Promise<R>, batchSize = 8) => {
  const results: PromiseSettledResult<R>[] = [];
  for (let index = 0; index < items.length; index += batchSize) {
    const chunk = items.slice(index, index + batchSize);
    results.push(...await Promise.allSettled(chunk.map((item, chunkIdx) => worker(item, index + chunkIdx))));
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

router.get('/search-platforms', async (req, res) => {
  if (!token) return res.status(503).json({ error: 'TMDB todavía no está configurado' });
  const query = String(req.query.query || '').trim();
  if (!query) return res.json([]);

  try {
    const [payload, movieGenresReq, seriesGenresReq] = await Promise.all([
      tmdbRequest<{ results?: any[] }>(
        `/search/multi?language=es-AR&include_adult=false&query=${encodeURIComponent(query)}`
      ),
      tmdbRequest<{ genres?: Array<{ id: number; name: string }> }>('/genre/movie/list?language=es-AR').catch(() => ({ genres: [] })),
      tmdbRequest<{ genres?: Array<{ id: number; name: string }> }>('/genre/tv/list?language=es-AR').catch(() => ({ genres: [] })),
    ]);
    const movieGenreNames = new Map((movieGenresReq.genres || []).map((g) => [g.id, g.name]));
    const seriesGenreNames = new Map((seriesGenresReq.genres || []).map((g) => [g.id, g.name]));

    const rawItems = (payload.results || [])
      .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
      .slice(0, 8);

    const results = await allSettledInBatches(rawItems, async (item) => {
      const type = item.media_type === 'movie' ? 'movie' : 'series';
      const resource = type === 'movie' ? 'movie' : 'tv';
      const gMap = type === 'movie' ? movieGenreNames : seriesGenreNames;
      const genres = (item.genre_ids || []).map((gid: number) => gMap.get(gid)).filter(Boolean);

      const [external, providers] = await Promise.all([
        tmdbRequest<{ imdb_id?: string | null }>(`/${resource}/${item.id}/external_ids`).catch(() => null),
        tmdbRequest<{
          results?: Record<string, {
            link?: string;
            flatrate?: Array<{ provider_id: number; provider_name: string; logo_path?: string | null; display_priority?: number }>;
            free?: Array<{ provider_id: number; provider_name: string; logo_path?: string | null; display_priority?: number }>;
            ads?: Array<{ provider_id: number; provider_name: string; logo_path?: string | null; display_priority?: number }>;
            buy?: Array<{ provider_id: number; provider_name: string; logo_path?: string | null; display_priority?: number }>;
            rent?: Array<{ provider_id: number; provider_name: string; logo_path?: string | null; display_priority?: number }>;
          }>;
        }>(`/${resource}/${item.id}/watch/providers`).catch(() => null),
      ]);

      const ar = providers?.results?.AR;
      const streamingRaw = [
        ...(ar?.flatrate || []).map((p) => ({ ...p, accessType: 'flatrate' as const })),
        ...(ar?.free || []).map((p) => ({ ...p, accessType: 'free' as const })),
        ...(ar?.ads || []).map((p) => ({ ...p, accessType: 'ads' as const })),
      ];

      const streamingMap = new Map<number, { id: number; name: string; logoUrl: string | null; accessType: 'flatrate' | 'free' | 'ads'; priority: number }>();
      streamingRaw.forEach((p) => {
        if (!streamingMap.has(p.provider_id)) {
          streamingMap.set(p.provider_id, {
            id: p.provider_id,
            name: p.provider_name,
            logoUrl: p.logo_path ? `https://image.tmdb.org/t/p/original${p.logo_path}` : null,
            accessType: p.accessType,
            priority: p.display_priority ?? 100,
          });
        }
      });
      const streamingPlatforms = Array.from(streamingMap.values()).sort((a, b) => a.priority - b.priority);

      const buyRentRaw = [
        ...(ar?.rent || []).map((p) => ({ ...p, accessType: 'rent' as const })),
        ...(ar?.buy || []).map((p) => ({ ...p, accessType: 'buy' as const })),
      ];
      const buyRentMap = new Map<number, { id: number; name: string; logoUrl: string | null; accessType: 'buy' | 'rent'; priority: number }>();
      buyRentRaw.forEach((p) => {
        if (!buyRentMap.has(p.provider_id) && !streamingMap.has(p.provider_id)) {
          buyRentMap.set(p.provider_id, {
            id: p.provider_id,
            name: p.provider_name,
            logoUrl: p.logo_path ? `https://image.tmdb.org/t/p/original${p.logo_path}` : null,
            accessType: p.accessType,
            priority: p.display_priority ?? 100,
          });
        }
      });
      const buyRentPlatforms = Array.from(buyRentMap.values()).sort((a, b) => a.priority - b.priority);

      return {
        tmdbId: item.id,
        imdbId: external?.imdb_id || null,
        type,
        title: item.title || item.name,
        originalTitle: item.original_title || item.original_name,
        year: Number((item.release_date || item.first_air_date || '').slice(0, 4)) || null,
        posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
        overview: item.overview || '',
        genres,
        rating: Number.isFinite(Number(item.vote_average)) ? Number(item.vote_average) : null,
        justwatchUrl: ar?.link || `https://www.justwatch.com/ar/buscar?q=${encodeURIComponent(item.title || item.name)}`,
        streamingPlatforms,
        buyRentPlatforms,
      };
    });

    const items = results.flatMap((r) => r.status === 'fulfilled' && r.value ? [r.value] : []);
    return res.json(items);
  } catch (error) {
    return res.status(502).json({ error: 'No se pudieron consultar las plataformas para el título' });
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
  
    let providerId = 8;
    if (platform === 'prime') providerId = 119;
    else if (platform === 'apple') providerId = 350;
    else if (platform === 'disney') providerId = 337;
    else if (platform === 'max') providerId = 1899;
    else if (platform === 'paramount') providerId = 531;
    else if (platform === 'claro') providerId = 167;
    else if (platform === 'flow') providerId = 339; // Movistar fallback
    
    const providerQuery = (platform === 'justwatch' || platform === 'stremio') ? '' : `&with_watch_providers=${providerId}&watch_region=AR`;

  try {
    const [moviesP1, moviesP2, seriesP1, seriesP2, movieGenresReq, seriesGenresReq] = await Promise.all([
      tmdbRequest<{ results?: any[] }>(`/discover/movie?language=es-AR&sort_by=primary_release_date.desc${providerQuery}&vote_count.gte=5&page=1`),
      tmdbRequest<{ results?: any[] }>(`/discover/movie?language=es-AR&sort_by=primary_release_date.desc${providerQuery}&vote_count.gte=5&page=2`),
      tmdbRequest<{ results?: any[] }>(`/discover/tv?language=es-AR&sort_by=first_air_date.desc${providerQuery}&vote_count.gte=5&page=1`),
      tmdbRequest<{ results?: any[] }>(`/discover/tv?language=es-AR&sort_by=first_air_date.desc${providerQuery}&vote_count.gte=5&page=2`),
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

router.get('/platform-suggestions', async (req, res) => {
  if (!token) return res.status(503).json({ error: 'TMDB todavía no está configurado' });
  const platform = String(req.query.platform || 'netflix');
  const filter = String(req.query.filter || 'populares');
  const seed = Number(req.query.seed || 0);

  if (platform === 'justwatch') {
    try {
      const popular = await getJustWatchPopularTitles();
      const shuffled = [...popular].sort(() => Math.random() - 0.5).slice(0, 32);
      const results = await allSettledInBatches(shuffled, async (item) => {
        const search = await tmdbRequest<{ results?: any[] }>(`/search/multi?language=es-AR&query=${encodeURIComponent(item.title)}`);
        const match = (search.results || []).find((r) => r.media_type === (item.type === 'movie' ? 'movie' : 'tv')) || search.results?.[0];
        if (!match) return null;
        const resource = match.media_type === 'movie' ? 'movie' : 'tv';
        const ext = await tmdbRequest<{ imdb_id?: string | null }>(`/${resource}/${match.id}/external_ids`);
        if (!ext?.imdb_id) return null;
        return {
          tmdbId: match.id,
          imdbId: ext.imdb_id,
          type: item.type,
          title: match.title || match.name,
          originalTitle: match.original_title || match.original_name,
          year: Number((match.release_date || match.first_air_date || '').slice(0, 4)) || null,
          posterUrl: match.poster_path ? `https://image.tmdb.org/t/p/w500${match.poster_path}` : null,
          overview: match.overview || '',
          genres: [],
          rating: Number.isFinite(Number(match.vote_average)) ? Number(match.vote_average) : null,
          popularity: Number.isFinite(Number(match.popularity)) ? Number(match.popularity) : 0,
        };
      });
      const candidates = results.flatMap((r) => r.status === 'fulfilled' && r.value ? [r.value] : []);
      if (filter === 'novedades') {
        candidates.sort((a, b) => (b.year || 0) - (a.year || 0));
      } else if (filter === 'mas_vistos') {
        candidates.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      } else {
        candidates.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      }
      return res.json(candidates.slice(0, 24));
    } catch {
      return res.status(502).json({ error: 'No se pudieron cargar sugerencias de JustWatch' });
    }
  }

  if (platform === 'stremio') {
    try {
      const skip = (Math.abs(seed) % 3) * 50;
      const skipParam = skip > 0 ? `/skip=${skip}` : '';
      const [moviesRes, seriesRes] = await Promise.all([
        fetch(`${CINEMETA_URL}/catalog/movie/top${skipParam}.json`, {
          headers: { Accept: 'application/json', 'User-Agent': 'MovieBox/1.0' },
          signal: AbortSignal.timeout(10_000),
        }),
        fetch(`${CINEMETA_URL}/catalog/series/top${skipParam}.json`, {
          headers: { Accept: 'application/json', 'User-Agent': 'MovieBox/1.0' },
          signal: AbortSignal.timeout(10_000),
        }),
      ]);

      if (moviesRes.ok && seriesRes.ok) {
        const [moviesData, seriesData] = await Promise.all([
          moviesRes.json() as Promise<{ metas?: any[] }>,
          seriesRes.json() as Promise<{ metas?: any[] }>,
        ]);
        const mList = (moviesData.metas || []).map((m: any) => ({ ...m, type: 'movie' }));
        const sList = (seriesData.metas || []).map((s: any) => ({ ...s, type: 'series' }));
        const pool = [...mList, ...sList].sort(() => Math.random() - 0.5).slice(0, 32);

        const results = await allSettledInBatches(pool, async (item) => {
          let tmdbId: number | null = null;
          let title = item.name;
          let originalTitle = item.name;
          let overview = item.description || '';
          let posterUrl = item.poster || null;
          let rating: number | null = item.imdbRating ? parseFloat(item.imdbRating) || null : null;
          let genres: string[] = item.genres || [];
          const year = parseInt(String(item.year || '').slice(0, 4), 10) || null;

          if (token && item.id) {
            try {
              const findRes = await tmdbRequest<{
                movie_results?: any[];
                tv_results?: any[];
              }>(`/find/${item.id}?external_source=imdb_id&language=es-AR`);
              const matched = item.type === 'movie' ? findRes.movie_results?.[0] : findRes.tv_results?.[0];
              if (matched) {
                tmdbId = matched.id;
                title = matched.title || matched.name || item.name;
                originalTitle = matched.original_title || matched.original_name || item.name;
                if (matched.overview) overview = matched.overview;
                if (matched.poster_path) posterUrl = `https://image.tmdb.org/t/p/w500${matched.poster_path}`;
                if (Number.isFinite(Number(matched.vote_average)) && Number(matched.vote_average) > 0) {
                  rating = Number(matched.vote_average);
                }
              }
            } catch {
              // best effort
            }
          }

          return {
            tmdbId: tmdbId || (item.type === 'movie' ? 85000000 : 95000000),
            imdbId: item.id,
            type: item.type,
            title,
            originalTitle,
            year,
            posterUrl,
            overview,
            genres: genres.slice(0, 3),
            rating,
            popularity: 80,
          };
        }, 8);

        const candidates = results.flatMap((r) => r.status === 'fulfilled' && r.value ? [r.value] : []);
        if (candidates.length > 0) {
          if (filter === 'novedades') {
            candidates.sort((a, b) => (b.year || 0) - (a.year || 0));
          } else if (filter === 'mas_vistos') {
            candidates.sort((a, b) => (b.rating || 0) - (a.rating || 0));
          }
          return res.json(candidates.slice(0, 24));
        }
      }
    } catch {
      // Si falla Cinemeta, continúa hacia TMDB discover sin provider abajo
    }
  }

  let providerId = 8;
  if (platform === 'prime') providerId = 119;
  else if (platform === 'apple') providerId = 350;
  else if (platform === 'disney') providerId = 337;
  else if (platform === 'max') providerId = 1899;
  else if (platform === 'paramount') providerId = 531;
  else if (platform === 'claro') providerId = 167;
  else if (platform === 'flow') providerId = 339;

  const providerQuery = platform === 'stremio' ? '' : `&with_watch_providers=${providerId}&watch_region=AR`;
  const basePage = Math.max(1, (Math.abs(seed) % 5) + 1);

  const today = new Date().toISOString().slice(0, 10);
  let movieQuery = 'sort_by=popularity.desc&vote_count.gte=30';
  let seriesQuery = 'sort_by=popularity.desc&vote_count.gte=20';

  if (filter === 'novedades') {
    movieQuery = `sort_by=primary_release_date.desc&primary_release_date.lte=${today}&vote_count.gte=5`;
    seriesQuery = `sort_by=first_air_date.desc&first_air_date.lte=${today}&vote_count.gte=5`;
  } else if (filter === 'mas_vistos') {
    movieQuery = 'sort_by=vote_count.desc&vote_count.gte=100';
    seriesQuery = 'sort_by=vote_count.desc&vote_count.gte=50';
  }

  try {
    const [moviesP1, moviesP2, seriesP1, seriesP2, movieGenresReq, seriesGenresReq] = await Promise.all([
      tmdbRequest<{ results?: any[] }>(`/discover/movie?language=es-AR&${movieQuery}${providerQuery}&page=${basePage}`),
      tmdbRequest<{ results?: any[] }>(`/discover/movie?language=es-AR&${movieQuery}${providerQuery}&page=${basePage + 1}`),
      tmdbRequest<{ results?: any[] }>(`/discover/tv?language=es-AR&${seriesQuery}${providerQuery}&page=${basePage}`),
      tmdbRequest<{ results?: any[] }>(`/discover/tv?language=es-AR&${seriesQuery}${providerQuery}&page=${basePage + 1}`),
      tmdbRequest<{ genres?: Array<{ id: number; name: string }> }>('/genre/movie/list?language=es-AR'),
      tmdbRequest<{ genres?: Array<{ id: number; name: string }> }>('/genre/tv/list?language=es-AR'),
    ]);

    const movieGenreNames = new Map((movieGenresReq.genres || []).map((g) => [g.id, g.name]));
    const seriesGenreNames = new Map((seriesGenresReq.genres || []).map((g) => [g.id, g.name]));

    const processItems = async (items: any[], type: 'movie' | 'series') => {
      const candidates = [...items].sort(() => Math.random() - 0.5).slice(0, 16);
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

    const combined = [...movies, ...series].sort(() => Math.random() - 0.5);
    return res.json(combined);
  } catch {
    return res.status(502).json({ error: 'No se pudieron cargar sugerencias' });
  }
});


router.get('/recommendations', async (req, res) => {
  if (!token) return res.status(503).json({ error: 'TMDB todavia no esta configurado' });
  const id = String(req.query.id || '').trim();
  const type = String(req.query.type || 'movie') === 'movie' ? 'movie' : 'series';
  if (!id) return res.status(400).json({ error: 'Falta ID' });
  
  try {
    const resource = type === 'movie' ? 'movie' : 'tv';
    const [recsReq, genresReq] = await Promise.all([
      tmdbRequest<{ results?: any[] }>(`/${resource}/${id}/recommendations?language=es-AR`),
      tmdbRequest<{ genres?: Array<{ id: number; name: string }> }>(`/genre/${resource}/list?language=es-AR`),
    ]);
    const genreNames = new Map((genresReq.genres || []).map((g) => [g.id, g.name]));
    const candidates = (recsReq.results || []).slice(0, 15);
    
    const results = await allSettledInBatches(candidates, async (item) => {
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
        genres: (item.genre_ids || []).map((id: number) => genreNames.get(id)).filter(Boolean).slice(0, 3),
        rating: Number.isFinite(Number(item.vote_average)) ? Number(item.vote_average) : null,
        popularity: Number.isFinite(Number(item.popularity)) ? Number(item.popularity) : 0,
      };
    });
    const suggestions = results.flatMap((r) => r.status === 'fulfilled' && r.value ? [r.value] : []);
    return res.json(suggestions);
  } catch {
    return res.status(502).json({ error: 'No se pudieron cargar recomendaciones' });
  }
});

let justwatchTop10Cache: { data: any[]; cachedAt: number } | null = null;
let justwatchTop10InFlight: Promise<any[]> | null = null;
const JW_CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

router.get('/justwatch-top10', async (_req, res) => {
  try {
    if (justwatchTop10InFlight) {
      const items = await justwatchTop10InFlight;
      return res.json(items);
    }

    const fetchTop10 = async () => {
      const query = `
        query GetPopularTitles($country: Country!, $filter: TitleFilter, $first: Int!) {
          popularTitles(country: $country, filter: $filter, first: $first, sortBy: POPULAR) {
            edges {
              node {
                id
                objectId
                objectType
                content(country: $country, language: "es") {
                  title
                  fullPath
                  originalReleaseYear
                  posterUrl
                  shortDescription
                  scoring {
                    imdbScore
                    tmdbScore
                  }
                }
              }
            }
          }
        }
      `;

      const jwRes = await fetch('https://apis.justwatch.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        body: JSON.stringify({
          operationName: 'GetPopularTitles',
          variables: {
            country: 'AR',
            filter: {
              ageCertifications: [],
              excludeGenres: [],
              excludeIrrelevantTitles: false,
              excludeProductionCountries: [],
              genres: [],
              monetizationTypes: [],
              objectTypes: [],
              packages: [],
              presentationTypes: [],
              productionCountries: [],
              subgenres: [],
            },
            first: 10,
          },
          query,
        }),
        signal: AbortSignal.timeout(15_000),
      });

      if (!jwRes.ok) throw new Error(`JUSTWATCH_GQL_${jwRes.status}`);
      const jwData = (await jwRes.json()) as any;
      const edges = jwData?.data?.popularTitles?.edges || [];

      let movieGenreNames = new Map<number, string>();
      let seriesGenreNames = new Map<number, string>();
      if (token) {
        try {
          const [mg, sg] = await Promise.all([
            tmdbRequest<{ genres?: Array<{ id: number; name: string }> }>('/genre/movie/list?language=es-AR'),
            tmdbRequest<{ genres?: Array<{ id: number; name: string }> }>('/genre/tv/list?language=es-AR'),
          ]);
          movieGenreNames = new Map((mg.genres || []).map((g) => [g.id, g.name]));
          seriesGenreNames = new Map((sg.genres || []).map((g) => [g.id, g.name]));
        } catch {
          // best effort
        }
      }

      const items = await Promise.all(
        edges.map(async (edge: any, index: number) => {
          const node = edge.node;
          const c = node.content || {};
          const type: 'movie' | 'series' = node.objectType === 'SHOW' ? 'series' : 'movie';
          const rawPoster = c.posterUrl
            ? `https://images.justwatch.com${c.posterUrl.replace('{profile}', 's332').replace('{format}', 'webp')}`
            : null;

          let tmdbId: number | null = null;
          let imdbId: string | null = null;
          let originalTitle = c.title;
          let overview = c.shortDescription || '';
          let posterUrl = rawPoster;
          let genres: string[] = [];
          let rating: number | null = c.scoring?.imdbScore || c.scoring?.tmdbScore || null;

          if (token) {
            try {
              const tmdbSearch = await tmdbRequest<{ results?: any[] }>(
                `/search/multi?language=es-AR&include_adult=false&query=${encodeURIComponent(c.title)}`
              );
              const mediaType = type === 'movie' ? 'movie' : 'tv';
              const matched = (tmdbSearch.results || []).find((r) => r.media_type === mediaType) || tmdbSearch.results?.[0];
              if (matched) {
                tmdbId = matched.id;
                originalTitle = matched.original_title || matched.original_name || c.title;
                if (matched.overview) overview = matched.overview;
                if (matched.poster_path) posterUrl = `https://image.tmdb.org/t/p/w500${matched.poster_path}`;
                if (Number.isFinite(Number(matched.vote_average))) rating = Number(matched.vote_average);
                const gMap = type === 'movie' ? movieGenreNames : seriesGenreNames;
                genres = (matched.genre_ids || []).map((gid: number) => gMap.get(gid)).filter(Boolean);

                const resource = matched.media_type === 'movie' ? 'movie' : 'tv';
                const ext = await tmdbRequest<{ imdb_id?: string | null }>(`/${resource}/${matched.id}/external_ids`);
                if (ext?.imdb_id) imdbId = ext.imdb_id;
              }
            } catch {
              // best effort fallback
            }
          }

          let subBadge: string | null = null;
          if (type === 'series') {
            if (c.originalReleaseYear === 2026 || c.originalReleaseYear === 2025) {
              subBadge = 'Nuevo episodio';
            }
          }

          return {
            rank: index + 1,
            jwId: node.id,
            tmdbId: tmdbId || (90000000 + index),
            imdbId: imdbId || '',
            type,
            title: c.title,
            originalTitle,
            year: c.originalReleaseYear || null,
            overview,
            genres,
            posterUrl,
            rating,
            popularity: 100 - index,
            badge: type === 'series' ? 'TV' : 'PELÍCULA',
            subBadge,
            justwatchUrl: c.fullPath ? `https://www.justwatch.com${c.fullPath}` : null,
          };
        })
      );

      justwatchTop10Cache = { data: items, cachedAt: Date.now() };
      return items;
    };

    justwatchTop10InFlight = fetchTop10();
    const items = await justwatchTop10InFlight;
    return res.json(items);
  } catch (error) {
    if (justwatchTop10Cache) return res.json(justwatchTop10Cache.data);
    return res.status(502).json({ error: 'No se pudo cargar el Top 10 de JustWatch' });
  } finally {
    justwatchTop10InFlight = null;
  }
});

const JW_PLATFORM_PACKAGES: Record<string, string | null> = {
  netflix: 'nfx',
  prime: 'prv',
  apple: 'atp',
  disney: 'dnp',
  max: 'mxx',
  flow: 'mvp',
  paramount: 'pmp',
  justwatch: null,
};

const JW_PLATFORM_NAMES: Record<string, string> = {
  netflix: 'Netflix',
  prime: 'Prime Video',
  apple: 'Apple TV',
  disney: 'Disney+',
  max: 'HBO Max',
  flow: 'Flow',
  paramount: 'Paramount+',
  justwatch: 'JustWatch',
  stremio: 'Stremio',
};

const justwatchPlatformPopularCache = new Map<string, { data: any; cachedAt: number }>();

router.get('/justwatch-platform-popular', async (req, res) => {
  const platform = String(req.query.platform || 'netflix').toLowerCase();
  const cached = justwatchPlatformPopularCache.get(platform);
  if (cached && Date.now() - cached.cachedAt < JW_CACHE_TTL_MS) {
    return res.json(cached.data);
  }

  if (platform === 'stremio') {
    try {
      const [moviesRes, seriesRes] = await Promise.all([
        fetch(`${CINEMETA_URL}/catalog/movie/top.json`, {
          headers: { Accept: 'application/json', 'User-Agent': 'MovieBox/1.0' },
          signal: AbortSignal.timeout(15_000),
        }),
        fetch(`${CINEMETA_URL}/catalog/series/top.json`, {
          headers: { Accept: 'application/json', 'User-Agent': 'MovieBox/1.0' },
          signal: AbortSignal.timeout(15_000),
        }),
      ]);

      if (!moviesRes.ok || !seriesRes.ok) throw new Error('CINEMETA_CATALOG_FAILED');
      const [moviesData, seriesData] = await Promise.all([
        moviesRes.json() as Promise<{ metas?: any[] }>,
        seriesRes.json() as Promise<{ metas?: any[] }>,
      ]);

      const movieMetas = (moviesData.metas || []).slice(0, 50);
      const seriesMetas = (seriesData.metas || []).slice(0, 50);

      let movieGenreNames = new Map<number, string>();
      let seriesGenreNames = new Map<number, string>();
      if (token) {
        try {
          const [mg, sg] = await Promise.all([
            tmdbRequest<{ genres?: Array<{ id: number; name: string }> }>('/genre/movie/list?language=es-AR'),
            tmdbRequest<{ genres?: Array<{ id: number; name: string }> }>('/genre/tv/list?language=es-AR'),
          ]);
          movieGenreNames = new Map((mg.genres || []).map((g) => [g.id, g.name]));
          seriesGenreNames = new Map((sg.genres || []).map((g) => [g.id, g.name]));
        } catch {
          // best effort
        }
      }

      const processMetas = async (metas: any[], type: 'movie' | 'series') => {
        const results = await allSettledInBatches(metas, async (meta: any, index: number) => {
          let tmdbId: number | null = null;
          let title = meta.name;
          let originalTitle = meta.name;
          let overview = meta.description || '';
          let posterUrl = meta.poster || null;
          let rating: number | null = meta.imdbRating ? parseFloat(meta.imdbRating) || null : null;
          let genres: string[] = meta.genres || [];
          const year = parseInt(String(meta.year || '').slice(0, 4), 10) || null;

          if (token && meta.id) {
            try {
              const findRes = await tmdbRequest<{
                movie_results?: any[];
                tv_results?: any[];
              }>(`/find/${meta.id}?external_source=imdb_id&language=es-AR`);
              const matched = type === 'movie' ? findRes.movie_results?.[0] : findRes.tv_results?.[0];
              if (matched) {
                tmdbId = matched.id;
                title = matched.title || matched.name || meta.name;
                originalTitle = matched.original_title || matched.original_name || meta.name;
                if (matched.overview) overview = matched.overview;
                if (matched.poster_path) posterUrl = `https://image.tmdb.org/t/p/w500${matched.poster_path}`;
                if (Number.isFinite(Number(matched.vote_average)) && Number(matched.vote_average) > 0) {
                  rating = Number(matched.vote_average);
                }
                const gMap = type === 'movie' ? movieGenreNames : seriesGenreNames;
                if (matched.genre_ids?.length) {
                  const mapped = matched.genre_ids.map((gid: number) => gMap.get(gid)).filter(Boolean);
                  if (mapped.length) genres = mapped;
                }
              }
            } catch {
              // best effort
            }
          }

          let subBadge: string | null = null;
          if (type === 'series') {
            if (year === 2026 || year === 2025) {
              subBadge = 'Nuevo episodio';
            }
          }

          return {
            rank: index + 1,
            jwId: meta.id,
            tmdbId: tmdbId || (type === 'movie' ? 80000000 + index : 90000000 + index),
            imdbId: meta.id,
            type,
            title,
            originalTitle,
            year,
            overview,
            genres,
            posterUrl,
            rating,
            popularity: 100 - index,
            badge: type === 'series' ? 'TV' : 'PELÍCULA',
            subBadge,
            justwatchUrl: `https://www.imdb.com/title/${meta.id}`,
          };
        }, 8);

        return results.flatMap((r) => (r.status === 'fulfilled' && r.value ? [r.value] : []));
      };

      const [popularMovies, popularSeries] = await Promise.all([
        processMetas(movieMetas, 'movie'),
        processMetas(seriesMetas, 'series'),
      ]);

      const featuredMovies = popularMovies.slice(0, 10);
      const featuredSeries = popularSeries.slice(0, 10);

      const payload = {
        platform: 'stremio',
        platformName: 'Stremio',
        featuredMovies,
        featuredSeries,
        popularMovies,
        popularSeries,
      };

      justwatchPlatformPopularCache.set('stremio', { data: payload, cachedAt: Date.now() });
      return res.json(payload);
    } catch (error) {
      if (cached) return res.json(cached.data);
      return res.status(502).json({ error: 'No se pudieron cargar los populares de Stremio' });
    }
  }

  const pkg = platform in JW_PLATFORM_PACKAGES ? JW_PLATFORM_PACKAGES[platform] : JW_PLATFORM_PACKAGES.netflix;
  const platformName = JW_PLATFORM_NAMES[platform] || 'Plataforma';

  try {
    const query = `
      query GetPlatformPopular($country: Country!, $movieFilter: TitleFilter, $seriesFilter: TitleFilter, $first: Int!) {
        movies: popularTitles(country: $country, filter: $movieFilter, first: $first, sortBy: POPULAR) {
          edges {
            node {
              id
              objectId
              objectType
              content(country: $country, language: "es") {
                title
                fullPath
                originalReleaseYear
                posterUrl
                shortDescription
                scoring {
                  imdbScore
                  tmdbScore
                }
              }
            }
          }
        }
        series: popularTitles(country: $country, filter: $seriesFilter, first: $first, sortBy: POPULAR) {
          edges {
            node {
              id
              objectId
              objectType
              content(country: $country, language: "es") {
                title
                fullPath
                originalReleaseYear
                posterUrl
                shortDescription
                scoring {
                  imdbScore
                  tmdbScore
                }
              }
            }
          }
        }
      }
    `;

    const jwRes = await fetch('https://apis.justwatch.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({
        operationName: 'GetPlatformPopular',
        variables: {
          country: 'AR',
          movieFilter: {
            packages: pkg ? [pkg] : [],
            objectTypes: ['MOVIE'],
          },
          seriesFilter: {
            packages: pkg ? [pkg] : [],
            objectTypes: ['SHOW'],
          },
          first: 50,
        },
        query,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!jwRes.ok) throw new Error(`JUSTWATCH_GQL_${jwRes.status}`);
    const jwData = (await jwRes.json()) as any;
    const movieEdges = jwData?.data?.movies?.edges || [];
    const seriesEdges = jwData?.data?.series?.edges || [];

    let movieGenreNames = new Map<number, string>();
    let seriesGenreNames = new Map<number, string>();
    if (token) {
      try {
        const [mg, sg] = await Promise.all([
          tmdbRequest<{ genres?: Array<{ id: number; name: string }> }>('/genre/movie/list?language=es-AR'),
          tmdbRequest<{ genres?: Array<{ id: number; name: string }> }>('/genre/tv/list?language=es-AR'),
        ]);
        movieGenreNames = new Map((mg.genres || []).map((g) => [g.id, g.name]));
        seriesGenreNames = new Map((sg.genres || []).map((g) => [g.id, g.name]));
      } catch {
        // best effort
      }
    }

    const processEdges = async (edges: any[], type: 'movie' | 'series') => {
      const results = await allSettledInBatches(edges, async (edge: any, index: number) => {
        const node = edge.node;
        const c = node.content || {};
        const rawPoster = c.posterUrl
          ? `https://images.justwatch.com${c.posterUrl.replace('{profile}', 's332').replace('{format}', 'webp')}`
          : null;

        let tmdbId: number | null = null;
        let imdbId: string | null = null;
        let originalTitle = c.title;
        let overview = c.shortDescription || '';
        let posterUrl = rawPoster;
        let genres: string[] = [];
        let rating: number | null = c.scoring?.imdbScore || c.scoring?.tmdbScore || null;

        if (token) {
          try {
            const tmdbSearch = await tmdbRequest<{ results?: any[] }>(
              `/search/multi?language=es-AR&include_adult=false&query=${encodeURIComponent(c.title)}`
            );
            const mediaType = type === 'movie' ? 'movie' : 'tv';
            const matched = (tmdbSearch.results || []).find((r) => r.media_type === mediaType) || tmdbSearch.results?.[0];
            if (matched) {
              tmdbId = matched.id;
              originalTitle = matched.original_title || matched.original_name || c.title;
              if (matched.overview) overview = matched.overview;
              if (matched.poster_path) posterUrl = `https://image.tmdb.org/t/p/w500${matched.poster_path}`;
              if (Number.isFinite(Number(matched.vote_average))) rating = Number(matched.vote_average);
              const gMap = type === 'movie' ? movieGenreNames : seriesGenreNames;
              genres = (matched.genre_ids || []).map((gid: number) => gMap.get(gid)).filter(Boolean);

              // Para los primeros 10 buscamos además el external imdb_id para enriquecimiento completo
              if (index < 10) {
                try {
                  const resource = matched.media_type === 'movie' ? 'movie' : 'tv';
                  const ext = await tmdbRequest<{ imdb_id?: string | null }>(`/${resource}/${matched.id}/external_ids`);
                  if (ext?.imdb_id) imdbId = ext.imdb_id;
                } catch {
                  // best effort
                }
              }
            }
          } catch {
            // best effort fallback
          }
        }

        let subBadge: string | null = null;
        if (type === 'series') {
          if (c.originalReleaseYear === 2026 || c.originalReleaseYear === 2025) {
            subBadge = 'Nuevo episodio';
          }
        }

        return {
          rank: index + 1,
          jwId: node.id,
          tmdbId: tmdbId || (type === 'movie' ? 80000000 + index : 90000000 + index),
          imdbId: imdbId || '',
          type,
          title: c.title,
          originalTitle,
          year: c.originalReleaseYear || null,
          overview,
          genres,
          posterUrl,
          rating,
          popularity: 100 - index,
          badge: type === 'series' ? 'TV' : 'PELÍCULA',
          subBadge,
          justwatchUrl: c.fullPath ? `https://www.justwatch.com${c.fullPath}` : null,
        };
      }, 8);

      return results.flatMap((r) => (r.status === 'fulfilled' && r.value ? [r.value] : []));
    };

    const [popularMovies, popularSeries] = await Promise.all([
      processEdges(movieEdges, 'movie'),
      processEdges(seriesEdges, 'series'),
    ]);

    const featuredMovies = popularMovies.slice(0, 10);
    const featuredSeries = popularSeries.slice(0, 10);

    const payload = {
      platform,
      platformName,
      featuredMovies,
      featuredSeries,
      popularMovies,
      popularSeries,
    };

    justwatchPlatformPopularCache.set(platform, { data: payload, cachedAt: Date.now() });
    return res.json(payload);
  } catch (error) {
    if (cached) return res.json(cached.data);
    return res.status(502).json({ error: 'No se pudieron cargar los populares de JustWatch para la plataforma seleccionada' });
  }
});

export default router;
