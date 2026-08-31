import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { authenticateToken, type AuthRequest } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 5 }, fileFilter: (_req, file, callback) => callback(null, /^image\/(jpeg|png|webp)$/i.test(file.mimetype)) });
const uploadDir = path.resolve(process.cwd(), 'uploads');

router.post('/', authenticateToken, upload.array('images', 5), async (req: AuthRequest, res) => {
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files?.length) return res.status(400).json({ error: 'Selecciona al menos una imagen JPG, PNG o WebP' });
  await mkdir(uploadDir, { recursive: true });
  const images = await Promise.all(files.map(async (file, order) => {
    const filename = `${req.user!.userId}-${randomUUID()}.webp`;
    await sharp(file.buffer).rotate().resize({ width: 1600, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 86 }).toFile(path.join(uploadDir, filename));
    return { url: `/uploads/${filename}`, localPath: filename, order };
  }));
  return res.status(201).json({ images });
});

export default router;
