import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bookmark,
  Check,
  Eye,
  ExternalLink,
  Film,
  Heart,
  Loader2,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { MovieEditModal } from "@/components/MovieEditModal";
import { StarRating } from "@/components/StarRating";
import { PlatformLogos } from "@/components/PlatformLogos";
import { api, resolveMovieImageUrl } from "@/services/api";

export const MovieDetailPage = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const movieQuery = useQuery({
    queryKey: ["movie", id],
    queryFn: () => api.movies.getOne(id),
  });
  const personal = useMutation({
    mutationFn: (data: {
      favorite?: boolean;
      watched?: boolean;
      watchlist?: boolean;
      personalRating?: number | null;
    }) => api.movies.updatePersonal(id, data),
    onSuccess: (movie) => {
      queryClient.setQueryData(["movie", id], movie);
      queryClient.invalidateQueries({ queryKey: ["movies"] });
    },
  });
  const remove = useMutation({
    mutationFn: () => api.movies.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movies"] });
      navigate("/");
    },
  });
  if (movieQuery.isLoading)
    return (
      <main className="min-h-screen bg-canvas">
        <Header />
        <div className="grid min-h-[70vh] place-items-center">
          <Loader2 className="h-8 w-8 animate-spin text-aqua" />
        </div>
      </main>
    );
  if (!movieQuery.data)
    return (
      <main className="min-h-screen bg-canvas">
        <Header />
        <div className="mx-auto max-w-5xl p-6">
          <p>No se encontro el titulo.</p>
          <Link to="/" className="primary-button mt-4">
            Volver
          </Link>
        </div>
      </main>
    );
  const movie = movieQuery.data;
  const title = movie.spanishTitle || movie.originalTitle;
  const mainImage = movie.images[selectedImage] || movie.images[0];
  const directors = movie.credits.filter(
    (credit) => credit.creditType === "director",
  );
  const cast = movie.credits.filter((credit) => credit.creditType === "cast");
  const justWatchUrl = movie.justwatchUrl || `https://www.justwatch.com/ar/buscar?q=${encodeURIComponent([title, movie.year].filter(Boolean).join(" "))}`;
  const tmdbUrl = movie.tmdbUrl || (movie.tmdbId ? `https://www.themoviedb.org/${movie.type === "movie" ? "movie" : "tv"}/${movie.tmdbId}` : null);
  const links = [
    { label: "IMDb", url: movie.imdbUrl },
    { label: "TMDB", url: tmdbUrl },
    { label: "JustWatch", url: justWatchUrl },
    { label: "Trailer", url: movie.trailerUrl },
  ].filter((item) => item.url);
  return (
    <main className="min-h-screen bg-canvas">
      <Header />
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
        <div className="mb-5 flex items-center gap-2">
          <Link to="/" className="icon-button" title="Volver">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="secondary-button"
            >
              <Pencil className="h-4 w-4" /> Editar
            </button>
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    `Eliminar ${title}? Esta accion no se puede deshacer.`,
                  )
                )
                  remove.mutate();
              }}
              className="icon-button text-red-600"
              title="Eliminar"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="grid gap-7 md:grid-cols-[280px_minmax(0,1fr)] lg:grid-cols-[340px_minmax(0,1fr)]">
          <section>
            <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-mist">
              {mainImage ? (
                <img
                  src={resolveMovieImageUrl(mainImage.url)}
                  alt={title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full place-items-center">
                  <Film className="h-16 w-16 text-aqua" />
                </div>
              )}
              <span className={`absolute left-3 top-3 rounded px-2 py-1 text-[10px] font-semibold uppercase text-white shadow-sm ${movie.type === "series" ? "bg-aqua" : "bg-coral"}`}>{movie.type === "movie" ? "Película" : "Serie"}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => personal.mutate({ watched: !movie.watched })}
                className={`secondary-button min-w-0 px-2 text-xs uppercase ${movie.watched ? "border-[#2cbc63] bg-[#2cbc63]/10 text-[#218f4c]" : ""}`}
              >
                <Eye className="h-[18px] w-[18px]" />
                Watch
              </button>
              <button
                type="button"
                onClick={() => personal.mutate({ favorite: !movie.favorite })}
                className={`secondary-button min-w-0 px-2 text-xs uppercase ${movie.favorite ? "border-coral bg-red-50 text-coral" : ""}`}
              >
                <Heart className={`h-4 w-4 ${movie.favorite ? "fill-current" : ""}`} />
                Like
              </button>
              <button
                type="button"
                onClick={() => personal.mutate({ watchlist: !movie.watchlist })}
                className={`secondary-button col-span-2 min-w-0 px-2 text-xs uppercase sm:col-span-1 ${movie.watchlist ? "border-aqua bg-mist text-aqua" : ""}`}
              >
                <Bookmark className={`h-4 w-4 ${movie.watchlist ? "fill-current" : ""}`} />
                Watchlist
              </button>
            </div>
            {movie.images.length > 1 && (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {movie.images.map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-[2/3] overflow-hidden rounded-md border-2 ${index === selectedImage ? "border-coral" : "border-transparent"}`}
                  >
                    <img
                      src={resolveMovieImageUrl(image.url)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </section>
          <section className="min-w-0">
            <h1 className="text-3xl font-bold text-ink sm:text-4xl">
              {title}
            </h1>
            {movie.spanishTitle &&
              movie.spanishTitle !== movie.originalTitle && (
                <p className="mt-1 text-lg text-slate-500">
                  {movie.originalTitle}
                </p>
              )}
            <p className="mt-3 text-sm text-slate-500">
              {[
                movie.year,
                movie.countries.map((country) => country.name).join(", "),
                movie.durationMinutes ? `${movie.durationMinutes} min` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <div className="mt-6 grid gap-3 sm:max-w-xl sm:grid-cols-[minmax(280px,1.5fr)_minmax(160px,1fr)]">
              <div className="rounded-md border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Rate
                </p>
                <div className="mt-2">
                  <StarRating value={movie.personalRating} onChange={(personalRating) => personal.mutate({ personalRating })} disabled={personal.isPending} />
                </div>
                <p className="mt-1 text-xs text-slate-400">{movie.personalRating ? `${movie.personalRating} de 5` : "Sin puntuación"}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase text-slate-400">
                  IMDb
                </p>
                <p className="mt-1 text-2xl font-bold text-[#92700f]">
                  {movie.imdbRating ?? "—"}
                </p>
              </div>
            </div>
            {movie.synopsis && (
              <div className="mt-7">
                <h2 className="text-lg font-semibold text-ink">Sinopsis</h2>
                <p className="mt-2 whitespace-pre-line leading-7 text-slate-600">
                  {movie.synopsis}
                </p>
              </div>
            )}
            <dl className="mt-7 grid gap-4 border-t border-slate-200 pt-6 sm:grid-cols-2">
              {directors.length > 0 && (
                <div>
                  <dt className="text-xs font-semibold uppercase text-slate-400">
                    Direccion
                  </dt>
                  <dd className="mt-1 text-sm text-ink">
                    {directors.map((item) => item.name).join(", ")}
                  </dd>
                </div>
              )}
              {cast.length > 0 && (
                <div>
                  <dt className="text-xs font-semibold uppercase text-slate-400">
                    Reparto principal
                  </dt>
                  <dd className="mt-1 text-sm text-ink">
                    {cast.map((item) => item.name).join(", ")}
                  </dd>
                </div>
              )}
              {movie.genres.length > 0 && (
                <div>
                  <dt className="text-xs font-semibold uppercase text-slate-400">
                    Generos
                  </dt>
                  <dd className="mt-1 text-sm text-ink">
                    {movie.genres.map((item) => item.name).join(", ")}
                  </dd>
                </div>
              )}
              {(movie.platforms.length > 0 || movie.trailerUrl) && (
                <div>
                  <dt className="text-xs font-semibold uppercase text-slate-400">
                    Plataformas
                  </dt>
                  <dd className="mt-2"><PlatformLogos platforms={movie.platforms} large /></dd>
                  {movie.trailerUrl && <a href={movie.trailerUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition-opacity hover:opacity-70"><img src="/youtube-play.png" alt="" className="h-4 w-[23px] object-contain" aria-hidden="true" />Ver trailer</a>}
                </div>
              )}
              {movie.type === "series" && (
                <div>
                  <dt className="text-xs font-semibold uppercase text-slate-400">
                    Serie
                  </dt>
                  <dd className="mt-1 text-sm text-ink">
                    {[
                      movie.seasons && `${movie.seasons} temporadas`,
                      movie.totalEpisodes && `${movie.totalEpisodes} episodios`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </dd>
                </div>
              )}
              {movie.collections.length > 0 && (
                <div>
                  <dt className="text-xs font-semibold uppercase text-slate-400">
                    Colecciones
                  </dt>
                  <dd className="mt-1 text-sm text-ink">
                    {movie.collections.map((item) => item.name).join(", ")}
                  </dd>
                </div>
              )}
            </dl>
            {links.length > 0 && (
              <div className="mt-7 flex flex-wrap items-center justify-start gap-2">
                {links.filter((item) => item.label !== "Trailer").map((item) => (
                  <a
                    key={item.label}
                    href={item.url!}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition-opacity hover:opacity-70"
                  >
                    {item.label === "IMDb" ? (
                      <img src="/imdb-logo.png" alt="IMDb" className="h-6 w-[50px] object-contain" />
                    ) : item.label === "TMDB" ? (
                      <img src="/tmdb.png" alt="TMDB" className="h-5 w-[96px] object-contain" />
                    ) : item.label === "JustWatch" ? (
                      <img src="/justwatch.png" alt="JustWatch" className="h-5 w-[85px] object-contain" />
                    ) : (
                      <>
                        {item.label}
                        <ExternalLink className="h-4 w-4" />
                      </>
                    )}
                  </a>
                ))}
              </div>
            )}
            <p className="mt-8 inline-flex items-center gap-1 text-xs text-slate-400">
              <Check className="h-3.5 w-3.5" />
              Datos personales protegidos para futuras sincronizaciones TMDB
            </p>
          </section>
        </div>
      </div>
      {editing && (
        <MovieEditModal
          movie={movie}
          onClose={() => setEditing(false)}
          onSaved={(saved) => {
            queryClient.setQueryData(["movie", id], saved);
            queryClient.invalidateQueries({ queryKey: ["movies"] });
            setEditing(false);
          }}
        />
      )}
    </main>
  );
};
