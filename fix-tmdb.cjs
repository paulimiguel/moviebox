const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'backend/src/routes/tmdb.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// Replace the entire new-releases router handler
const startIndex = content.indexOf(`router.get('/new-releases', async (req, res) => {`);
const endIndex = content.indexOf(`});\r\n\r\nexport default router;`);

const newHandler = `router.get('/new-releases', async (req, res) => {
  if (!token) return res.status(503).json({ error: 'TMDB todavia no esta configurado' });
  const platform = String(req.query.platform || 'netflix');
  const providerId = platform === 'prime' ? 119 : platform === 'apple' ? 350 : 8;
  try {
    const [moviesP1, moviesP2, seriesP1, seriesP2, movieGenresReq, seriesGenresReq] = await Promise.all([
      tmdbRequest<{ results?: any[] }>(\`/discover/movie?language=es-AR&sort_by=primary_release_date.desc&with_watch_providers=\${providerId}&watch_region=AR&vote_count.gte=5&page=1\`),
      tmdbRequest<{ results?: any[] }>(\`/discover/movie?language=es-AR&sort_by=primary_release_date.desc&with_watch_providers=\${providerId}&watch_region=AR&vote_count.gte=5&page=2\`),
      tmdbRequest<{ results?: any[] }>(\`/discover/tv?language=es-AR&sort_by=first_air_date.desc&with_watch_providers=\${providerId}&watch_region=AR&vote_count.gte=5&page=1\`),
      tmdbRequest<{ results?: any[] }>(\`/discover/tv?language=es-AR&sort_by=first_air_date.desc&with_watch_providers=\${providerId}&watch_region=AR&vote_count.gte=5&page=2\`),
      tmdbRequest<{ genres?: Array<{ id: number; name: string }> }>('/genre/movie/list?language=es-AR'),
      tmdbRequest<{ genres?: Array<{ id: number; name: string }> }>('/genre/tv/list?language=es-AR'),
    ]);
    const movieGenreNames = new Map((movieGenresReq.genres || []).map((g) => [g.id, g.name]));
    const seriesGenreNames = new Map((seriesGenresReq.genres || []).map((g) => [g.id, g.name]));

    const processItems = async (items: any[], type: 'movie' | 'series') => {
      const candidates = (items || []).slice(0, 24);
      const results = await allSettledInBatches(candidates, async (item) => {
        const resource = type === 'movie' ? 'movie' : 'tv';
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
`;

content = content.substring(0, startIndex) + newHandler + content.substring(endIndex);

fs.writeFileSync(filePath, content);
console.log('tmdb.ts updated successfully');

