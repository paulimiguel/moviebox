import { AuthPage } from '@/components/auth/AuthPage';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { MovieLibraryPage } from '@/pages/MovieLibraryPage';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { MovieDetailPage } from '@/pages/MovieDetailPage';
import { CollectionsPage } from '@/pages/CollectionsPage';
import { CollectionDetailPage } from '@/pages/CollectionDetailPage';

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
      <Route path="/" element={<MovieLibraryPage />} />
      <Route path="/titulo/:id" element={<MovieDetailPage />} />
      <Route path="/colecciones" element={<CollectionsPage />} />
      <Route path="/colecciones/:id" element={<CollectionDetailPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  ) : <AuthPage />;
};

const App = () => (
  <AuthProvider>
    <BrowserRouter><AppContent /></BrowserRouter>
  </AuthProvider>
);

export default App;
