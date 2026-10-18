import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from '@/components/Header';
import { CinemaListSection } from '@/components/CinemaListSection';

export const CinePage = () => {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.slice(1);
    const timer = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 100);
    return () => window.clearTimeout(timer);
  }, [location.hash]);

  return (
    <main className="min-h-screen bg-canvas pb-12 text-ink">
      <Header />
      <CinemaListSection id="en-cartel-cine" listKey="en-cartel" title="Películas en cartel en cine" />
      <CinemaListSection id="proximos-estrenos-cine" listKey="proximos-estrenos" title="Próximos estrenos en cine" showReleaseDate />
    </main>
  );
};
