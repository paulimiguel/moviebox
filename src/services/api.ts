import type { CreateMovieCollectionInput, CreateMovieInput, MovieCollection, MovieItem, MoviePersonalUpdate } from '@/types/movie';

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3003/api');
const TOKEN_KEY = 'moviebox_auth_token';

export interface MovieBoxUser {
  id: string;
  email: string;
  name: string;
  alias: string | null;
  profilePhoto: string | null;
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
    headers: {
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) localStorage.removeItem(TOKEN_KEY);
    throw new Error(payload.error || 'No se pudo completar la solicitud');
  }

  return payload as T;
};

const saveAuth = (response: AuthResponse) => {
  localStorage.setItem(TOKEN_KEY, response.token);
  return response.user;
};

export const authToken = {
  exists: () => Boolean(localStorage.getItem(TOKEN_KEY)),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export const api = {
  auth: {
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
  },
  metadata: {
    getAll: () => request<{ genres: { id: string; name: string }[]; keywords: { id: string; name: string }[]; platforms: { id: string; name: string }[] }>('/metadata'),
    create: (kind: 'genres' | 'keywords' | 'platforms', name: string) => request<{ id: string; name: string }>(`/metadata/${kind}`, { method: 'POST', body: JSON.stringify({ name }) }),
  },
  uploads: {
    images: (files: File[]) => { const body = new FormData(); files.forEach((file) => body.append('images', file)); return request<{ images: { url: string; localPath: string; order: number }[] }>('/uploads', { method: 'POST', body }); },
  },
  tmdb: {
    status: () => request<{ configured: boolean; protectedFields: string[] }>('/tmdb/status'),
  },
};

export const resolveMovieImageUrl = (url: string) => {
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  return `${API_BASE_URL.replace(/\/api$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
};
