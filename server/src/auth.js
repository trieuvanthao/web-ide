import { Router } from 'express';

const router = Router();
const PASSWORD = process.env.IDE_PASSWORD;

const attempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;

function isLocked(ip) {
  const a = attempts.get(ip);
  if (!a) return false;
  if (a.count >= MAX_ATTEMPTS && Date.now() - a.last < LOCK_MS) return true;
  if (Date.now() - a.last >= LOCK_MS) {
    attempts.delete(ip);
  }
  return false;
}

function recordFail(ip) {
  const a = attempts.get(ip) || { count: 0, last: 0 };
  a.count += 1;
  a.last = Date.now();
  attempts.set(ip, a);
}

export function requireAuth(req, res, next) {
  if (!PASSWORD) return next();
  if (req.session && req.session.auth === true) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

router.post('/login', (req, res) => {
  if (!PASSWORD) return res.json({ ok: true, open: true });
  const ip = req.ip || 'unknown';
  if (isLocked(ip)) {
    return res.status(429).json({ error: 'Too many attempts, try again later' });
  }
  const { password } = req.body || {};
  if (password === PASSWORD) {
    attempts.delete(ip);
    req.session.auth = true;
    return res.json({ ok: true });
  }
  recordFail(ip);
  res.status(401).json({ error: 'Wrong password' });
});

router.post('/logout', (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  if (!PASSWORD) return res.json({ auth: true, open: true });
  res.json({ auth: !!(req.session && req.session.auth) });
});

export default router;
