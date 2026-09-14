import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FolderOpen, Loader2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { MovieCard } from '@/components/MovieCard';
import { MovieDetailModal } from '@/components/MovieDetailModal';
import { MovieEditModal } from '@/components/MovieEditModal';
import { api } from '@/services/api';
import type { MovieItem } from '@/types/movie';

export const CollectionDetailPage = () => {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const [detailMovie, setDetailMovie] = useState<MovieItem | null>(null);
  const [editingMovie, setEditingMovie] = useState<MovieItem | null>(null);
  const collections = useQuery({ queryKey: ['collections'], queryFn: api.collections.getAll });
  const movies = useQuery({ queryKey: ['movies'], queryFn: api.movies.getAll });
  const personal = useMutation({
    mutationFn: ({ movie, field }: { movie: MovieItem; field: 'favorite' | 'watched' | 'watchlist' }) => api.movies.updatePersonal(movie.id, { [field]: !movie[field] }),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      setDetailMovie((current) => current?.id === saved.id ? saved : current);
    },
  });
  const rating = useMutation({
    mutationFn: ({ movie, value }: { movie: MovieItem; value: number | null }) => api.movies.updatePersonal(movie.id, { personalRating: value }),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      setDetailMovie((current) => current?.id === saved.id ? saved : current);
    },
  });
  const updateCollections = useMutation({
    mutationFn: ({ movie, collectionIds }: { movie: MovieItem; collectionIds: string[] }) => api.movies.updatePersonal(movie.id, { collectionIds }),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      setDetailMovie((current) => current?.id === saved.id ? saved : current);
    },
  });
  const collection = collections.data?.find((item) => item.id === id);
  const items = movies.data?.filter((movie) => movie.collections.some((item) => item.id === id)) || [];
  const adjacentMovie = (movie: MovieItem, offset: -1 | 1) => {
    const index = items.findIndex((item) => item.id === movie.id);
    return index >= 0 ? items[index + offset] || null : null;
  };

  if (collections.isLoading || movies.isLoading) return <main className="min-h-screen bg-canvas"><Header /><div className="grid min-h-[60vh] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-aqua" /></div></main>;

  return <main className="collection-detail-page min-h-screen bg-canvas"><Header /><div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6"><div className="collection-detail-heading flex items-center gap-3"><Link to="/colecciones" className="collection-back-button icon-button" title="Volver"><ArrowLeft className="h-5 w-5" strokeWidth={2.75} /></Link><div><h1 className="text-2xl font-semibold text-ink">{collection?.name || 'Coleccion'}</h1><p className="text-sm text-slate-500">{items.length} {items.length === 1 ? 'titulo' : 'titulos'}</p></div></div>{items.length ? <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 2xl:grid-cols-5">{items.map((movie) => <MovieCard key={movie.id} movie={movie} mode="medium" onOpen={setDetailMovie} onPersonal={(item, field) => personal.mutate({ movie: item, field })} onEdit={setEditingMovie} />)}</section> : <div className="grid min-h-[50vh] place-items-center text-center"><div><FolderOpen className="mx-auto h-14 w-14 text-aqua" /><p className="mt-3 font-semibold text-ink">Esta coleccion esta vacia</p></div></div>}</div>{detailMovie && <MovieDetailModal movie={detailMovie} onClose={() => setDetailMovie(null)} onEdit={(movie) => { setDetailMovie(null); setEditingMovie(movie); }} onPersonal={(movie, field) => personal.mutate({ movie, field })} onRating={(movie, value) => rating.mutate({ movie, value })} onCollections={(movie, collectionIds) => updateCollections.mutate({ movie, collectionIds })} onPrevious={adjacentMovie(detailMovie, -1) ? () => setDetailMovie(adjacentMovie(detailMovie, -1)) : undefined} onNext={adjacentMovie(detailMovie, 1) ? () => setDetailMovie(adjacentMovie(detailMovie, 1)) : undefined} />}{editingMovie && <MovieEditModal key={editingMovie.id} movie={editingMovie} onClose={() => setEditingMovie(null)} onSaved={() => { queryClient.invalidateQueries({ queryKey: ['movies'] }); queryClient.invalidateQueries({ queryKey: ['metadata'] }); setEditingMovie(null); }} onPrevious={adjacentMovie(editingMovie, -1) ? () => setEditingMovie(adjacentMovie(editingMovie, -1)) : undefined} onNext={adjacentMovie(editingMovie, 1) ? () => setEditingMovie(adjacentMovie(editingMovie, 1)) : undefined} />}</main>;
};
