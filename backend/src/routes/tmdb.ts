import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const token = process.env.TMDB_API_TOKEN;
router.use(authenticateToken);
router.get('/status', (_req, res) => res.json({ configured: Boolean(token), protectedFields: ['favorite', 'watched', 'watchlist', 'personalRating', 'collectionIds'] }));
router.get('/search', async (req, res) => {
  if (!token) return res.status(503).json({ error: 'TMDB todavia no esta configurado' });
  const query = String(req.query.query || '').trim(); if (!query) return res.json([]);
  const response = await fetch(`https://api.themoviedb.org/3/search/multi?language=es-AR&query=${encodeURIComponent(query)}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) return res.status(502).json({ error: 'TMDB no respondio correctamente' });
  const payload = await response.json() as { results?: any[] };
  return res.json((payload.results || []).filter((item) => item.media_type === 'movie' || item.media_type === 'tv').slice(0, 10).map((item) => ({ tmdbId: item.id, type: item.media_type === 'movie' ? 'movie' : 'series', title: item.title || item.name, originalTitle: item.original_title || item.original_name, year: Number((item.release_date || item.first_air_date || '').slice(0, 4)) || null, posterPath: item.poster_path || null })));
});
export default router;
