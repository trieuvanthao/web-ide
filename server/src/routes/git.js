import { Router } from 'express';
import simpleGit from 'simple-git';
import { repoPath, gitErrMsg } from '../config.js';
import { scheduleSnapshot } from '../snapshots.js';

const router = Router();

function withToken(url, token) {
  if (!token) return url;
  const clean = url.replace(/https:\/\/[^@\s]+@/, 'https://');
  return clean.replace(/^https:\/\//, `https://x-access-token:${encodeURIComponent(token)}@`);
}

async function getGit(repoName) {
  const dir = repoPath(String(repoName));
  return simpleGit(dir);
}

async function getOriginUrl(git) {
  const remotes = await git.getRemotes(true);
  const origin = remotes.find((r) => r.name === 'origin');
  return origin?.refs?.fetch || origin?.refs?.push || null;
}

router.post('/git/token', async (req, res) => {
  try {
    const { repo, token } = req.body || {};
    if (!repo) return res.status(400).json({ error: 'Repo required' });
    const git = await getGit(repo);
    const origin = await getOriginUrl(git);
    if (origin) {
      const clean = origin.replace(/https:\/\/[^@\s]+@/, 'https://');
      const targetUrl = token
        ? clean.replace(/^https:\/\//, `https://x-access-token:${encodeURIComponent(token)}@`)
        : clean;
      await git.remote(['set-url', 'origin', targetUrl]);
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: gitErrMsg(e) });
  }
});

router.get('/git/status', async (req, res) => {
  try {
    const git = await getGit(req.query.repo);
    const s = await git.status();
    res.json({
      branch: s.current,
      tracking: s.tracking,
      ahead: s.ahead,
      behind: s.behind,
      created: s.created,
      modified: s.modified,
      deleted: s.deleted,
      renamed: s.renamed,
      staged: s.staged,
      conflicted: s.conflicted,
    });
  } catch (e) {
    res.status(400).json({ error: gitErrMsg(e) });
  }
});

router.post('/git/commit', async (req, res) => {
  try {
    const { repo, message, files } = req.body || {};
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'Commit message required' });
    }
    const git = await getGit(repo);
    if (Array.isArray(files) && files.length) {
      await git.add(files);
    } else {
      await git.add('-A');
    }
    const r = await git.commit(String(message).trim());
    scheduleSnapshot(String(repo), 3000);
    res.json({ ok: true, commit: r.commit });
  } catch (e) {
    res.status(400).json({ error: gitErrMsg(e) });
  }
});

router.post('/git/push', async (req, res) => {
  try {
    const { repo, token } = req.body || {};
    const git = await getGit(repo);
    const origin = await getOriginUrl(git);
    if (!origin) return res.status(400).json({ error: 'No origin remote configured' });
    const s = await git.status();
    if (!s.current) return res.status(400).json({ error: 'Detached HEAD, cannot push' });
    await git.push(withToken(origin, token), s.current);
    scheduleSnapshot(String(repo), 3000);
    res.json({ ok: true, branch: s.current });
  } catch (e) {
    res.status(400).json({ error: gitErrMsg(e) });
  }
});

router.post('/git/pull', async (req, res) => {
  try {
    const { repo, token } = req.body || {};
    const git = await getGit(repo);
    const origin = await getOriginUrl(git);
    if (!origin) return res.status(400).json({ error: 'No origin remote configured' });
    const s = await git.status();
    if (!s.current) return res.status(400).json({ error: 'Detached HEAD, cannot pull' });
    const out = await git.pull(withToken(origin, token), s.current);
    scheduleSnapshot(String(repo), 3000);
    res.json({ ok: true, branch: s.current, files: out?.files?.length ?? 0 });
  } catch (e) {
    res.status(400).json({ error: gitErrMsg(e) });
  }
});

router.get('/git/branches', async (req, res) => {
  try {
    const git = await getGit(req.query.repo);
    const b = await git.branch(['-a']);
    res.json({ current: b.current, all: b.all });
  } catch (e) {
    res.status(400).json({ error: gitErrMsg(e) });
  }
});

router.post('/git/checkout', async (req, res) => {
  try {
    const { repo, branch } = req.body || {};
    if (!branch) return res.status(400).json({ error: 'Branch required' });
    const git = await getGit(repo);
    const b = await git.branch(['-a']);
    if (!b.all.includes(branch) && b.all.includes(`remotes/origin/${branch}`)) {
      await git.checkoutBranch(branch, `origin/${branch}`);
    } else {
      await git.checkout(branch);
    }
    scheduleSnapshot(String(repo), 3000);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: gitErrMsg(e) });
  }
});

export default router;