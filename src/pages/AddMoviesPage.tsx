import { useNavigate } from 'react-router-dom';
import { AddMovieModal } from '@/components/AddMovieModal';
import { Header } from '@/components/Header';

export const AddMoviesPage = () => {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-canvas text-ink">
      <Header />
      <section className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8">
        <AddMovieModal isOpen displayMode="page" onClose={() => navigate('/')} />
      </section>
    </main>
  );
};
