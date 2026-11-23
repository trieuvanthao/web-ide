import { Router } from 'express';
import { driveEnabled, listSnapshots, createSnapshot, restoreSnapshot, deleteSnapshotForRepo } from '../snapshots.js';

const router = Router();

router.get('/snapshots', async (req, res) => {
  if (!driveEnabled()) return res.json({ enabled: false, snapshots: [] });
  try {
    res.json({ enabled: true, snapshots: await listSnapshots() });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/snapshots/:repo', async (req, res) => {
  try {
    const r = await createSnapshot(req.params.repo);
    res.json({ ok: true, ...r });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/snapshots/:repo/restore', async (req, res) => {
  try {
    const r = await restoreSnapshot(req.params.repo);
    res.json({ ok: true, ...r });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/snapshots/:repo', async (req, res) => {
  try {
    await deleteSnapshotForRepo(req.params.repo);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
