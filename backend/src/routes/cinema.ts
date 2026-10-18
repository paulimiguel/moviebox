import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';

// Cartelera de cines de Argentina tomada de agendadecine.com (páginas públicas permitidas por su robots.txt).
// Es un proveedor externo "best effort": se guarda en memoria para no consultarlo en cada visita.
const SOURCE_BASE = 'https://agendadecine.com';
const LISTS = {
  'en-cartel': { url: `${SOURCE_BASE}/en-cartel`, title: 'Películas en cartel en cine' },
  'proximos-estrenos': { url: `${SOURCE_BASE}/proximos-estrenos`, title: 'Próximos estrenos en cine' },
} as const;
type ListKey = keyof typeof LISTS;

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 15_000;

export interface CinemaMovie {
  slug: string;
  url: string;
  title: string;
  originalTitle: string | null;
  year: number | null;
  durationMinutes: number | null;
  genres: string[];
  rating: string | null;
  releaseDate: string | null;
  status: string | null;
  posterUrl: string | null;
  trailerUrl: string | null;
  synopsis: string | null;
}

interface CinemaList {
  source: string;
  title: string;
  updatedAt: string;
  stale: boolean;
  items: CinemaMovie[];
}

const router = Router();
const cache = new Map<ListKey, { at: number; data: CinemaList }>();
const inflight = new Map<ListKey, Promise<CinemaList>>();

// Une los fragmentos self.__next_f.push([1,"..."]) de la página (datos que Next.js envía al navegador).
const flightText = (html: string) => {
  const parts: string[] = [];
  const pattern = /self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html))) {
    try {
      parts.push(JSON.parse(match[1]) as string);
    } catch {
      // Fragmento ilegible: se ignora.
    }
  }
  return parts.join('');
};

// Extrae los objetos JSON completos que contienen la marca indicada.
const objectsContaining = (text: string, marker: string) => {
  const found: Record<string, unknown>[] = [];
  let from = 0;
  for (;;) {
    const at = text.indexOf(marker, from);
    if (at < 0) break;
    const start = text.lastIndexOf('{', at);
    let depth = 0;
    let inString = false;
    let escaped = false;
    let end = -1;
    for (let index = start; index >= 0 && index < text.length; index += 1) {
      const char = text[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') inString = true;
      else if (char === '{') depth += 1;
      else if (char === '}') {
        depth -= 1;
        if (depth === 0) { end = index; break; }
      }
    }
    if (end < 0) { from = at + marker.length; continue; }
    try {
      found.push(JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>);
    } catch {
      // No era un objeto JSON válido.
    }
    from = end + 1;
  }
  return found;
};

const asString = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const asNumber = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null);
const asHttpUrl = (value: unknown) => {
  const text = asString(value);
  return text && /^https?:\/\//i.test(text) ? text : null;
};

const fromPayload = (html: string): CinemaMovie[] => {
  const unique = new Map<string, CinemaMovie>();
  for (const raw of objectsContaining(flightText(html), '"originalTitle":')) {
    const slug = asString(raw.slug);
    const originalTitle = asString(raw.originalTitle);
    if (!slug || !originalTitle || unique.has(slug)) continue;
    const release = (raw.release && typeof raw.release === 'object' ? raw.release : {}) as Record<string, unknown>;
    unique.set(slug, {
      slug,
      url: `${SOURCE_BASE}/pelicula/${encodeURIComponent(slug)}`,
      title: asString(release.localTitle) || originalTitle,
      originalTitle,
      year: asNumber(raw.year),
      durationMinutes: asNumber(raw.durationMinutes),
      genres: Array.isArray(raw.genres) ? raw.genres.filter((genre): genre is string => typeof genre === 'string') : [],
      rating: asString(release.rating),
      releaseDate: asString(release.releaseDate),
      status: asString(release.status),
      posterUrl: asHttpUrl(release.posterUrl),
      trailerUrl: asHttpUrl(release.trailerUrl),
      synopsis: asString(release.synopsis),
    });
  }
  return [...unique.values()];
};

// Respaldo si cambia el formato interno: solo la lista de títulos que la página declara para buscadores.
const fromStructuredData = (html: string): CinemaMovie[] => {
  const items: CinemaMovie[] = [];
  const pattern = /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html))) {
    try {
      const data = JSON.parse(match[1]) as { '@type'?: string; itemListElement?: { item?: { name?: string; url?: string } }[] };
      if (data['@type'] !== 'ItemList') continue;
      for (const element of data.itemListElement || []) {
        const name = asString(element.item?.name);
        const url = asHttpUrl(element.item?.url);
        if (!name || !url?.startsWith(`${SOURCE_BASE}/pelicula/`)) continue;
        items.push({ slug: url.split('/').pop() || name, url, title: name, originalTitle: null, year: null, durationMinutes: null, genres: [], rating: null, releaseDate: null, status: null, posterUrl: null, trailerUrl: null, synopsis: null });
      }
    } catch {
      // Bloque ilegible: se ignora.
    }
  }
  return items;
};

const fetchList = async (key: ListKey): Promise<CinemaList> => {
  const list = LISTS[key];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(list.url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'MovieBox/0.1 (+https://moviebox.beweb.com.ar)', Accept: 'text/html', 'Accept-Language': 'es-AR,es;q=0.9' },
    });
    if (!response.ok) throw new Error(`agendadecine respondió ${response.status}`);
    const html = await response.text();
    let items = fromPayload(html);
    if (!items.length) items = fromStructuredData(html);
    if (!items.length) throw new Error('No se pudo leer la lista de agendadecine');
    return { source: list.url, title: list.title, updatedAt: new Date().toISOString(), stale: false, items };
  } finally {
    clearTimeout(timer);
  }
};

const getList = async (key: ListKey): Promise<CinemaList> => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;
  let pending = inflight.get(key);
  if (!pending) {
    pending = fetchList(key).finally(() => inflight.delete(key));
    inflight.set(key, pending);
  }
  try {
    const data = await pending;
    cache.set(key, { at: Date.now(), data });
    return data;
  } catch (error) {
    // Si el sitio no responde pero hay datos guardados, se muestran los últimos conocidos.
    if (cached) return { ...cached.data, stale: true };
    throw error;
  }
};

router.use(authenticateToken);

router.get('/:list', async (req, res) => {
  const key = String(req.params.list) as ListKey;
  if (!(key in LISTS)) return res.status(404).json({ error: 'Lista no encontrada' });
  try {
    return res.json(await getList(key));
  } catch (error) {
    console.error(`No se pudo obtener ${key} de agendadecine`, error);
    return res.status(502).json({ error: 'No se pudo obtener la cartelera de cines. Probá de nuevo en unos minutos.' });
  }
});

export default router;
