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
  logoPath: z.string().trim().min(1).max(2000).nullable().optional(),
});

const removeUploadedLogo = async (logoPath: string | null | undefined) => {
  if (!logoPath?.startsWith('/uploads/')) return;
  const filename = path.basename(logoPath);
  if (!filename || filename !== logoPath.slice('/uploads/'.length)) return;
  await unlink(path.join(uploadDir, filename)).catch(() => undefined);
};

router.use(authenticateToken);

router.get('/', async (req: AuthRequest, res) => {
  const platforms = await prisma.platform.findMany({
    where: { userId: req.user!.userId },
    include: { _count: { select: { movies: true } } },
    orderBy: { name: 'asc' },
  });
  return res.json(platforms.map(({ _count, ...platform }) => ({ ...platform, movieCount: _count.movies })));
});

router.patch('/:id', async (req: AuthRequest, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Completá un título válido para la plataforma' });
  const platformId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const current = await prisma.platform.findFirst({
    where: { id: platformId, userId: req.user!.userId },
    include: { _count: { select: { movies: true } } },
  });
  if (!current) return res.status(404).json({ error: 'Plataforma no encontrada' });

  const normalizedName = normalizeName(parsed.data.name);
  const duplicate = await prisma.platform.findFirst({
    where: { userId: req.user!.userId, normalizedName, id: { not: current.id } },
    select: { id: true },
  });
  if (duplicate) return res.status(409).json({ error: 'Ya existe una plataforma con ese título' });

  const updated = await prisma.platform.update({
    where: { id: current.id },
    data: {
      name: parsed.data.name,
      normalizedName,
      ...(parsed.data.logoPath !== undefined ? { logoPath: parsed.data.logoPath } : {}),
    },
  });
  if (parsed.data.logoPath !== undefined && parsed.data.logoPath !== current.logoPath) {
    await removeUploadedLogo(current.logoPath);
  }
  return res.json({ ...updated, movieCount: current._count.movies });
});

router.delete('/:id', async (req: AuthRequest, res) => {
  const platformId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const current = await prisma.platform.findFirst({
    where: { id: platformId, userId: req.user!.userId },
    include: { _count: { select: { movies: true } } },
  });
  if (!current) return res.status(404).json({ error: 'Plataforma no encontrada' });
  await prisma.platform.delete({ where: { id: current.id } });
  await removeUploadedLogo(current.logoPath);
  return res.json({ deleted: true, movieCount: current._count.movies });
});

export default router;
