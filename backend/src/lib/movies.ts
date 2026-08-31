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
