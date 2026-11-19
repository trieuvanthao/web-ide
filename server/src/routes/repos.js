import { Router } from 'express';
import simpleGit from 'simple-git';
import fs from 'node:fs';
import path from 'node:path';
import { REPOS_DIR, repoPath, isValidRepoName, gitErrMsg } from '../config.js';

const router = Router();

router.get('/repos', (req, res) => {
  try {
    const names = fs
      .readdirSync(REPOS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('.') && fs.existsSync(path.join(REPOS_DIR, d.name, '.git')))
      .map((d) => d.name)
      .sort();
    res.json({ repos: names });
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
