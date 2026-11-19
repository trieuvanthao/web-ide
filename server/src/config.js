import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const REPOS_DIR = process.env.REPOS_DIR || path.join(__dirname, '..', 'repos');

fs.mkdirSync(REPOS_DIR, { recursive: true });

export function isValidRepoName(name) {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(name);
}

export function repoPath(name) {
  if (!isValidRepoName(name)) throw new Error('Invalid repo name');
  return path.join(REPOS_DIR, name);
}

export function safeJoin(repoDir, relPath) {
  const root = path.resolve(repoDir);
  const abs = path.resolve(root, relPath);
  if (abs !== root && !abs.startsWith(root + path.sep)) throw new Error('Invalid path');
  return abs;
}

const IGNORED = new Set(['.git', 'node_modules', '.DS_Store', 'Thumbs.db']);

export function buildTree(dir, rel = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    if (IGNORED.has(e.name)) continue;
    const r = rel ? `${rel}/${e.name}` : e.name;
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push({ name: e.name, path: r, type: 'dir', children: buildTree(abs, r) });
    } else if (e.isFile()) {
      out.push({ name: e.name, path: r, type: 'file', size: fs.statSync(abs).size });
    }
  }
  out.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1));
  return out;
}

export function isBinaryFile(buf) {
  const len = Math.min(buf.length, 8000);
  for (let i = 0; i < len; i++) {
    if (buf[i] === 0) return true;
  }
  return false;
}

export function gitErrMsg(err) {
  const msg = String(err?.message || err);
  const lines = msg.split('\n').map((s) => s.trim()).filter(Boolean);
  const last = lines[lines.length - 1] || 'Git error';
  return last.length > 400 ? last.slice(0, 400) : last;
}
