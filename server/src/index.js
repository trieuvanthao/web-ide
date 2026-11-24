import express from 'express';
import cookieSession from 'cookie-session';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import authRoutes, { requireAuth } from './auth.js';
import reposRoutes from './routes/repos.js';
import filesRoutes from './routes/files.js';
import gitRoutes from './routes/git.js';
import snapshotsRoutes from './routes/snapshots.js';
import { flushPendingSnapshots } from './snapshots.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(express.json({ limit: '50mb' }));
app.use(
  cookieSession({
    name: 'webside.sid',
    keys: [process.env.SESSION_SECRET || 'dev-secret-change-me'],
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.RENDER === 'true' || process.env.COOKIE_SECURE === 'true',
  })
);

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api', requireAuth, reposRoutes);
app.use('/api', requireAuth, filesRoutes);
app.use('/api', requireAuth, gitRoutes);
app.use('/api', requireAuth, snapshotsRoutes);

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
const clientIndex = path.join(clientDist, 'index.html');
if (fs.existsSync(clientIndex)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(clientIndex);
    }
    next();
  });
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal error' });
});

const server = app.listen(PORT, () => {
  const auth = process.env.IDE_PASSWORD ? 'password protected' : 'NO PASSWORD SET (open access)';
  console.log(`Web IDE server on http://localhost:${PORT} [${auth}]`);
});

let isShuttingDown = false;
async function handleShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[server] Received ${signal}. Flushing pending snapshots before exit...`);
  try {
    await Promise.race([
      flushPendingSnapshots(),
      new Promise((resolve) => setTimeout(resolve, 20000)),
    ]);
  } catch (err) {
    console.error('[server] Error flushing snapshots on shutdown:', err.message);
  }
  server.close(() => {
    console.log('[server] Closed HTTP server. Bye.');
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 2000);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));