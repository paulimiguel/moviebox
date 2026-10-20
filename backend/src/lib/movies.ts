import type { Prisma, PrismaClient } from '@prisma/client';

export const movieInclude = {
  images: { orderBy: { order: 'asc' as const } },
  countries: { orderBy: { order: 'asc' as const } },
  credits: { orderBy: { order: 'asc' as const }, include: { person: true } },
  genres: { orderBy: { order: 'asc' as const }, include: { genre: true } },
  keywords: { orderBy: { order: 'asc' as const }, include: { keyword: true } },
  platforms: { orderBy: { order: 'asc' as const }, include: { platform: true } },
  collections: { orderBy: { order: 'asc' as const }, include: { collection: true } },
} satisfies Prisma.MovieItemInclude;

export type MovieWithRelations = Prisma.MovieItemGetPayload<{ include: typeof movieInclude }>;

export const normalizeName = (value: string) => value
  .trim()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('es');

export const serializeMovie = (movie: MovieWithRelations) => ({
  ...movie,
  tmdbImportedAt: movie.tmdbImportedAt?.toISOString() || null,
  tmdbLastSyncedAt: movie.tmdbLastSyncedAt?.toISOString() || null,
  createdAt: movie.createdAt.toISOString(),
  updatedAt: movie.updatedAt.toISOString(),
  credits: movie.credits.map((credit) => ({
    id: credit.person.id,
    name: credit.person.name,
    tmdbPersonId: credit.person.tmdbPersonId,
    profilePath: credit.person.profilePath,
    creditType: credit.creditType,
    order: credit.order,
    characterName: credit.characterName,
    tmdbCreditId: credit.tmdbCreditId,
  })),
  genres: movie.genres.map(({ genre, order }) => ({ ...genre, order })),
  keywords: movie.keywords.map(({ keyword, order }) => ({ ...keyword, order })),
  platforms: movie.platforms.map(({ platform, isPrimary, order }) => ({ ...platform, isPrimary, order })),
  collections: movie.collections.map(({ collection, order }) => ({ ...collection, order })),
});

export const findOwnedMovie = (db: PrismaClient | Prisma.TransactionClient, id: string, userId: string) =>
  db.movieItem.findFirst({ where: { id, userId }, include: movieInclude });

// Géneros combinados de TMDB para series: cada uno se guarda como dos géneros separados.
const COMBINED_GENRES: Array<{ pattern: RegExp; names: [string, string] }> = [
  { pattern: /^(ciencia ficcion|science fiction|sci-?fi)\s*(y|e|&|\/|,|-)\s*(fantasia|fantasy)$/, names: ['Ciencia ficción', 'Fantasía'] },
  { pattern: /^(accion|action)\s*(y|e|&|\/|,|-)\s*(aventuras?|adventure)$/, names: ['Acción', 'Aventura'] },
];

// Nombres de género que se guardan siempre con el nombre elegido (traducción o nombre unificado).
const GENRE_ALIASES: Record<string, string> = {
  comedy: 'Comedia',
  guerra: 'Bélica',
  war: 'Bélica',
  novela: 'Telenovela',
  'novela de tv': 'Telenovela',
  'novela de television': 'Telenovela',
  soap: 'Telenovela',
};

export const splitCombinedGenres = <T extends { name: string; tmdbGenreId?: number | null; tmdbMediaType?: 'movie' | 'series' | null }>(genres: T[]): T[] => {
  const result: T[] = [];
  const seen = new Set<string>();
  const add = (genre: T) => {
    const key = normalizeName(genre.name);
    if (!key || seen.has(key)) return;
    seen.add(key);
    result.push(genre);
  };
  for (const genre of genres) {
    const combined = COMBINED_GENRES.find((rule) => rule.pattern.test(normalizeName(genre.name)));
    if (combined) {
      // Los dos géneros resultantes no comparten el ID de TMDB del género combinado.
      combined.names.forEach((name) => add({ ...genre, name, tmdbGenreId: null }));
    } else {
      const alias = GENRE_ALIASES[normalizeName(genre.name)];
      add(alias ? { ...genre, name: alias, tmdbGenreId: genre.tmdbGenreId } : genre);
    }
  }
  return result;
};
