import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FolderOpen, Loader2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { MovieCard } from '@/components/MovieCard';
import { api } from '@/services/api';
import type { MovieItem } from '@/types/movie';

export const CollectionDetailPage = () => {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const collections = useQuery({ queryKey: ['collections'], queryFn: api.collections.getAll });
  const movies = useQuery({ queryKey: ['movies'], queryFn: api.movies.getAll });
  const personal = useMutation({
    mutationFn: ({ movie, field }: { movie: MovieItem; field: 'favorite' | 'watched' }) => api.movies.updatePersonal(movie.id, { [field]: !movie[field] }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['movies'] }),
  });
  const collection = collections.data?.find((item) => item.id === id);
  const items = movies.data?.filter((movie) => movie.collections.some((item) => item.id === id)) || [];

  if (collections.isLoading || movies.isLoading) return <main className="min-h-screen bg-canvas"><Header /><div className="grid min-h-[60vh] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-aqua" /></div></main>;

  return <main className="min-h-screen bg-canvas"><Header /><div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6"><div className="flex items-center gap-3"><Link to="/colecciones" className="icon-button" title="Volver"><ArrowLeft className="h-4 w-4" /></Link><div><h1 className="text-2xl font-semibold text-ink">{collection?.name || 'Coleccion'}</h1><p className="text-sm text-slate-500">{items.length} {items.length === 1 ? 'titulo' : 'titulos'}</p></div></div>{items.length ? <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 2xl:grid-cols-5">{items.map((movie) => <MovieCard key={movie.id} movie={movie} layout="grid" onPersonal={(item, field) => personal.mutate({ movie: item, field })} />)}</section> : <div className="grid min-h-[50vh] place-items-center text-center"><div><FolderOpen className="mx-auto h-14 w-14 text-aqua" /><p className="mt-3 font-semibold text-ink">Esta coleccion esta vacia</p></div></div>}</div></main>;
};
