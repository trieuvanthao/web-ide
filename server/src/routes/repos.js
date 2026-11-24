import { Router } from 'express';
import simpleGit from 'simple-git';
import fs from 'node:fs';
import path from 'node:path';
import { REPOS_DIR, repoPath, isValidRepoName, gitErrMsg } from '../config.js';
import { scheduleSnapshot, driveEnabled, listSnapshots } from '../snapshots.js';

const router = Router();

router.get('/repos', async (req, res) => {
  try {
    const disk = fs
      .readdirSync(REPOS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('.') && fs.existsSync(path.join(REPOS_DIR, d.name, '.git')))
      .map((d) => d.name)
      .sort();
    const entries = disk.map((name) => ({ name, onServer: true, savedAt: null }));
    if (driveEnabled()) {
      try {
        const snaps = await listSnapshots();
        for (const s of snaps) {
          if (!disk.includes(s.repo)) {
            entries.push({ name: s.repo, onServer: false, savedAt: s.savedAt });
          }
        }
      } catch (e) {
        console.error(`[drive] list snapshots failed: ${e.message}`);
      }
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    res.json({ repos: entries });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/repos/clone', async (req, res) => {
  try {
    const { url, token, name } = req.body || {};
    if (!url || !/^https:\/\/[^\s]+$/i.test(url)) {
      return res.status(400).json({ error: 'Invalid repo URL (https only)' });
    }
    let repoName = String(name || url.replace(/\.git$/, '').split('/').pop() || '').replace(/[^A-Za-z0-9._-]/g, '-');
    if (!isValidRepoName(repoName)) {
      return res.status(400).json({ error: 'Invalid repo name' });
    }
    const dest = repoPath(repoName);
    if (fs.existsSync(dest)) {
      return res.status(409).json({ error: `Repo "${repoName}" already exists on server` });
    }
    const authUrl = token ? url.replace(/^https:\/\//, `https://x-access-token:${encodeURIComponent(token)}@`) : url;
    await simpleGit().clone(authUrl, dest, ['--depth', '1']);
    const git = simpleGit(dest);
    await git.remote(['set-url', 'origin', url]).catch(() => {});
    await git.addConfig('user.name', process.env.GIT_AUTHOR_NAME || 'Web IDE').catch(() => {});
    await git.addConfig('user.email', process.env.GIT_AUTHOR_EMAIL || 'web-ide@users.noreply.github.com').catch(() => {});
    scheduleSnapshot(repoName, 3000);
    res.json({ ok: true, repo: repoName });
  } catch (e) {
    res.status(400).json({ error: gitErrMsg(e) });
  }
});

router.delete('/repos/:name', (req, res) => {
  try {
    const dir = repoPath(req.params.name);
    fs.rmSync(dir, { recursive: true, force: true });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;