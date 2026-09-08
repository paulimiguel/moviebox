import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import { api, resolveMovieImageUrl } from "@/services/api";
import type { CreateMovieInput, MovieItem, MovieType } from "@/types/movie";

const split = (value: string) =>
  Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
const numberOrNull = (value: string) => (value === "" ? null : Number(value));

const MetadataPicker = ({
  label,
  kind,
  options,
  selected,
  onChange,
}: {
  label: string;
  kind: "genres" | "keywords" | "platforms";
  options: { id: string; name: string }[];
  selected: string[];
  onChange: (names: string[]) => void;
}) => {
  const [draft, setDraft] = useState("");
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: (name: string) => api.metadata.create(kind, name),
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ["metadata"] });
      if (
        !selected.some(
          (name) => name.toLocaleLowerCase() === item.name.toLocaleLowerCase(),
        )
      )
        onChange([...selected, item.name]);
      setDraft("");
    },
  });
  const toggle = (name: string) =>
    onChange(
      selected.includes(name)
        ? selected.filter((item) => item !== name)
        : [...selected, name],
    );
  const submit = () => {
    const value = draft.trim();
    if (value) create.mutate(value);
  };
  return (
    <fieldset>
      <legend className="field-label">{label}</legend>
      <div className="max-h-32 overflow-auto rounded-md border border-slate-200 bg-white p-2">
        {options.length ? (
          options.map((option) => (
            <label
              key={option.id}
              className="flex cursor-pointer items-center gap-2 py-1 text-sm"
            >
              <input
                type="checkbox"
                checked={selected.includes(option.name)}
                onChange={() => toggle(option.name)}
              />
              {option.name}
            </label>
          ))
        ) : (
          <p className="text-xs text-slate-400">Todavia no hay opciones.</p>
        )}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
          className="control min-w-0 flex-1"
          placeholder={`Crear ${label.toLocaleLowerCase()}`}
        />
        <button
          type="button"
          onClick={submit}
          className="icon-button"
          title="Crear y seleccionar"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </fieldset>
  );
};

export const MovieFormModal = ({
  movie,
  onClose,
  onSaved,
}: {
  movie?: MovieItem;
  onClose: () => void;
  onSaved: (movie: MovieItem) => void;
}) => {
  const queryClient = useQueryClient();
  const metadata = useQuery({
    queryKey: ["metadata"],
    queryFn: api.metadata.getAll,
  });
  const collections = useQuery({
    queryKey: ["collections"],
    queryFn: api.collections.getAll,
  });
  const [type, setType] = useState<MovieType>(movie?.type || "movie");
  const [originalTitle, setOriginalTitle] = useState(
    movie?.originalTitle || "",
  );
  const [spanishTitle, setSpanishTitle] = useState(movie?.spanishTitle || "");
  const [year, setYear] = useState(movie?.year?.toString() || "");
  const [synopsis, setSynopsis] = useState(movie?.synopsis || "");
  const [duration, setDuration] = useState(
    movie?.durationMinutes?.toString() || "",
  );
  const [seasons, setSeasons] = useState(movie?.seasons?.toString() || "");
  const [episodes, setEpisodes] = useState(
    movie?.totalEpisodes?.toString() || "",
  );
  const [personalRating, setPersonalRating] = useState(
    movie?.personalRating?.toString() || "",
  );
  const [imdbRating, setImdbRating] = useState(
    movie?.imdbRating?.toString() || "",
  );
  const [countries, setCountries] = useState(
    movie?.countries.map((item) => item.name).join(", ") || "",
  );
  const [directors, setDirectors] = useState(
    movie?.credits
      .filter((item) => item.creditType === "director")
      .map((item) => item.name)
      .join(", ") || "",
  );
  const [cast, setCast] = useState(
    movie?.credits
      .filter((item) => item.creditType === "cast")
      .map((item) => item.name)
      .join(", ") || "",
  );
  const [genres, setGenres] = useState(
    movie?.genres.map((item) => item.name) || [],
  );
  const [keywords, setKeywords] = useState(
    movie?.keywords.map((item) => item.name) || [],
  );
  const [platforms, setPlatforms] = useState(
    movie?.platforms.map((item) => item.name) || [],
  );
  const [collectionIds, setCollectionIds] = useState(
    movie?.collections.map((item) => item.id) || [],
  );
  const [collectionDraft, setCollectionDraft] = useState("");
  const [imageUrls, setImageUrls] = useState(
    movie?.images.map((item) => item.url).join("\n") || "",
  );
  const [imdbUrl, setImdbUrl] = useState(movie?.imdbUrl || "");
  const [filmaffinityUrl, setFilmaffinityUrl] = useState(
    movie?.filmaffinityUrl || "",
  );
  const [trailerUrl, setTrailerUrl] = useState(movie?.trailerUrl || "");
  const [error, setError] = useState("");

  const imageList = useMemo(
    () =>
      imageUrls
        .split(/\r?\n/)
        .map((url) => url.trim())
        .filter(Boolean)
        .slice(0, 5),
    [imageUrls],
  );
  const imageUpload = useMutation({
    mutationFn: api.uploads.images,
    onSuccess: ({ images }) => {
      const current = imageUrls
        .split(/\r?\n/)
        .map((url) => url.trim())
        .filter(Boolean);
      setImageUrls(
        [...current, ...images.map((image) => image.url)].slice(0, 5).join("\n"),
      );
    },
    onError: (reason: Error) => setError(reason.message),
  });
  const createCollection = useMutation({
    mutationFn: (name: string) => api.collections.create({ name }),
    onSuccess: (collection) => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      setCollectionIds((current) => [...current, collection.id]);
      setCollectionDraft("");
    },
    onError: (reason: Error) => setError(reason.message),
  });
  const mutation = useMutation({
    mutationFn: (input: CreateMovieInput) =>
      movie ? api.movies.update(movie.id, input) : api.movies.create(input),
    onSuccess: onSaved,
    onError: (reason: Error) => setError(reason.message),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!originalTitle.trim()) {
      setError("El titulo original es obligatorio");
      return;
    }
    const castNames = split(cast).slice(0, 6);
    mutation.mutate({
      type,
      originalTitle: originalTitle.trim(),
      spanishTitle: spanishTitle.trim() || null,
      year: numberOrNull(year),
      synopsis: synopsis.trim() || null,
      durationMinutes: numberOrNull(duration),
      seasons: type === "series" ? numberOrNull(seasons) : null,
      totalEpisodes: type === "series" ? numberOrNull(episodes) : null,
      favorite: movie?.favorite || false,
      watched: movie?.watched || false,
      personalRating: numberOrNull(personalRating),
      imdbRating: numberOrNull(imdbRating),
      tmdbId: movie?.tmdbId || null,
      imdbId: movie?.imdbId || null,
      imdbUrl: imdbUrl.trim() || null,
      filmaffinityUrl: filmaffinityUrl.trim() || null,
      trailerUrl: trailerUrl.trim() || null,
      tmdbCollectionId: movie?.tmdbCollectionId || null,
      tmdbCollectionName: movie?.tmdbCollectionName || null,
      countries: split(countries).map((name, order) => {
        const current = movie?.countries.find((item) => item.name === name);
        return { name, order, isoCode: current?.isoCode || null };
      }),
      credits: [
        ...split(directors).map((name, order) => {
          const current = movie?.credits.find((item) => item.creditType === "director" && item.name === name);
          return { name, order, creditType: "director" as const, tmdbPersonId: current?.tmdbPersonId, tmdbCreditId: current?.tmdbCreditId, profilePath: current?.profilePath };
        }),
        ...castNames.map((name, order) => {
          const current = movie?.credits.find((item) => item.creditType === "cast" && item.name === name);
          return { name, order, creditType: "cast" as const, characterName: current?.characterName, tmdbPersonId: current?.tmdbPersonId, tmdbCreditId: current?.tmdbCreditId, profilePath: current?.profilePath };
        }),
      ],
      genres: genres.map((name, order) => {
        const current = movie?.genres.find((item) => item.name === name);
        return { name, order, tmdbGenreId: current?.tmdbGenreId, tmdbMediaType: current?.tmdbMediaType };
      }),
      keywords: keywords.map((name, order) => {
        const current = movie?.keywords.find((item) => item.name === name);
        return { name, order, tmdbKeywordId: current?.tmdbKeywordId };
      }),
      platforms: platforms.map((name, order) => {
        const current = movie?.platforms.find((item) => item.name === name);
        return { name, order, isPrimary: order === 0, tmdbProviderId: current?.tmdbProviderId, logoPath: current?.logoPath };
      }),
      collectionIds,
      images: imageList.map((url, order) => {
        const current = movie?.images.find((item) => item.url === url);
        return { url, order, isPrimary: order === 0, localPath: current?.localPath, tmdbFilePath: current?.tmdbFilePath, altText: current?.altText };
      }),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/55 sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
    >
      <form
        onSubmit={submit}
        className="max-h-[96vh] w-full overflow-hidden rounded-t-md bg-canvas shadow-xl sm:max-w-4xl sm:rounded-md"
      >
        <div className="flex h-16 items-center border-b border-slate-200 bg-white px-4 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              {movie ? "Editar titulo" : "Agregar titulo"}
            </h2>
            <p className="text-xs text-slate-500">
              Los campos personales no se reemplazaran en futuras
              sincronizaciones.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="icon-button ml-auto border-0 shadow-none"
            title="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[calc(96vh-128px)] overflow-y-auto p-4 sm:p-6">
          <div className="mb-5 grid grid-cols-2 overflow-hidden rounded-md border border-slate-200">
            {(["movie", "series"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setType(value)}
                className={`h-11 text-sm font-semibold ${type === value ? "bg-ink text-white" : "bg-white text-slate-500"}`}
              >
                {value === "movie" ? "Pelicula" : "Serie"}
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="field-label">Titulo original *</span>
              <input
                className="control w-full"
                value={originalTitle}
                onChange={(e) => setOriginalTitle(e.target.value)}
              />
            </label>
            <label>
              <span className="field-label">Titulo en espanol</span>
              <input
                className="control w-full"
                value={spanishTitle}
                onChange={(e) => setSpanishTitle(e.target.value)}
              />
            </label>
            <label>
              <span className="field-label">Ano</span>
              <input
                className="control w-full"
                type="number"
                min="1888"
                max="2200"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </label>
            <label>
              <span className="field-label">Duracion en minutos</span>
              <input
                className="control w-full"
                type="number"
                min="1"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </label>
            {type === "series" && (
              <>
                <label>
                  <span className="field-label">Temporadas</span>
                  <input
                    className="control w-full"
                    type="number"
                    min="1"
                    value={seasons}
                    onChange={(e) => setSeasons(e.target.value)}
                  />
                </label>
                <label>
                  <span className="field-label">Episodios totales</span>
                  <input
                    className="control w-full"
                    type="number"
                    min="1"
                    value={episodes}
                    onChange={(e) => setEpisodes(e.target.value)}
                  />
                </label>
              </>
            )}
            <label className="sm:col-span-2">
              <span className="field-label">Sinopsis</span>
              <textarea
                className="control min-h-28 w-full py-2"
                value={synopsis}
                onChange={(e) => setSynopsis(e.target.value)}
              />
            </label>
            <label>
              <span className="field-label">Paises, separados por coma</span>
              <input
                className="control w-full"
                value={countries}
                onChange={(e) => setCountries(e.target.value)}
              />
            </label>
            <label>
              <span className="field-label">Direccion, separada por coma</span>
              <input
                className="control w-full"
                value={directors}
                onChange={(e) => setDirectors(e.target.value)}
              />
            </label>
            <label className="sm:col-span-2">
              <span className="field-label">Reparto principal, hasta 6</span>
              <input
                className="control w-full"
                value={cast}
                onChange={(e) => setCast(e.target.value)}
              />
            </label>
            <MetadataPicker
              label="Generos"
              kind="genres"
              options={metadata.data?.genres || []}
              selected={genres}
              onChange={setGenres}
            />
            <MetadataPicker
              label="Etiquetas"
              kind="keywords"
              options={metadata.data?.keywords || []}
              selected={keywords}
              onChange={setKeywords}
            />
            <MetadataPicker
              label="Plataformas"
              kind="platforms"
              options={metadata.data?.platforms || []}
              selected={platforms}
              onChange={setPlatforms}
            />
            <fieldset>
              <legend className="field-label">Colecciones</legend>
              <div className="max-h-44 overflow-auto rounded-md border border-slate-200 bg-white p-2">
                {(collections.data || []).map((collection) => (
                  <label
                    key={collection.id}
                    className="flex items-center gap-2 py-1 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={collectionIds.includes(collection.id)}
                      onChange={() =>
                        setCollectionIds(
                          collectionIds.includes(collection.id)
                            ? collectionIds.filter((id) => id !== collection.id)
                            : [...collectionIds, collection.id],
                        )
                      }
                    />
                    {collection.name}
                  </label>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  className="control min-w-0 flex-1"
                  value={collectionDraft}
                  onChange={(event) => setCollectionDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && collectionDraft.trim()) {
                      event.preventDefault();
                      createCollection.mutate(collectionDraft.trim());
                    }
                  }}
                  placeholder="Crear coleccion"
                />
                <button
                  type="button"
                  onClick={() =>
                    collectionDraft.trim() &&
                    createCollection.mutate(collectionDraft.trim())
                  }
                  className="icon-button"
                  title="Crear y seleccionar"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </fieldset>
            <label>
              <span className="field-label">Mi puntuacion (0-10)</span>
              <input
                className="control w-full"
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={personalRating}
                onChange={(e) => setPersonalRating(e.target.value)}
              />
            </label>
            <label>
              <span className="field-label">IMDb (0-10)</span>
              <input
                className="control w-full"
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={imdbRating}
                onChange={(e) => setImdbRating(e.target.value)}
              />
            </label>
            <div className="sm:col-span-2">
              <span className="field-label">Imagenes (maximo 5)</span>
              {imageList.length > 0 && (
                <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {imageList.map((url, index) => (
                    <div key={`${url}-${index}`} className="overflow-hidden rounded-md border border-slate-200 bg-white">
                      <img src={resolveMovieImageUrl(url)} alt="" className="aspect-[2/3] w-full object-cover" />
                      <div className="flex justify-center gap-1 p-1">
                        <button type="button" disabled={index === 0} onClick={() => { const next = [...imageList]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; setImageUrls(next.join("\n")); }} className="icon-button h-8 w-8" title="Mover antes"><ArrowUp className="h-3.5 w-3.5" /></button>
                        <button type="button" disabled={index === imageList.length - 1} onClick={() => { const next = [...imageList]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; setImageUrls(next.join("\n")); }} className="icon-button h-8 w-8" title="Mover despues"><ArrowDown className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => setImageUrls(imageList.filter((_, current) => current !== index).join("\n"))} className="icon-button h-8 w-8 text-red-600" title="Quitar"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <label className="secondary-button mb-2 cursor-pointer">
                <ImagePlus className="h-4 w-4" />
                {imageUpload.isPending ? "Procesando..." : "Subir imagenes"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="sr-only"
                  disabled={imageUpload.isPending || imageList.length >= 5}
                  onChange={(event) => {
                    const files = Array.from(event.target.files || []).slice(
                      0,
                      5 - imageList.length,
                    );
                    if (files.length) imageUpload.mutate(files);
                    event.target.value = "";
                  }}
                />
              </label>
              <textarea
                className="control min-h-24 w-full py-2"
                value={imageUrls}
                onChange={(e) => setImageUrls(e.target.value)}
                placeholder="Tambien podes pegar una URL por linea"
              />
            </div>
            <label>
              <span className="field-label">Enlace IMDb</span>
              <input
                className="control w-full"
                type="url"
                value={imdbUrl}
                onChange={(e) => setImdbUrl(e.target.value)}
              />
            </label>
            <label>
              <span className="field-label">Enlace FilmAffinity</span>
              <input
                className="control w-full"
                type="url"
                value={filmaffinityUrl}
                onChange={(e) => setFilmaffinityUrl(e.target.value)}
              />
            </label>
            <label className="sm:col-span-2">
              <span className="field-label">Trailer</span>
              <input
                className="control w-full"
                type="url"
                value={trailerUrl}
                onChange={(e) => setTrailerUrl(e.target.value)}
              />
            </label>
          </div>
          {error && (
            <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>
        <div className="flex h-16 items-center justify-end gap-2 border-t border-slate-200 bg-white px-4 sm:px-6">
          <button type="button" onClick={onClose} className="secondary-button">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="primary-button"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {movie ? "Guardar cambios" : "Agregar"}
          </button>
        </div>
      </form>
    </div>
  );
};
