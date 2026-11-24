import AdmZip from 'adm-zip';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { repoPath, isValidRepoName } from './config.js';
import {
  driveEnabled,
  listSnapshots,
  uploadSnapshot,
  downloadSnapshotToFile,
  deleteSnapshotByRepo,
} from './drive.js';

const debounceTimers = new Map();
const inFlight = new Set();
const queuedReruns = new Set();

const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.next',
  '.nuxt',
  'dist',
  'build',
  'out',
  '.cache',
  '.turbo',
  'coverage',
  '.yarn',
  '.pnpm-store',
  '.parcel-cache',
]);

const EXCLUDED_FILES = new Set(['.DS_Store', 'Thumbs.db', 'desktop.ini']);
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB max per single file

/**
 * Recursively walk repository directory and add files to zip,
 * completely skipping heavy dependency folders (node_modules, dist, etc.)
 * to keep memory and CPU low. Preserves .git intact.
 */
function addFolderFiltered(zip, rootDir, currentDir = '') {
  const fullPath = currentDir ? path.join(rootDir, currentDir) : rootDir;
  const entries = fs.readdirSync(fullPath, { withFileTypes: true });

  for (const entry of entries) {
    const relPath = currentDir ? path.join(currentDir, entry.name) : entry.name;
    const absPath = path.join(rootDir, relPath);

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) {
        continue; // Completely skip heavy directories
      }
      addFolderFiltered(zip, rootDir, relPath);
    } else if (entry.isFile()) {
      if (EXCLUDED_FILES.has(entry.name) || entry.name.endsWith('.log')) {
        continue;
      }
      try {
        const stat = fs.statSync(absPath);
        if (stat.size > MAX_FILE_SIZE) {
          console.warn(`[drive] Skipping large file "${relPath}" (${Math.round(stat.size / 1024 / 1024)}MB)`);
          continue;
        }
        // Normalize zip entry directory with forward slashes
        const zipEntryName = relPath.replace(/\\/g, '/');
        const zipEntryDir = path.dirname(zipEntryName).replace(/\\/g, '/');
        zip.addLocalFile(absPath, zipEntryDir === '.' ? '' : zipEntryDir);
      } catch (err) {
        console.warn(`[drive] Could not add file "${relPath}": ${err.message}`);
      }
    }
  }
}

/**
 * Schedule snapshot with debounce and in-flight queueing.
 */
export function scheduleSnapshot(repoName, delayMs = 15000) {
  if (!driveEnabled() || !isValidRepoName(String(repoName))) return;
  const name = String(repoName);

  const existing = debounceTimers.get(name);
  if (existing) clearTimeout(existing);

  const t = setTimeout(() => {
    debounceTimers.delete(name);
    runSnapshot(name).catch((e) => console.error(`[drive] snapshot "${name}" failed: ${e.message}`));
  }, delayMs);

  debounceTimers.set(name, t);
}

async function runSnapshot(repoName) {
  if (inFlight.has(repoName)) {
    queuedReruns.add(repoName);
    return;
  }

  inFlight.add(repoName);
  try {
    await createSnapshot(repoName);
  } finally {
    inFlight.delete(repoName);
    if (queuedReruns.has(repoName)) {
      queuedReruns.delete(repoName);
      setTimeout(() => {
        runSnapshot(repoName).catch((e) => console.error(`[drive] rerun snapshot "${repoName}" failed: ${e.message}`));
      }, 1000);
    }
  }
}

/**
 * Create a zip snapshot written to a temporary disk file,
 * streamed up to Google Drive, and safely unlinked.
 */
export async function createSnapshot(repoName) {
  if (!driveEnabled()) throw new Error('Google Drive not configured');
  const name = String(repoName);
  const dir = repoPath(name);
  if (!fs.existsSync(dir)) throw new Error('Repo not found on server');

  const startTime = Date.now();
  const tmpZip = path.join(os.tmpdir(), `webide-snap-${name}-${Date.now()}.zip`);

  try {
    const zip = new AdmZip();
    addFolderFiltered(zip, dir);
    zip.writeZip(tmpZip);

    const size = fs.statSync(tmpZip).size;
    console.log(`[drive] Packaging "${name}" finished (${(size / 1024 / 1024).toFixed(2)} MB), uploading to Drive...`);

    await uploadSnapshot(name, tmpZip);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[drive] Snapshot for "${name}" uploaded successfully in ${duration}s (${(size / 1024).toFixed(0)} KB)`);
    return { repo: name, size };
  } finally {
    if (fs.existsSync(tmpZip)) {
      try {
        fs.unlinkSync(tmpZip);
      } catch {}
    }
  }
}

/**
 * Restore snapshot by streaming zip directly from Google Drive to disk,
 * extracting to repo folder, and removing temporary zip.
 */
export async function restoreSnapshot(repoName) {
  if (!driveEnabled()) throw new Error('Google Drive not configured');
  const name = String(repoName);
  const snaps = await listSnapshots();
  const snap = snaps.find((s) => s.repo === name);
  if (!snap) throw new Error(`No Drive snapshot for "${name}"`);

  const dest = repoPath(name);
  if (fs.existsSync(dest)) throw new Error('Repo already exists on server');

  const startTime = Date.now();
  const tmpZip = path.join(os.tmpdir(), `webide-restore-${name}-${Date.now()}.zip`);

  try {
    console.log(`[drive] Downloading snapshot for "${name}" from Drive...`);
    await downloadSnapshotToFile(snap.fileId, tmpZip);

    fs.mkdirSync(dest, { recursive: true });
    const zip = new AdmZip(tmpZip);
    zip.extractAllTo(dest, true);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[drive] Restored snapshot "${name}" successfully in ${duration}s`);
    return { repo: name };
  } finally {
    if (fs.existsSync(tmpZip)) {
      try {
        fs.unlinkSync(tmpZip);
      } catch {}
    }
  }
}

/**
 * Flush all pending debounced snapshots immediately (useful on graceful shutdown / SIGTERM).
 */
export async function flushPendingSnapshots() {
  const pending = [...debounceTimers.keys()];
  for (const name of pending) {
    clearTimeout(debounceTimers.get(name));
    debounceTimers.delete(name);
  }

  const allToFlush = new Set([...pending, ...queuedReruns]);
  if (allToFlush.size === 0) return;

  console.log(`[drive] Flushing pending snapshots before shutdown: ${[...allToFlush].join(', ')}`);
  for (const name of allToFlush) {
    try {
      await createSnapshot(name);
    } catch (e) {
      console.error(`[drive] Flush snapshot failed for "${name}": ${e.message}`);
    }
  }
}

export async function deleteSnapshotForRepo(repoName) {
  if (!driveEnabled()) throw new Error('Google Drive not configured');
  await deleteSnapshotByRepo(String(repoName));
}

export { driveEnabled, listSnapshots };
