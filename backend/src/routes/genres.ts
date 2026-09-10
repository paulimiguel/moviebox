import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { Router } from 'express';
import { z } from 'zod';
import { normalizeName } from '../lib/movies';
import { prisma } from '../lib/prisma';
import { authenticateToken, type AuthRequest } from '../middleware/auth';

const router = Router();
const uploadDir = path.resolve(process.cwd(), 'uploads');
const updateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  imagePath: z.string().trim().min(1).max(2000).nullable().optional(),
});

const removeUploadedImage = async (imagePath: string | null | undefined) => {
  if (!imagePath?.startsWith('/uploads/')) return;
  const filename = path.basename(imagePath);
  if (!filename || filename !== imagePath.slice('/uploads/'.length)) return;
  await unlink(path.join(uploadDir, filename)).catch(() => undefined);
};

router.use(authenticateToken);

router.get('/', async (req: AuthRequest, res) => {
  const genres = await prisma.genre.findMany({
    where: { userId: req.user!.userId },
    include: { _count: { select: { movies: true } } },
    orderBy: { name: 'asc' },
  });
  return res.json(genres.map(({ _count, ...genre }) => ({ ...genre, movieCount: _count.movies })));
});

router.patch('/:id', async (req: AuthRequest, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Completá un título válido para el género' });
  const genreId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const current = await prisma.genre.findFirst({
    where: { id: genreId, userId: req.user!.userId },
    include: { _count: { select: { movies: true } } },
  });
  if (!current) return res.status(404).json({ error: 'Género no encontrado' });

  const normalizedName = normalizeName(parsed.data.name);
  const duplicate = await prisma.genre.findFirst({
    where: { userId: req.user!.userId, normalizedName, id: { not: current.id } },
    select: { id: true },
  });
  if (duplicate) return res.status(409).json({ error: 'Ya existe un género con ese título' });

  const updated = await prisma.genre.update({
    where: { id: current.id },
    data: {
      name: parsed.data.name,
      normalizedName,
      ...(parsed.data.imagePath !== undefined ? { imagePath: parsed.data.imagePath } : {}),
    },
  });
  if (parsed.data.imagePath !== undefined && parsed.data.imagePath !== current.imagePath) {
    await removeUploadedImage(current.imagePath);
  }
  return res.json({ ...updated, movieCount: current._count.movies });
});

router.delete('/:id', async (req: AuthRequest, res) => {
  const genreId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const current = await prisma.genre.findFirst({
    where: { id: genreId, userId: req.user!.userId },
    include: { _count: { select: { movies: true } } },
  });
  if (!current) return res.status(404).json({ error: 'Género no encontrado' });
  await prisma.genre.delete({ where: { id: current.id } });
  await removeUploadedImage(current.imagePath);
  return res.json({ deleted: true, movieCount: current._count.movies });
});

export default router;
