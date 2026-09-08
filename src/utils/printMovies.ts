import { resolveMovieImageUrl } from '@/services/api';
import type { MovieItem } from '@/types/movie';

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

export const printMovies = (movies: MovieItem[], format: 'cards' | 'list') => {
  if (!movies.length) return;
  const win = window.open('', '_blank');
  if (!win) throw new Error('No se pudo abrir la ventana de impresion. Habilita las ventanas emergentes.');

  const items = movies.map((movie) => {
    const title = escapeHtml(movie.spanishTitle || movie.originalTitle);
    const image = movie.images.find((item) => item.isPrimary) || movie.images[0];
    const imageHtml = image ? `<img src="${escapeHtml(resolveMovieImageUrl(image.url))}" alt="" />` : '';
    const genre = escapeHtml(movie.genres.map((item) => item.name).join(', '));
    const platform = escapeHtml((movie.platforms.find((item) => item.isPrimary) || movie.platforms[0])?.name || '');
    return `<article>${imageHtml}<div class="body"><h2>${title}</h2><p>${[movie.year, movie.type === 'movie' ? 'Pelicula' : 'Serie'].filter(Boolean).join(' · ')}</p>${genre ? `<p>${genre}</p>` : ''}${platform ? `<p>${platform}</p>` : ''}</div></article>`;
  }).join('');

  win.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Movies</title><style>
    *{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#252a2e;margin:0}@page{size:A4 portrait;margin:14mm}h1{font-size:20px;margin:0 0 8mm}.content{display:${format === 'cards' ? 'grid' : 'flex'};grid-template-columns:repeat(3,1fr);flex-direction:column;gap:4mm}article{break-inside:avoid;border:1px solid #ddd;border-radius:5px;overflow:hidden;display:${format === 'list' ? 'grid' : 'block'};grid-template-columns:${format === 'list' ? '28mm 1fr' : 'none'}}article img{width:100%;aspect-ratio:2/3;object-fit:cover;display:block}.body{padding:3mm}h2{font-size:${format === 'list' ? '14px' : '12px'};margin:0 0 2mm}p{font-size:10px;color:#555;margin:1mm 0}${format === 'list' ? 'article img{height:42mm}' : ''}
  </style></head><body><h1>Movies</h1><div class="content">${items}</div><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250));<\/script></body></html>`);
  win.document.close();
};
