import AdmZip from 'adm-zip';
import fs from 'node:fs';
import { repoPath, isValidRepoName } from './config.js';
import { driveEnabled, listSnapshots, uploadSnapshot, downloadSnapshot, deleteSnapshotByRepo } from './drive.js';

const debounceTimers = new Map();

export function scheduleSnapshot(repoName, delayMs = 60000) {
  if (!driveEnabled() || !isValidRepoName(String(repoName))) return;
  const existing = debounceTimers.get(repoName);
  if (existing) clearTimeout(existing);
  const t = setTimeout(() => {
    debounceTimers.delete(repoName);
    createSnapshot(repoName).catch((e) => console.error(`[drive] snapshot "${repoName}" failed: ${e.message}`));
  }, delayMs);
  debounceTimers.set(repoName, t);
}

export async function createSnapshot(repoName) {
  if (!driveEnabled()) throw new Error('Google Drive not configured');
  const dir = repoPath(String(repoName));
  if (!fs.existsSync(dir)) throw new Error('Repo not found on server');
  const zip = new AdmZip();
  zip.addLocalFolder(dir);
  const buf = zip.toBuffer();
  await uploadSnapshot(String(repoName), buf);
  return { repo: repoName, size: buf.length };
}

export async function restoreSnapshot(repoName) {
  if (!driveEnabled()) throw new Error('Google Drive not configured');
  const name = String(repoName);
  const snaps = await listSnapshots();
  const snap = snaps.find((s) => s.repo === name);
  if (!snap) throw new Error(`No Drive snapshot for "${name}"`);
  const dest = repoPath(name);
  if (fs.existsSync(dest)) throw new Error('Repo already exists on server');
  const buf = await downloadSnapshot(snap.fileId);
  const zip = new AdmZip(buf);
  fs.mkdirSync(dest, { recursive: true });
  zip.extractAllTo(dest, true);
  return { repo: name };
}

export async function deleteSnapshotForRepo(repoName) {
  if (!driveEnabled()) throw new Error('Google Drive not configured');
  await deleteSnapshotByRepo(String(repoName));
}

export { driveEnabled, listSnapshots };
