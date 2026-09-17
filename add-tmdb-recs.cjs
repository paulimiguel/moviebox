const fs = require('fs');

const backendPath = 'backend/src/routes/tmdb.ts';
let content = fs.readFileSync(backendPath, 'utf-8');

const newRoute = `
router.get('/recommendations', async (req, res) => {
  if (!token) return res.status(503).json({ error: 'TMDB todavia no esta configurado' });
  const id = String(req.query.id || '').trim();
  const type = String(req.query.type || 'movie') === 'movie' ? 'movie' : 'series';
  if (!id) return res.status(400).json({ error: 'Falta ID' });
  
  try {
    const resource = type === 'movie' ? 'movie' : 'tv';
    const [recsReq, genresReq] = await Promise.all([
      tmdbRequest<{ results?: any[] }>(\`/\${resource}/\${id}/recommendations?language=es-AR\`),
      tmdbRequest<{ genres?: Array<{ id: number; name: string }> }>(\`/genre/\${resource}/list?language=es-AR\`),
    ]);
    const genreNames = new Map((genresReq.genres || []).map((g) => [g.id, g.name]));
    const candidates = (recsReq.results || []).slice(0, 15);
    
    const results = await allSettledInBatches(candidates, async (item) => {
      const external = await tmdbRequest<{ imdb_id?: string | null }>(\`/\${resource}/\${item.id}/external_ids\`);
      if (!external.imdb_id) return null;
      return {
        tmdbId: item.id,
        imdbId: external.imdb_id,
        type,
        title: item.title || item.name,
        originalTitle: item.original_title || item.original_name,
        year: Number((item.release_date || item.first_air_date || '').slice(0, 4)) || null,
        posterUrl: item.poster_path ? \`https://image.tmdb.org/t/p/w500\${item.poster_path}\` : null,
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

export default router;`;

content = content.replace('export default router;', newRoute);

fs.writeFileSync(backendPath, content, 'utf-8');
console.log('TMDB recommendations route added');

