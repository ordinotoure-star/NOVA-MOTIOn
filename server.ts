import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { initDatabase } from './server/db';
import { UPLOADS_DIR, ensureMediaDirs, ensureSeedMediaFiles } from './server/ffmpegEngine';
import { registerRoutes } from './server/routes';

dotenv.config();

async function startServer() {
  ensureMediaDirs();
  initDatabase();

  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '25mb' }));
  app.use(cookieParser());

  // Serve generated/uploaded media assets safely
  app.use('/uploads', express.static(UPLOADS_DIR));

  registerRoutes(app);

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build not found');
      }
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NOVA MOTION AI server running on http://localhost:${PORT}`);
    void ensureSeedMediaFiles().catch((err) => console.warn('Seed media async error:', err));
  });
}

startServer().catch((err) => {
  console.error('Failed to start NOVA MOTION AI server:', err);
  process.exit(1);
});
