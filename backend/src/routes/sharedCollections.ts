import { copyFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, type AuthRequest } from '../middleware/auth';
import { movieInclude, normalizeName, type MovieWithRelations } from '../lib/movies';
import { duplicateFor, inputSchema, saveRelations, scalarData, type MovieInput } from './movies';

const router = Router();
const uploadDir = path.resolve(process.cwd(), 'uploads');

router.use(authenticateToken);

const titleOf = (movie: { spanishTitle: string | null; originalTitle: string }) => movie.spanishTitle || movie.originalTitle;

const loadShared = async (token: string) => {
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(token)) return null;
  const collection = await prisma.movieCollection.findUnique({
    where: { shareToken: token },
    include: { user: { select: { name: true, alias: true } }, items: { orderBy: { order: 'asc' } } },
  });
  if (!collection) return null;
  const movies = await prisma.movieItem.findMany({
    where: { userId: collection.userId, id: { in: collection.items.map((item) => item.movieId) } },
    include: movieInclude,
  });
  movies.sort((left, right) => titleOf(left).localeCompare(titleOf(right), 'es', { sensitivity: 'base' }));
  return { collection, movies };
};

// Copia un archivo subido para que la copia importada no dependa del original.
const copyUpload = async (url: string | null | undefined, userId: string) => {
  if (!url?.startsWith('/uploads/')) return null;
  const filename = path.basename(url);
  if (!filename || filename !== url.slice('/uploads/'.length)) return null;
  const newName = `${userId}-${randomUUID()}${path.extname(filename)}`;
  try {
    await copyFile(path.join(uploadDir, filename), path.join(uploadDir, newName));
    return newName;
  } catch {
    return null;
  }
};

// Solo se comparten los datos del título: nada de lo personal (visto, favorito, watchlist, puntuación).
const toInput = (movie: MovieWithRelations) => inputSchema.safeParse({
  type: movie.type,
  originalTitle: movie.originalTitle,
  spanishTitle: movie.spanishTitle,
  year: movie.year,
  synopsis: movie.synopsis,
  durationMinutes: movie.durationMinutes,
  seasons: movie.seasons,
  totalEpisodes: movie.totalEpisodes,
  watched: false,
  favorite: false,
  watchlist: false,
  thumbsUp: false,
  thumbsDown: false,
  instagramRecommendation: false,
  personalRating: null,
  imdbRating: movie.imdbRating,
  tmdbId: movie.tmdbId,
  imdbId: movie.imdbId,
  imdbUrl: movie.imdbUrl,
  tmdbUrl: movie.tmdbUrl,
  justwatchUrl: movie.justwatchUrl,
  trailerUrl: movie.trailerUrl,
  tmdbCollectionId: movie.tmdbCollectionId,
  tmdbCollectionName: movie.tmdbCollectionName,
  images: movie.images.map((image, order) => ({ url: image.url, localPath: image.localPath, tmdbFilePath: image.tmdbFilePath, order, isPrimary: order === 0, altText: image.altText })),
  countries: movie.countries.map((country, order) => ({ name: country.name, isoCode: country.isoCode, order })),
  credits: movie.credits.map((credit, order) => ({ name: credit.person.name, creditType: credit.creditType, characterName: credit.characterName, tmdbPersonId: credit.person.tmdbPersonId, tmdbCreditId: credit.tmdbCreditId, profilePath: credit.person.profilePath, order })),
  genres: movie.genres.map(({ genre }, order) => ({ name: genre.name, tmdbGenreId: genre.tmdbGenreId, tmdbMediaType: genre.tmdbMediaType, order })),
  keywords: movie.keywords.map(({ keyword }, order) => ({ name: keyword.name, order })),
  platforms: movie.platforms.map(({ platform, isPrimary }, order) => ({ name: platform.name, isPrimary, tmdbProviderId: platform.tmdbProviderId, logoPath: platform.logoPath, order })),
  collectionIds: [],
});

// Vista previa para quien recibe el enlace.
router.get('/:token', async (req: AuthRequest, res) => {
  const shared = await loadShared(String(req.params.token));
  if (!shared) return res.status(404).json({ error: 'El enlace no es válido o ya no está disponible' });
  const { collection, movies } = shared;
  const mine = await prisma.movieItem.findMany({ where: { userId: req.user!.userId }, select: { tmdbId: true, imdbId: true } });
  const mineTmdb = new Set(mine.map((movie) => movie.tmdbId).filter(Boolean));
  const mineImdb = new Set(mine.map((movie) => movie.imdbId).filter(Boolean));
  return res.json({
    name: collection.name,
    description: collection.description,
    coverImage: collection.coverImage,
    ownerName: collection.user.alias || collection.user.name,
    isOwner: collection.userId === req.user!.userId,
    titleCount: movies.length,
    titles: movies.map((movie) => {
      const poster = movie.images.find((image) => image.isPrimary) || movie.images[0];
      return {
        id: movie.id,
        type: movie.type,
        title: titleOf(movie),
        year: movie.year,
        posterUrl: poster?.url || null,
        inLibrary: Boolean((movie.tmdbId && mineTmdb.has(movie.tmdbId)) || (movie.imdbId && mineImdb.has(movie.imdbId))),
      };
    }),
  });
});

// Crea una copia de la colección en la cuenta de quien importa. Los títulos que ya tiene no se duplican.
router.post('/:token/import', async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const shared = await loadShared(String(req.params.token));
  if (!shared) return res.status(404).json({ error: 'El enlace no es válido o ya no está disponible' });
  const { collection: source, movies } = shared;
  if (source.userId === userId) return res.status(400).json({ error: 'Esta colección ya es tuya' });

  const existingNames = new Set((await prisma.movieCollection.findMany({ where: { userId }, select: { name: true } })).map((item) => normalizeName(item.name)));
  const base = source.name.slice(0, 60);
  let name = source.name;
  if (existingNames.has(normalizeName(name))) {
    name = `${base} (importada)`;
    for (let n = 2; existingNames.has(normalizeName(name)) && n < 100; n += 1) name = `${base} (importada ${n})`;
  }

  const copiedCover = await copyUpload(source.coverImage, userId);
  const created = await prisma.movieCollection.create({
    data: { userId, name, description: source.description, coverImage: copiedCover ? `/uploads/${copiedCover}` : source.coverImage?.startsWith('/uploads/') ? null : source.coverImage },
  });

  let added = 0;
  let alreadyHad = 0;
  const failed: string[] = [];
  let order = 0;
  for (const movie of movies) {
    try {
      const parsed = toInput(movie);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || 'Datos no válidos');
      const input: MovieInput = parsed.data;
      const duplicate = await duplicateFor(userId, input);
      let movieId: string;
      if (duplicate) {
        movieId = duplicate.movie.id;
        alreadyHad += 1;
      } else {
        const images = await Promise.all((input.images || []).map(async (image) => {
          const copied = await copyUpload(image.url, userId);
          return copied ? { ...image, url: `/uploads/${copied}`, localPath: copied } : image.url.startsWith('/uploads/') ? null : image;
        }));
        const finalInput: MovieInput = { ...input, images: images.filter((image): image is NonNullable<typeof image> => image !== null) };
        movieId = await prisma.$transaction(async (tx) => {
          const row = await tx.movieItem.create({ data: { userId, ...scalarData(finalInput) } });
          await saveRelations(tx, row.id, userId, finalInput);
          return row.id;
        });
        added += 1;
      }
      await prisma.movieCollectionItem.create({ data: { collectionId: created.id, movieId, order } });
      order += 1;
    } catch (error) {
      console.error('No se pudo importar un título de la colección compartida', error);
      failed.push(titleOf(movie));
    }
  }

  return res.status(201).json({ collection: { id: created.id, name: created.name }, added, alreadyHad, failed });
});

export default router;
