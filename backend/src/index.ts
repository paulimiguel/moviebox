import './config/env';

import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import authRoutes from './routes/auth';
import imdbRoutes from './routes/imdb';
import movieRoutes from './routes/movies';
import collectionRoutes from './routes/collections';
import metadataRoutes from './routes/metadata';
import uploadRoutes from './routes/uploads';
import tmdbRoutes from './routes/tmdb';
import path from 'node:path';

const app = express();
const allowedOrigins = new Set([
  env.frontendUrl,
  'http://localhost:8081',
  'http://127.0.0.1:8081',
]);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) callback(null, true);
    else callback(new Error('Origen no permitido'));
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/imdb', imdbRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/metadata', metadataRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/tmdb', tmdbRoutes);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'MovieBox API',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  });
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Ruta de API no encontrada' });
});

if (env.nodeEnv === 'production') {
  const frontendDist = path.resolve(process.cwd(), '../dist');
  app.use(express.static(frontendDist));
  app.get('*', (_req, res) => res.sendFile(path.join(frontendDist, 'index.html')));
} else {
  app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
}

app.listen(env.port, '0.0.0.0', () => {
  console.log(`MovieBox API listening on http://localhost:${env.port}`);
});
