export const MOVIE_TYPES = ["movie", "series"] as const;
export const CREDIT_TYPES = ["director", "cast"] as const;

export const MAX_MOVIE_IMAGES = 5;
export const MAX_PRINCIPAL_CAST = 5;
export const RATING_MIN = 0;
export const RATING_MAX = 10;

export const PERSONAL_MOVIE_FIELDS = [
  "favorite",
  "watched",
  "personalRating",
  "collectionIds",
] as const;

export type MovieType = (typeof MOVIE_TYPES)[number];
export type CreditType = (typeof CREDIT_TYPES)[number];
export type PersonalMovieField = (typeof PERSONAL_MOVIE_FIELDS)[number];

export type MovieSortKey =
  | "title"
  | "year"
  | "createdAt"
  | "personalRating"
  | "imdbRating";

export type SortDirection = "asc" | "desc";
export type MovieTypeFilter = "all" | MovieType;
export type WatchedFilter = "all" | "watched" | "unwatched";
export type FavoriteFilter = "all" | "favorites";

export interface MovieImage {
  id: string;
  url: string;
  localPath: string | null;
  tmdbFilePath: string | null;
  order: number;
  isPrimary: boolean;
  altText: string | null;
}

export interface MovieCountry {
  id: string;
  name: string;
  normalizedName: string;
  isoCode: string | null;
  order: number;
}

export interface PersonReference {
  id: string;
  name: string;
  tmdbPersonId: number | null;
  profilePath: string | null;
}

export interface MovieCredit extends PersonReference {
  creditType: CreditType;
  order: number;
  characterName: string | null;
  tmdbCreditId: string | null;
}

export interface MovieGenre {
  id: string;
  name: string;
  tmdbGenreId: number | null;
  tmdbMediaType: MovieType | null;
  order: number;
}

export interface MovieKeyword {
  id: string;
  name: string;
  tmdbKeywordId: number | null;
  order: number;
}

export interface MoviePlatform {
  id: string;
  name: string;
  tmdbProviderId: number | null;
  logoPath: string | null;
  isPrimary: boolean;
  order: number;
}

export interface MovieCollectionReference {
  id: string;
  name: string;
  description: string | null;
  coverImage: string | null;
  order: number;
}

export interface MovieItem {
  id: string;
  userId: string;
  type: MovieType;
  originalTitle: string;
  spanishTitle: string | null;
  year: number | null;
  synopsis: string | null;
  durationMinutes: number | null;
  seasons: number | null;
  totalEpisodes: number | null;
  watched: boolean;
  favorite: boolean;
  personalRating: number | null;
  imdbRating: number | null;
  tmdbId: number | null;
  imdbId: string | null;
  imdbUrl: string | null;
  filmaffinityUrl: string | null;
  trailerUrl: string | null;
  tmdbCollectionId: number | null;
  tmdbCollectionName: string | null;
  tmdbImportedAt: string | null;
  tmdbLastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
  images: MovieImage[];
  countries: MovieCountry[];
  credits: MovieCredit[];
  genres: MovieGenre[];
  keywords: MovieKeyword[];
  platforms: MoviePlatform[];
  collections: MovieCollectionReference[];
}

export type MovieCardItem = Pick<
  MovieItem,
  | "id"
  | "type"
  | "originalTitle"
  | "spanishTitle"
  | "year"
  | "watched"
  | "favorite"
  | "personalRating"
  | "imdbRating"
  | "createdAt"
  | "images"
  | "genres"
  | "platforms"
>;

export interface MovieImageInput {
  url: string;
  localPath?: string | null;
  tmdbFilePath?: string | null;
  order: number;
  isPrimary?: boolean;
  altText?: string | null;
}

export interface MovieCountryInput {
  name: string;
  isoCode?: string | null;
  order?: number;
}

export interface MovieCreditInput {
  name: string;
  creditType: CreditType;
  order: number;
  characterName?: string | null;
  tmdbPersonId?: number | null;
  tmdbCreditId?: string | null;
  profilePath?: string | null;
}

export interface MovieGenreInput {
  name: string;
  tmdbGenreId?: number | null;
  tmdbMediaType?: MovieType | null;
  order?: number;
}

export interface MovieKeywordInput {
  name: string;
  tmdbKeywordId?: number | null;
  order?: number;
}

export interface MoviePlatformInput {
  name: string;
  tmdbProviderId?: number | null;
  logoPath?: string | null;
  isPrimary?: boolean;
  order?: number;
}

export interface CreateMovieInput {
  type: MovieType;
  originalTitle: string;
  spanishTitle?: string | null;
  year?: number | null;
  synopsis?: string | null;
  durationMinutes?: number | null;
  seasons?: number | null;
  totalEpisodes?: number | null;
  watched?: boolean;
  favorite?: boolean;
  personalRating?: number | null;
  imdbRating?: number | null;
  tmdbId?: number | null;
  imdbId?: string | null;
  imdbUrl?: string | null;
  filmaffinityUrl?: string | null;
  trailerUrl?: string | null;
  tmdbCollectionId?: number | null;
  tmdbCollectionName?: string | null;
  images?: MovieImageInput[];
  countries?: MovieCountryInput[];
  credits?: MovieCreditInput[];
  genres?: MovieGenreInput[];
  keywords?: MovieKeywordInput[];
  platforms?: MoviePlatformInput[];
  collectionIds?: string[];
}

export type UpdateMovieInput = Partial<CreateMovieInput>;

export interface MoviePersonalUpdate {
  favorite?: boolean;
  watched?: boolean;
  personalRating?: number | null;
  collectionIds?: string[];
}

export interface MovieFilters {
  search: string;
  type: MovieTypeFilter;
  watched: WatchedFilter;
  favorite: FavoriteFilter;
  genreIds: string[];
  keywordIds: string[];
  platformIds: string[];
  collectionId: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  personalRatingMin: number | null;
  imdbRatingMin: number | null;
}

export interface MovieSort {
  key: MovieSortKey;
  direction: SortDirection;
}

export interface MovieQuery {
  filters: MovieFilters;
  sort: MovieSort;
}

export interface MovieCollection {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  coverImage: string | null;
  movieIds: string[];
  movieOrders: Record<string, number>;
  movieCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMovieCollectionInput {
  name: string;
  description?: string | null;
  coverImage?: string | null;
}

export type UpdateMovieCollectionInput = Partial<CreateMovieCollectionInput>;

export type DuplicateMatchReason = "tmdbId" | "imdbId" | "titleAndYear";

export interface DuplicateCheckInput {
  type: MovieType;
  tmdbId?: number | null;
  imdbId?: string | null;
  originalTitle: string;
  spanishTitle?: string | null;
  year?: number | null;
}

export interface DuplicateCheckResult {
  exists: boolean;
  reason: DuplicateMatchReason | null;
  movie: MovieCardItem | null;
}

export interface TmdbSearchCandidate {
  tmdbId: number;
  type: MovieType;
  title: string;
  originalTitle: string;
  year: number | null;
  posterPath: string | null;
}

export type TmdbImportedMovieData = Omit<
  CreateMovieInput,
  "favorite" | "watched" | "personalRating" | "collectionIds"
>;

export interface TmdbImportRequest {
  tmdbId: number;
  type: MovieType;
}

export interface TmdbImportPreview {
  data: TmdbImportedMovieData;
  duplicate: DuplicateCheckResult;
}

export interface TmdbSyncResult {
  movie: MovieItem;
  preservedFields: PersonalMovieField[];
  syncedAt: string;
}

export interface ImdbSearchCandidate {
  imdbId: string;
  type: MovieType;
  title: string;
  originalTitle: string;
  year: number | null;
  posterUrl: string | null;
}

export type ImdbImportedMovieData = Omit<
  CreateMovieInput,
  "favorite" | "watched" | "personalRating" | "collectionIds" | "filmaffinityUrl"
>;

export interface ImdbImportRequest {
  imdbId: string;
  type: MovieType;
}
