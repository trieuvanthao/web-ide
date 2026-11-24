import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { repoPath, safeJoin, buildTree, isBinaryFile } from '../config.js';
import { scheduleSnapshot, driveEnabled, restoreSnapshot } from '../snapshots.js';

const router = Router();

const MAX_EDIT_SIZE = 8 * 1024 * 1024;

router.get('/tree', async (req, res) => {
  try {
    const repoName = String(req.query.repo || '');
    const dir = repoPath(repoName);
    if (!fs.existsSync(dir)) {
      if (driveEnabled()) {
        try {
          await restoreSnapshot(repoName);
        } catch (e) {
          if (String(e.message).includes('No Drive snapshot')) {
            return res.status(404).json({ error: 'Repo not found on server' });
          }
          return res.status(500).json({ error: `Auto-restore from Drive failed: ${e.message}` });
        }
      } else {
        return res.status(404).json({ error: 'Repo not found on server' });
      }
    }
    res.json({ tree: buildTree(dir) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/file', (req, res) => {
  try {
    const dir = repoPath(String(req.query.repo || ''));
    const abs = safeJoin(dir, String(req.query.path || ''));
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
      return res.status(404).json({ error: 'File not found' });
    }
    const buf = fs.readFileSync(abs);
    if (buf.length > MAX_EDIT_SIZE) {
      return res.json({ tooLarge: true, size: buf.length });
    }
    if (isBinaryFile(buf)) {
      return res.json({ binary: true, base64: buf.toString('base64'), size: buf.length });
    }
    res.json({ binary: false, content: buf.toString('utf8'), size: buf.length });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/file', (req, res) => {
  try {
    const { repo, path: rel, content } = req.body || {};
    const abs = safeJoin(repoPath(String(repo)), String(rel));
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content ?? '', 'utf8');
    scheduleSnapshot(String(repo), 15000);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/file', (req, res) => {
  try {
    const { repo, path: rel, type } = req.body || {};
    const abs = safeJoin(repoPath(String(repo)), String(rel));
    if (fs.existsSync(abs)) return res.status(409).json({ error: 'Already exists' });
    if (type === 'dir') {
      fs.mkdirSync(abs, { recursive: true });
    } else {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, '');
    }
    scheduleSnapshot(String(repo), 15000);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/file', (req, res) => {
  try {
    const repo = String(req.query.repo || '');
    const dir = repoPath(repo);
    const abs = safeJoin(dir, String(req.query.path || ''));
    if (abs === path.resolve(dir)) return res.status(400).json({ error: 'Cannot delete repo root' });
    fs.rmSync(abs, { recursive: true, force: true });
    scheduleSnapshot(repo, 15000);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/file/rename', (req, res) => {
  try {
    const { repo, path: rel, newPath } = req.body || {};
    const dir = repoPath(String(repo));
    const abs = safeJoin(dir, String(rel));
    const absNew = safeJoin(dir, String(newPath));
    if (!fs.existsSync(abs)) return res.status(404).json({ error: 'Not found' });
    if (fs.existsSync(absNew)) return res.status(409).json({ error: 'Target already exists' });
    fs.mkdirSync(path.dirname(absNew), { recursive: true });
    fs.renameSync(abs, absNew);
    scheduleSnapshot(String(repo), 15000);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;