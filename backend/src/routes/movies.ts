import { Router } from 'express';
import { z } from 'zod';
import path from 'node:path';
import { unlink } from 'node:fs/promises';
import { prisma } from '../lib/prisma';
import { findOwnedMovie, movieInclude, normalizeName, serializeMovie } from '../lib/movies';
import { authenticateToken, type AuthRequest } from '../middleware/auth';

const router = Router();
const named = z.object({ name: z.string().trim().min(1).max(100), order: z.number().int().min(0).optional() });
const inputSchema = z.object({
  type: z.enum(['movie', 'series']), originalTitle: z.string().trim().min(1).max(250),
  spanishTitle: z.string().trim().max(250).nullable().optional(), year: z.number().int().min(1888).max(2200).nullable().optional(),
  synopsis: z.string().trim().max(5000).nullable().optional(), durationMinutes: z.number().int().positive().max(2000).nullable().optional(),
  seasons: z.number().int().positive().max(999).nullable().optional(), totalEpisodes: z.number().int().positive().max(99999).nullable().optional(),
  watched: z.boolean().optional(), favorite: z.boolean().optional(), personalRating: z.number().min(0).max(10).nullable().optional(),
  imdbRating: z.number().min(0).max(10).nullable().optional(), tmdbId: z.number().int().positive().nullable().optional(),
  imdbId: z.string().trim().max(30).nullable().optional(), imdbUrl: z.string().trim().url().nullable().optional(),
  filmaffinityUrl: z.string().trim().url().nullable().optional(), trailerUrl: z.string().trim().url().nullable().optional(),
  tmdbCollectionId: z.number().int().positive().nullable().optional(), tmdbCollectionName: z.string().trim().max(250).nullable().optional(),
  images: z.array(z.object({ url: z.string().trim().min(1).max(2000), localPath: z.string().nullable().optional(), tmdbFilePath: z.string().nullable().optional(), order: z.number().int().min(0), isPrimary: z.boolean().optional(), altText: z.string().max(250).nullable().optional() })).max(5).optional(),
  countries: z.array(named.extend({ isoCode: z.string().max(3).nullable().optional() })).max(20).optional(),
  credits: z.array(named.extend({ creditType: z.enum(['director', 'cast']), characterName: z.string().max(150).nullable().optional(), tmdbPersonId: z.number().int().positive().nullable().optional(), tmdbCreditId: z.string().nullable().optional(), profilePath: z.string().nullable().optional() })).max(25).refine((items) => items.filter((item) => item.creditType === 'cast').length <= 5, 'El reparto principal admite hasta 5 personas').optional(),
  genres: z.array(named).max(30).optional(), keywords: z.array(named).max(50).optional(),
  platforms: z.array(named.extend({ isPrimary: z.boolean().optional() })).max(30).optional(), collectionIds: z.array(z.string()).max(100).optional(),
});
type MovieInput = z.infer<typeof inputSchema>;
const uploadDir = path.resolve(process.cwd(), 'uploads');
const localPathFor = (image: { url: string; localPath?: string | null }) => image.localPath || (image.url.startsWith('/uploads/') ? path.basename(image.url) : null);
const removeLocalImages = async (paths: (string | null | undefined)[]) => Promise.all(paths.filter((value): value is string => Boolean(value)).map(async (filename) => {
  if (path.basename(filename) !== filename) return;
  await unlink(path.join(uploadDir, filename)).catch(() => undefined);
}));

const duplicateFor = async (userId: string, input: Pick<MovieInput, 'type' | 'tmdbId' | 'imdbId' | 'originalTitle' | 'spanishTitle' | 'year'>, excludeId?: string) => {
  const base = { userId, ...(excludeId ? { id: { not: excludeId } } : {}) };
  if (input.tmdbId) {
    const movie = await prisma.movieItem.findFirst({ where: { ...base, type: input.type, tmdbId: input.tmdbId }, include: movieInclude });
    if (movie) return { movie, reason: 'tmdbId' as const };
  }
  if (input.imdbId) {
    const movie = await prisma.movieItem.findFirst({ where: { ...base, imdbId: input.imdbId }, include: movieInclude });
    if (movie) return { movie, reason: 'imdbId' as const };
  }
  if (input.year) {
    const candidates = await prisma.movieItem.findMany({ where: { ...base, type: input.type, year: input.year }, include: movieInclude });
    const titles = [input.originalTitle, input.spanishTitle].filter(Boolean).map((title) => normalizeName(title!));
    const movie = candidates.find((item) => [item.originalTitle, item.spanishTitle].filter(Boolean).some((title) => titles.includes(normalizeName(title!))));
    if (movie) return { movie, reason: 'titleAndYear' as const };
  }
  return null;
};

const saveRelations = async (tx: any, movieId: string, userId: string, input: MovieInput) => {
  await Promise.all([tx.movieImage.deleteMany({ where: { movieId } }), tx.movieCountry.deleteMany({ where: { movieId } }), tx.movieCredit.deleteMany({ where: { movieId } }), tx.movieGenre.deleteMany({ where: { movieId } }), tx.movieKeyword.deleteMany({ where: { movieId } }), tx.moviePlatform.deleteMany({ where: { movieId } }), tx.movieCollectionItem.deleteMany({ where: { movieId } })]);
  if (input.images?.length) await tx.movieImage.createMany({ data: input.images.map((image, index) => ({ ...image, localPath: localPathFor(image), movieId, order: index, isPrimary: index === 0 })) });
  if (input.countries?.length) await tx.movieCountry.createMany({ data: input.countries.map((country, index) => ({ movieId, name: country.name, normalizedName: normalizeName(country.name), isoCode: country.isoCode, order: index })) });
  for (const [index, credit] of (input.credits || []).entries()) {
    let person = await tx.person.findFirst({ where: { userId, normalizedName: normalizeName(credit.name) } });
    person ||= await tx.person.create({ data: { userId, name: credit.name, normalizedName: normalizeName(credit.name), tmdbPersonId: credit.tmdbPersonId, profilePath: credit.profilePath } });
    await tx.movieCredit.create({ data: { movieId, personId: person.id, creditType: credit.creditType, order: index, characterName: credit.characterName, tmdbCreditId: credit.tmdbCreditId } });
  }
  for (const [index, item] of (input.genres || []).entries()) {
    const normalizedName = normalizeName(item.name); const genre = await tx.genre.upsert({ where: { userId_normalizedName: { userId, normalizedName } }, update: { name: item.name }, create: { userId, name: item.name, normalizedName } });
    await tx.movieGenre.create({ data: { movieId, genreId: genre.id, order: index } });
  }
  for (const [index, item] of (input.keywords || []).entries()) {
    const normalizedName = normalizeName(item.name); const keyword = await tx.keyword.upsert({ where: { userId_normalizedName: { userId, normalizedName } }, update: { name: item.name }, create: { userId, name: item.name, normalizedName } });
    await tx.movieKeyword.create({ data: { movieId, keywordId: keyword.id, order: index } });
  }
  for (const [index, item] of (input.platforms || []).entries()) {
    const normalizedName = normalizeName(item.name); const platform = await tx.platform.upsert({ where: { userId_normalizedName: { userId, normalizedName } }, update: { name: item.name }, create: { userId, name: item.name, normalizedName } });
    await tx.moviePlatform.create({ data: { movieId, platformId: platform.id, order: index, isPrimary: index === 0 } });
  }
  if (input.collectionIds?.length) {
    const owned = await tx.movieCollection.findMany({ where: { userId, id: { in: input.collectionIds } }, select: { id: true } });
    await tx.movieCollectionItem.createMany({ data: owned.map((collection: { id: string }, index: number) => ({ movieId, collectionId: collection.id, order: index })) });
  }
};

const scalarData = (input: MovieInput) => ({
  type: input.type, originalTitle: input.originalTitle, spanishTitle: input.spanishTitle || null, year: input.year ?? null,
  synopsis: input.synopsis || null, durationMinutes: input.durationMinutes ?? null, seasons: input.type === 'series' ? input.seasons ?? null : null,
  totalEpisodes: input.type === 'series' ? input.totalEpisodes ?? null : null, watched: input.watched ?? false, favorite: input.favorite ?? false,
  personalRating: input.personalRating ?? null, imdbRating: input.imdbRating ?? null, tmdbId: input.tmdbId ?? null, imdbId: input.imdbId || null,
  imdbUrl: input.imdbUrl || null, filmaffinityUrl: input.filmaffinityUrl || null, trailerUrl: input.trailerUrl || null,
  tmdbCollectionId: input.tmdbCollectionId ?? null, tmdbCollectionName: input.tmdbCollectionName || null,
});

router.use(authenticateToken);
router.get('/', async (req: AuthRequest, res) => {
  try { const movies = await prisma.movieItem.findMany({ where: { userId: req.user!.userId }, orderBy: { createdAt: 'desc' }, include: movieInclude }); return res.json(movies.map(serializeMovie)); }
  catch (error) { console.error(error); return res.status(500).json({ error: 'No se pudo cargar la biblioteca' }); }
});
router.post('/check-duplicate', async (req: AuthRequest, res) => {
  const parsed = inputSchema.pick({ type: true, originalTitle: true, spanishTitle: true, year: true, tmdbId: true, imdbId: true }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos insuficientes' });
  const duplicate = await duplicateFor(req.user!.userId, parsed.data);
  return res.json(duplicate ? { exists: true, reason: duplicate.reason, movie: serializeMovie(duplicate.movie) } : { exists: false, reason: null, movie: null });
});
router.get('/:id', async (req: AuthRequest, res) => { const movie = await findOwnedMovie(prisma, String(req.params.id), req.user!.userId); return movie ? res.json(serializeMovie(movie)) : res.status(404).json({ error: 'Titulo no encontrado' }); });
router.post('/', async (req: AuthRequest, res) => {
  const parsed = inputSchema.safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Revisa los datos del titulo' });
  const duplicate = await duplicateFor(req.user!.userId, parsed.data); if (duplicate) return res.status(409).json({ error: 'Este titulo ya esta en tu biblioteca', duplicateId: duplicate.movie.id });
  const movie = await prisma.$transaction(async (tx) => { const created = await tx.movieItem.create({ data: { userId: req.user!.userId, ...scalarData(parsed.data) } }); await saveRelations(tx, created.id, req.user!.userId, parsed.data); return tx.movieItem.findUniqueOrThrow({ where: { id: created.id }, include: movieInclude }); });
  return res.status(201).json(serializeMovie(movie));
});
router.put('/:id', async (req: AuthRequest, res) => {
  const parsed = inputSchema.safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Revisa los datos del titulo' });
  const current = await findOwnedMovie(prisma, String(req.params.id), req.user!.userId); if (!current) return res.status(404).json({ error: 'Titulo no encontrado' });
  const duplicate = await duplicateFor(req.user!.userId, parsed.data, current.id); if (duplicate) return res.status(409).json({ error: 'Ya existe otro titulo con esos datos' });
  const movie = await prisma.$transaction(async (tx) => { await tx.movieItem.update({ where: { id: current.id }, data: scalarData(parsed.data) }); await saveRelations(tx, current.id, req.user!.userId, parsed.data); return tx.movieItem.findUniqueOrThrow({ where: { id: current.id }, include: movieInclude }); });
  const retained = new Set((parsed.data.images || []).map(localPathFor));
  await removeLocalImages(current.images.map((image) => retained.has(image.localPath) ? null : image.localPath));
  return res.json(serializeMovie(movie));
});
router.patch('/:id/personal', async (req: AuthRequest, res) => {
  const parsed = z.object({ favorite: z.boolean().optional(), watched: z.boolean().optional(), personalRating: z.number().min(0).max(10).nullable().optional() }).safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: 'Valor personal no valido' });
  const current = await findOwnedMovie(prisma, String(req.params.id), req.user!.userId); if (!current) return res.status(404).json({ error: 'Titulo no encontrado' });
  const movie = await prisma.movieItem.update({ where: { id: current.id }, data: parsed.data, include: movieInclude }); return res.json(serializeMovie(movie));
});
router.delete('/:id', async (req: AuthRequest, res) => { const current = await findOwnedMovie(prisma, String(req.params.id), req.user!.userId); if (!current) return res.status(404).json({ error: 'Titulo no encontrado' }); await prisma.movieItem.delete({ where: { id: current.id } }); await removeLocalImages(current.images.map((image) => image.localPath)); return res.status(204).send(); });

export default router;
