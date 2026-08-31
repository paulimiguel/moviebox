import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticateToken, type AuthRequest } from '../middleware/auth';
import { normalizeName } from '../lib/movies';

const router = Router();
const schema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).nullable().optional(),
  coverImage: z.string().trim().max(1000).nullable().optional(),
});

router.use(authenticateToken);

router.get('/', async (req: AuthRequest, res) => {
  const collections = await prisma.movieCollection.findMany({
    where: { userId: req.user!.userId },
    orderBy: { name: 'asc' },
    include: { items: { orderBy: { order: 'asc' } } },
  });
  return res.json(collections.map(({ items, ...collection }) => ({
    ...collection,
    movieIds: items.map((item) => item.movieId),
    movieOrders: Object.fromEntries(items.map((item) => [item.movieId, item.order])),
    movieCount: items.length,
    createdAt: collection.createdAt.toISOString(),
    updatedAt: collection.updatedAt.toISOString(),
  })));
});

router.post('/', async (req: AuthRequest, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Revisa los datos de la coleccion' });
  const existing = await prisma.movieCollection.findMany({ where: { userId: req.user!.userId } });
  const duplicate = existing.find((item) => normalizeName(item.name) === normalizeName(parsed.data.name));
  if (duplicate) return res.status(409).json({ error: 'Ya existe una coleccion con ese nombre' });
  const collection = await prisma.movieCollection.create({ data: { userId: req.user!.userId, ...parsed.data } });
  return res.status(201).json({ ...collection, movieIds: [], movieOrders: {}, movieCount: 0 });
});

router.put('/:id', async (req: AuthRequest, res) => {
  const id = String(req.params.id);
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Revisa los datos de la coleccion' });
  const current = await prisma.movieCollection.findFirst({ where: { id, userId: req.user!.userId } });
  if (!current) return res.status(404).json({ error: 'Coleccion no encontrada' });
  const existing = await prisma.movieCollection.findMany({ where: { userId: req.user!.userId, id: { not: current.id } } });
  if (existing.some((item) => normalizeName(item.name) === normalizeName(parsed.data.name))) return res.status(409).json({ error: 'Ya existe una coleccion con ese nombre' });
  const collection = await prisma.movieCollection.update({ where: { id: current.id }, data: parsed.data });
  return res.json(collection);
});

router.delete('/:id', async (req: AuthRequest, res) => {
  const id = String(req.params.id);
  const current = await prisma.movieCollection.findFirst({ where: { id, userId: req.user!.userId } });
  if (!current) return res.status(404).json({ error: 'Coleccion no encontrada' });
  await prisma.movieCollection.delete({ where: { id: current.id } });
  return res.status(204).send();
});

export default router;
