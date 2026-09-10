import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { normalizeName } from '../lib/movies';
import { authenticateToken, type AuthRequest } from '../middleware/auth';

const router = Router();
const kinds = ['genres', 'keywords', 'platforms'] as const;
const nameSchema = z.object({ name: z.string().trim().min(1).max(80) });

router.use(authenticateToken);

router.get('/', async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const [genres, keywords, platforms, countryRows, directorRows] = await Promise.all([
    prisma.genre.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
    prisma.keyword.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
    prisma.platform.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
    prisma.movieCountry.findMany({
      where: { movie: { userId } },
      select: { id: true, name: true, normalizedName: true },
      orderBy: { name: 'asc' },
    }),
    prisma.person.findMany({
      where: { userId, credits: { some: { creditType: 'director' } } },
      select: { id: true, name: true, normalizedName: true },
      orderBy: { name: 'asc' },
    }),
  ]);
  const uniqueByName = <T extends { normalizedName: string }>(items: T[]) =>
    Array.from(new Map(items.map((item) => [item.normalizedName, item])).values());
  return res.json({
    genres,
    keywords,
    platforms,
    countries: uniqueByName(countryRows),
    directors: uniqueByName(directorRows),
  });
});

router.post('/:kind', async (req: AuthRequest, res) => {
  const kind = req.params.kind as (typeof kinds)[number];
  if (!kinds.includes(kind)) return res.status(404).json({ error: 'Tipo de metadato no valido' });
  const parsed = nameSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Escribe un nombre valido' });
  const data = { userId: req.user!.userId, name: parsed.data.name, normalizedName: normalizeName(parsed.data.name) };
  const model = kind === 'genres' ? prisma.genre : kind === 'keywords' ? prisma.keyword : prisma.platform;
  const existing = await (model as typeof prisma.genre).findFirst({ where: { userId: data.userId, normalizedName: data.normalizedName } });
  if (existing) return res.json(existing);
  const created = await (model as typeof prisma.genre).create({ data });
  return res.status(201).json(created);
});

export default router;
