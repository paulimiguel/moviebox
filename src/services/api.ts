import type { CreateMovieCollectionInput, CreateMovieInput, GenreCatalogItem, ImdbImportedMovieData, ImdbImportRequest, ImdbSearchCandidate, JustWatchPlatformPopularResponse, JustWatchTop10Item, MovieCollection, MovieItem, MoviePersonalUpdate, PlatformCatalogItem, TitlePlatformResult, TmdbCastMember, TmdbSuggestionCandidate } from '@/types/movie';

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3003/api');
const TOKEN_KEY = 'moviebox_auth_token';

export interface SharedCollectionPreview {
  name: string;
  description: string | null;
  coverImage: string | null;
  ownerName: string;
  isOwner: boolean;
  titleCount: number;
  titles: { id: string; type: 'movie' | 'series'; title: string; year: number | null; posterUrl: string | null; inLibrary: boolean }[];
}

export interface SharedCollectionImportResult {
  collection: { id: string; name: string };
  added: number;
  alreadyHad: number;
  failed: string[];
}

export type CinemaListKey = 'en-cartel' | 'proximos-estrenos';

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

export interface CinemaList {
  source: string;
  title: string;
  updatedAt: string;
  stale: boolean;
  items: CinemaMovie[];
}

export interface MovieBoxUser {
  id: string;
  email: string;
  name: string;
  alias: string | null;
  profilePhoto: string | null;
  preferredPlatforms: string[];
}

interface AuthResponse {
  token: string;
  user: MovieBoxUser;
}

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const token = localStorage.getItem(TOKEN_KEY);
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) localStorage.removeItem(TOKEN_KEY);
    // El estado HTTP permite distinguir una sesión vencida (401) de un corte de conexión o un error del servidor.
    throw Object.assign(new Error(payload.error || 'No se pudo completar la solicitud'), { status: response.status });
  }

  return payload as T;
};

const saveAuth = (response: AuthResponse) => {
  localStorage.setItem(TOKEN_KEY, response.token);
  // Pide al navegador que no borre el almacenamiento de MovieBox cuando falte espacio.
  void navigator.storage?.persist?.().catch(() => undefined);
  return response.user;
};

export const authToken = {
  exists: () => Boolean(localStorage.getItem(TOKEN_KEY)),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export const api = {
  imdb: {
    search: (query: string) => request<ImdbSearchCandidate[]>(`/imdb/search?query=${encodeURIComponent(query)}`),
    import: (input: ImdbImportRequest) => request<ImdbImportedMovieData>('/imdb/import', { method: 'POST', body: JSON.stringify(input) }),
  },
  auth: {
    getGoogleLoginUrl: (returnTo: string) =>
      `${API_BASE_URL}/auth/google?returnTo=${encodeURIComponent(returnTo)}`,
    completeGoogleLogin: async () => {
      const response = await fetch(`${API_BASE_URL}/auth/google/session`, {
        credentials: 'include',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.token || !payload.user) {
        throw new Error(payload.error || 'No se pudo iniciar sesion con Google');
      }
      return saveAuth(payload as AuthResponse);
    },
    login: async (email: string, password: string) =>
      saveAuth(await request<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })),
    register: async (name: string, email: string, password: string) =>
      saveAuth(await request<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      })),
    me: async () => (await request<{ user: MovieBoxUser }>('/auth/me')).user,
    restore: async () => saveAuth(await request<AuthResponse>('/auth/restore')),
    logout: () => request<void>('/auth/logout', { method: 'POST' }).catch(() => undefined),
    updatePreferredPlatforms: async (preferredPlatforms: string[]) =>
      (await request<{ user: MovieBoxUser }>('/auth/me/platforms', {
        method: 'PATCH',
        body: JSON.stringify({ preferredPlatforms }),
      })).user,
  },
  movies: {
    getAll: () => request<MovieItem[]>('/movies'),
    getOne: (id: string) => request<MovieItem>(`/movies/${id}`),
    create: (input: CreateMovieInput) => request<MovieItem>('/movies', { method: 'POST', body: JSON.stringify(input) }),
    update: (id: string, input: CreateMovieInput) => request<MovieItem>(`/movies/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
    updatePersonal: (id: string, input: MoviePersonalUpdate) => request<MovieItem>(`/movies/${id}/personal`, { method: 'PATCH', body: JSON.stringify(input) }),
    remove: (id: string) => request<void>(`/movies/${id}`, { method: 'DELETE' }),
  },
  collections: {
    getAll: () => request<MovieCollection[]>('/collections'),
    create: (input: CreateMovieCollectionInput) => request<MovieCollection>('/collections', { method: 'POST', body: JSON.stringify(input) }),
    update: (id: string, input: CreateMovieCollectionInput) => request<MovieCollection>(`/collections/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
    remove: (id: string) => request<void>(`/collections/${id}`, { method: 'DELETE' }),
    share: (id: string) => request<{ token: string }>(`/collections/${id}/share`, { method: 'POST' }),
    unshare: (id: string) => request<void>(`/collections/${id}/share`, { method: 'DELETE' }),
  },
  cinema: {
    list: (key: CinemaListKey) => request<CinemaList>(`/cinema/${key}`),
  },
  sharedCollections: {
    get: (token: string) => request<SharedCollectionPreview>(`/shared-collections/${encodeURIComponent(token)}`),
    import: (token: string) => request<SharedCollectionImportResult>(`/shared-collections/${encodeURIComponent(token)}/import`, { method: 'POST' }),
  },
  platforms: {
    getAll: () => request<PlatformCatalogItem[]>('/platforms'),
    update: (id: string, input: { name: string; logoPath?: string | null }) => request<PlatformCatalogItem>(`/platforms/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
    remove: (id: string) => request<{ deleted: true; movieCount: number }>(`/platforms/${id}`, { method: 'DELETE' }),
  },
  genres: {
    getAll: () => request<GenreCatalogItem[]>('/genres'),
    update: (id: string, input: { name: string; imagePath?: string | null }) => request<GenreCatalogItem>(`/genres/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
    remove: (id: string) => request<{ deleted: true; movieCount: number }>(`/genres/${id}`, { method: 'DELETE' }),
  },
  metadata: {
    getAll: () => request<{ genres: { id: string; name: string }[]; keywords: { id: string; name: string }[]; platforms: { id: string; name: string }[]; countries: { id: string; name: string }[]; directors: { id: string; name: string }[] }>('/metadata'),
    create: (kind: 'genres' | 'keywords' | 'platforms', name: string) => request<{ id: string; name: string }>(`/metadata/${kind}`, { method: 'POST', body: JSON.stringify({ name }) }),
  },
  uploads: {
    images: (files: File[]) => { const body = new FormData(); files.forEach((file) => body.append('images', file)); return request<{ images: { url: string; localPath: string; order: number }[] }>('/uploads', { method: 'POST', body }); },
  },
    tmdb: {
      status: () => request<{ configured: boolean; protectedFields: string[] }>('/tmdb/status'),
      cast: (type: 'movie' | 'series', id: number, names: string[]) => request<TmdbCastMember[]>(`/tmdb/cast?type=${type}&id=${id}&names=${encodeURIComponent(JSON.stringify(names))}`),
      suggestions: (query = '') => request<TmdbSuggestionCandidate[]>(`/tmdb/suggestions${query ? `?query=${encodeURIComponent(query)}` : ''}`),
      newReleases: (platform: string) => request<{ movies: any[], series: any[] }>(`/tmdb/new-releases?platform=${platform}`),
      platformSuggestions: (platform: string, seed = 0) => request<TmdbSuggestionCandidate[]>(`/tmdb/platform-suggestions?platform=${platform}&seed=${seed}`),
      recommendations: (type: 'movie' | 'series', id: number) => request<TmdbSuggestionCandidate[]>(`/tmdb/recommendations?type=${type}&id=${id}`),
      justwatchTop10: () => request<JustWatchTop10Item[]>('/tmdb/justwatch-top10'),
      justwatchPlatformPopular: (platform: string) => request<JustWatchPlatformPopularResponse>(`/tmdb/justwatch-platform-popular?platform=${encodeURIComponent(platform)}`),
      searchPlatforms: (query: string) => request<TitlePlatformResult[]>(`/tmdb/search-platforms?query=${encodeURIComponent(query)}`),
      justwatchLoginPosters: () => request<{ src: string; title: string }[]>('/tmdb/public/justwatch-posters'),
    },
};

export const resolveMovieImageUrl = (url: string) => {
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  return `${API_BASE_URL.replace(/\/api$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
};
