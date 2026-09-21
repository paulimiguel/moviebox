import { useState, useEffect, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Check, ChevronLeft, ChevronRight, Eye, Film, Loader2, Star, Tv, X } from 'lucide-react';
import { api } from '@/services/api';
import { MovieDetailModal } from '@/components/MovieDetailModal';
import type { TmdbSuggestionCandidate } from '@/types/movie';

export const TinderSuggestions = ({ 
  initialCandidates, 
  onAdd, 
  isAdding,
  addingTmdbId
}: { 
  initialCandidates: TmdbSuggestionCandidate[]; 
  onAdd: (candidate: TmdbSuggestionCandidate) => void;
  isAdding: boolean;
  addingTmdbId: number | null;
}) => {
  const [deck, setDeck] = useState<TmdbSuggestionCandidate[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [previewCandidate, setPreviewCandidate] = useState<TmdbSuggestionCandidate | null>(null);

  useEffect(() => {
    // Only set initially or when deck is completely empty
    if (initialCandidates.length > 0 && deck.length === 0) {
      setDeck(initialCandidates);
    }
  }, [initialCandidates, deck.length]);

  const currentCandidate = deck[currentIndex];
  const prevCandidate = deck[currentIndex - 1];
  const nextCandidate = deck[currentIndex + 1];

  const fetchRecommendations = useMutation({
    mutationFn: async (candidate: TmdbSuggestionCandidate) => {
      const recs = await api.tmdb.recommendations(candidate.type, candidate.tmdbId);
      return recs;
    },
    onSuccess: (recs) => {
      setDeck((current) => {
        const existingIds = new Set(current.map(c => c.tmdbId));
        const newRecs = recs.filter(r => !existingIds.has(r.tmdbId));
        return [...current, ...newRecs];
      });
    }
  });

  const handleAccept = (candidate: TmdbSuggestionCandidate) => {
    onAdd(candidate);
    fetchRecommendations.mutate(candidate);
    goNext();
  };

  const handleReject = () => {
    goNext();
  };

  const goNext = () => {
    if (currentIndex < deck.length - 1) {
      setCurrentIndex((c) => c + 1);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((c) => c - 1);
    }
  };

  if (!deck.length) return null;

  const renderCard = (candidate: TmdbSuggestionCandidate, position: 'prev' | 'current' | 'next') => {
    if (!candidate) return null;
    
    const isCurrent = position === 'current';
    const isAddingThis = isAdding && addingTmdbId === candidate.tmdbId;

    return (
      <div 
        className={`absolute top-1/2 -translate-y-1/2 transition-all duration-300 ease-in-out ${
          isCurrent 
            ? 'z-20 left-1/2 -translate-x-1/2 scale-100 opacity-100' 
            : position === 'prev' 
              ? 'z-10 left-[4%] md:left-[14%] -translate-x-1/2 scale-75 opacity-40 blur-[1px]'
              : 'z-10 left-[96%] md:left-[86%] -translate-x-1/2 scale-75 opacity-40 blur-[1px]'
        }`}
      >
        {isCurrent && (
          <div className="mb-2.5 flex justify-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewCandidate(candidate);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/85 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink shadow-sm backdrop-blur-md transition-all hover:bg-white hover:shadow hover:scale-105"
              title={`Ver características de ${candidate.title}`}
            >
              <Eye className="h-3 w-3 text-aqua" />
              VER
            </button>
          </div>
        )}
        <div 
          onClick={() => isCurrent && setPreviewCandidate(candidate)}
          className={`movie-card flex flex-col overflow-hidden rounded-xl bg-white shadow-card ${isCurrent ? 'cursor-pointer w-44 sm:w-48 md:w-52 hover:-translate-y-1' : 'w-32 sm:w-36'} transition-transform`}
        >
          <div className="relative aspect-[2/3] bg-mist">
            {candidate.posterUrl ? (
              <img src={candidate.posterUrl} alt={candidate.title} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-aqua/70">
                {candidate.type === 'movie' ? <Film className="h-10 w-10" /> : <Tv className="h-10 w-10" />}
              </div>
            )}
            <span className={`absolute left-2.5 top-2.5 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase text-white shadow-sm ${candidate.type === 'series' ? 'bg-aqua' : 'bg-coral'}`}>
              {candidate.type === 'movie' ? 'Película' : 'Serie'}
            </span>
            {isCurrent && candidate.rating != null && candidate.rating > 0 && (
              <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-md bg-canvas/90 px-2 py-0.5 text-[11px] font-semibold text-ink backdrop-blur shadow-sm">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {candidate.rating.toFixed(1)}
              </span>
            )}
          </div>
          
          <div className="flex flex-col p-2.5 sm:p-3 text-center">
            <h2 className="font-bebas line-clamp-2 text-lg sm:text-xl uppercase leading-5 text-ink">{candidate.title}</h2>
            <div className="mt-0.5 flex items-center justify-center gap-2 text-xs text-slate-500">
              {candidate.year && <span className="font-semibold">{candidate.year}</span>}
            </div>
            <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">
              {(candidate.genres || []).join(', ') || 'Sin género'}
            </p>
          </div>
        </div>

        {isCurrent && (
          <div className="mt-3.5 flex justify-center gap-4">
            <button 
              type="button"
              onClick={handleReject}
              className="grid h-9 w-9 place-items-center rounded-full border border-red-500/50 bg-white/40 text-red-500 shadow-sm backdrop-blur-md transition-all hover:bg-red-500 hover:text-white hover:scale-110"
              title="Rechazar"
              aria-label="Rechazar"
            >
              <X className="h-4.5 w-4.5" strokeWidth={2.5} />
            </button>
            <button 
              type="button"
              disabled={isAddingThis}
              onClick={() => handleAccept(candidate)}
              className="grid h-9 w-9 place-items-center rounded-full border border-[#2cbc63]/50 bg-white/40 text-[#2cbc63] shadow-sm backdrop-blur-md transition-all hover:bg-[#2cbc63] hover:text-white hover:scale-110 disabled:opacity-50"
              title="Agregar a biblioteca"
              aria-label="Agregar a biblioteca"
            >
              {isAddingThis ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Check className="h-4.5 w-4.5" strokeWidth={2.5} />}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="relative mx-auto mt-2 flex h-[430px] sm:h-[450px] max-w-[960px] items-center justify-center overflow-hidden py-4 px-4">
      {/* Navigation Arrows */}
      <button 
        type="button"
        onClick={goPrev}
        disabled={currentIndex === 0}
        className="absolute left-2 md:left-8 top-1/2 z-30 -translate-y-1/2 grid h-12 w-12 place-items-center rounded-full bg-white/50 text-slate-700 shadow-sm backdrop-blur transition-all hover:bg-white hover:scale-110 disabled:opacity-0"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      {renderCard(prevCandidate, 'prev')}
      {renderCard(currentCandidate, 'current')}
      {renderCard(nextCandidate, 'next')}

      <button 
        type="button"
        onClick={goNext}
        disabled={currentIndex === deck.length - 1}
        className="absolute right-2 md:right-8 top-1/2 z-30 -translate-y-1/2 grid h-12 w-12 place-items-center rounded-full bg-white/50 text-slate-700 shadow-sm backdrop-blur transition-all hover:bg-white hover:scale-110 disabled:opacity-0"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {previewCandidate && (
        <MovieDetailModal
          movie={{
            id: 'preview-' + previewCandidate.tmdbId,
            title: previewCandidate.title,
            originalTitle: previewCandidate.title,
            type: previewCandidate.type,
            year: previewCandidate.year || null,
            runtime: null,
            synopsis: previewCandidate.overview || 'Sin descripción disponible.',
            imdbId: previewCandidate.imdbId || null,
            tmdbId: previewCandidate.tmdbId || null,
            imdbRating: previewCandidate.rating || null,
            trailerUrl: null,
            favorite: false,
            watched: false,
            watchlist: false,
            personalRating: null,
            instagramRecommendation: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            images: previewCandidate.posterUrl ? [{ id: '1', url: previewCandidate.posterUrl, localPath: null, tmdbFilePath: null, order: 0, isPrimary: true, altText: null }] : [],
            genres: (previewCandidate.genres || []).map((g, i) => ({ id: String(i), name: g, normalizedName: g, order: i })),
            platforms: [],
            keywords: [],
            director: [],
            cast: [],
            countries: [],
            collectionIds: [],
          } as any}
          onClose={() => setPreviewCandidate(null)}
          onAdd={() => {
            setPreviewCandidate(null);
            handleAccept(previewCandidate);
          }}
          onPersonal={() => {}}
          onRating={() => {}}
          onCollections={() => {}}
        />
      )}
    </section>
  );
};

