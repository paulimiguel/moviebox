import { AuthPage } from '@/components/auth/AuthPage';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { MovieLibraryPage } from '@/pages/MovieLibraryPage';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { MovieDetailPage } from '@/pages/MovieDetailPage';
import { CollectionsPage } from '@/pages/CollectionsPage';
import { CollectionDetailPage } from '@/pages/CollectionDetailPage';
import { AddMoviesPage } from '@/pages/AddMoviesPage';
import { PlatformsPage } from '@/pages/PlatformsPage';
import { GenresPage } from '@/pages/GenresPage';
import { NewsPage } from '@/pages/NewsPage';
import { PlatformNewsPage } from '@/pages/PlatformNewsPage';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { PopcornCursor } from '@/components/PopcornCursor';
import { HomePage } from '@/pages/HomePage';

const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [hash, pathname]);

  return null;
};

const AppContent = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-canvas">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-aqua border-t-coral" />
      </main>
    );
  }

  return user ? (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/biblioteca" element={<MovieLibraryPage />} />
      <Route path="/titulo/:id" element={<MovieDetailPage />} />
      <Route path="/colecciones" element={<CollectionsPage />} />
      <Route path="/colecciones/:id" element={<CollectionDetailPage />} />
      <Route path="/agregar" element={<AddMoviesPage />} />
      <Route path="/nuevo" element={<AddMoviesPage />} />
      <Route path="/plataformas" element={<PlatformsPage />} />
      <Route path="/generos" element={<GenresPage />} />
      <Route path="/novedades" element={<NewsPage />} />
      <Route path="/novedades/:platformId" element={<PlatformNewsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  ) : <AuthPage />;
};

const App = () => (
  <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <AppContent />
        <PopcornCursor />
      </BrowserRouter>
    </AuthProvider>
  </ThemeProvider>
);

export default App;
