import { AuthPage } from '@/components/auth/AuthPage';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { MovieLibraryPage } from '@/pages/MovieLibraryPage';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { MovieDetailPage } from '@/pages/MovieDetailPage';
import { CollectionsPage } from '@/pages/CollectionsPage';
import { CollectionDetailPage } from '@/pages/CollectionDetailPage';
import { AddMoviesPage } from '@/pages/AddMoviesPage';
import { PlatformsPage } from '@/pages/PlatformsPage';
import { GenresPage } from '@/pages/GenresPage';
import { NewsPage } from '@/pages/NewsPage';
import { CinePage } from '@/pages/CinePage';
import { ProfilePage } from '@/pages/ProfilePage';
import { PlatformNewsPage } from '@/pages/PlatformNewsPage';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { PopcornCursor } from '@/components/PopcornCursor';
import { HomePage } from '@/pages/HomePage';
import { SharedCollectionPage } from '@/pages/SharedCollectionPage';

const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [hash, pathname]);

  return null;
};

const PENDING_PATH_KEY = 'moviebox:pending-path';

const AppContent = () => {
  const { user, isLoading, connectionError, retryConnection } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    try {
      if (!user && location.pathname.startsWith('/colecciones/compartida/')) {
        window.sessionStorage.setItem(PENDING_PATH_KEY, location.pathname);
      } else if (user) {
        const pending = window.sessionStorage.getItem(PENDING_PATH_KEY);
        if (pending) {
          window.sessionStorage.removeItem(PENDING_PATH_KEY);
          if (pending !== location.pathname) navigate(pending, { replace: true });
        }
      }
    } catch {
      // Sin almacenamiento, el enlace sigue funcionando si ya se inició sesión.
    }
  }, [isLoading, location.pathname, navigate, user]);

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-canvas">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-aqua border-t-coral" />
      </main>
    );
  }

  if (connectionError) {
    return (
      <main className="grid min-h-screen place-items-center bg-canvas px-6 text-center">
        <div className="max-w-sm">
          <h1 className="font-bebas text-3xl uppercase text-ink">No se pudo conectar</h1>
          <p className="mt-2 text-sm text-slate-500">Tu sesión sigue guardada. Revisá tu conexión y volvé a intentarlo.</p>
          <button type="button" onClick={retryConnection} className="primary-button mt-5">Reintentar</button>
        </div>
      </main>
    );
  }

  return user ? (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/biblioteca" element={<MovieLibraryPage />} />
      <Route path="/titulo/:id" element={<MovieDetailPage />} />
      <Route path="/colecciones" element={<CollectionsPage />} />
      <Route path="/colecciones/compartida/:token" element={<SharedCollectionPage />} />
      <Route path="/colecciones/:id" element={<CollectionDetailPage />} />
      <Route path="/agregar" element={<AddMoviesPage />} />
      <Route path="/nuevo" element={<AddMoviesPage />} />
      <Route path="/plataformas" element={<PlatformsPage />} />
      <Route path="/generos" element={<GenresPage />} />
      <Route path="/novedades" element={<NewsPage />} />
      <Route path="/cine" element={<CinePage />} />
      <Route path="/perfil" element={<ProfilePage />} />
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
