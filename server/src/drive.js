import crypto from 'node:crypto';
import fs from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';
const UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const FILES_URL = 'https://www.googleapis.com/drive/v3/files';

function getOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!clientId || !clientSecret || !refreshToken || !folderId) return null;
  return { clientId, clientSecret, refreshToken, folderId };
}

function getServiceAccountConfig() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!raw || !folderId) return null;
  try {
    let text = raw.trim();
    if (!text.startsWith('{')) text = Buffer.from(text, 'base64').toString('utf8');
    const sa = JSON.parse(text);
    if (!sa.client_email || !sa.private_key) return null;
    const privateKey = sa.private_key.includes('\\n') ? sa.private_key.replace(/\\n/g, '\n') : sa.private_key;
    return { clientEmail: sa.client_email, privateKey, folderId };
  } catch {
    return null;
  }
}

export function driveEnabled() {
  return getOAuthConfig() !== null || getServiceAccountConfig() !== null;
}

let cachedToken = null;

function b64url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiry - 60 > now) return cachedToken.token;
  const oauth = getOAuthConfig();
  if (oauth) return await refreshAccessToken(oauth, now);
  const sa = getServiceAccountConfig();
  if (sa) return await serviceAccountAccessToken(sa, now);
  throw new Error('Google Drive not configured');
}

async function refreshAccessToken(oauth, now) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: oauth.clientId,
      client_secret: oauth.clientSecret,
      refresh_token: oauth.refreshToken,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || 'Google token refresh failed');
  cachedToken = { token: data.access_token, expiry: now + (data.expires_in || 3600) };
  return cachedToken.token;
}

async function serviceAccountAccessToken(sa, now) {
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({ iss: sa.clientEmail, scope: DRIVE_SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }));
  const input = `${header}.${claims}`;
  const signature = crypto.createSign('RSA-SHA256').update(input).sign(sa.privateKey);
  const assertion = `${input}.${b64url(signature)}`;
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || 'Google authentication failed');
  cachedToken = { token: data.access_token, expiry: now + (data.expires_in || 3600) };
  return cachedToken.token;
}

async function driveFetch(url, options = {}) {
  const token = await getAccessToken();
  const res = await fetch(url, { ...options, headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) } });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Google Drive error ${res.status}: ${text.slice(0, 300)}`);
  }
  return res;
}

let cachedSnapshots = null;
let snapshotsCachedAt = 0;
const SNAPSHOTS_TTL_MS = 15000;

export function invalidateSnapshotsCache() {
  cachedSnapshots = null;
  snapshotsCachedAt = 0;
}

export async function listSnapshots(forceRefresh = false) {
  if (!driveEnabled()) return [];
  const now = Date.now();
  if (!forceRefresh && cachedSnapshots && now - snapshotsCachedAt < SNAPSHOTS_TTL_MS) {
    return cachedSnapshots;
  }
  const folderId = getOAuthConfig()?.folderId || getServiceAccountConfig()?.folderId;
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and name contains 'webide-snapshot-' and trashed = false`,
    fields: 'files(id,name,size,modifiedTime)',
    spaces: 'drive',
    orderBy: 'modifiedTime desc',
    pageSize: '100',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  });
  const res = await driveFetch(`${FILES_URL}?${params}`);
  const data = await res.json();
  cachedSnapshots = (data.files || []).map((f) => ({
    repo: f.name.replace(/^webide-snapshot-/, '').replace(/\.zip$/, ''),
    fileId: f.id,
    size: Number(f.size || 0),
    savedAt: f.modifiedTime,
  }));
  snapshotsCachedAt = Date.now();
  return cachedSnapshots;
}

/**
 * Upload snapshot file using Google Drive Resumable Upload (Streaming).
 * Handles both a file path (string) or Buffer, streaming from disk when path is provided
 * to keep Node.js heap memory under 20MB.
 */
export async function uploadSnapshot(repoName, filePathOrBuffer) {
  const cfg = getOAuthConfig() || getServiceAccountConfig();
  if (!cfg) throw new Error('Google Drive not configured');

  const existingList = await listSnapshots(true);
  const existing = existingList.find((s) => s.repo === repoName);
  const fileName = `webide-snapshot-${repoName}.zip`;

  const isPath = typeof filePathOrBuffer === 'string';
  const fileSize = isPath ? fs.statSync(filePathOrBuffer).size : filePathOrBuffer.length;

  // Step 1: Initiate Resumable Upload Session
  const initUrl = existing
    ? `${UPLOAD_URL}/${existing.fileId}?uploadType=resumable&supportsAllDrives=true`
    : `${UPLOAD_URL}?uploadType=resumable&supportsAllDrives=true`;

  const metadata = existing
    ? { name: fileName }
    : { name: fileName, parents: [cfg.folderId] };

  const token = await getAccessToken();
  const initRes = await fetch(initUrl, {
    method: existing ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': 'application/zip',
      'X-Upload-Content-Length': String(fileSize),
    },
    body: JSON.stringify(metadata),
  });

  if (!initRes.ok) {
    const errText = await initRes.text().catch(() => '');
    throw new Error(`Google Drive resumable init failed (${initRes.status}): ${errText.slice(0, 300)}`);
  }

  const sessionUri = initRes.headers.get('location');
  if (!sessionUri) throw new Error('Google Drive did not return resumable upload session URI');

  // Step 2: Stream content directly to the session URI
  const uploadBody = isPath
    ? Readable.toWeb(fs.createReadStream(filePathOrBuffer))
    : filePathOrBuffer;

  const uploadRes = await fetch(sessionUri, {
    method: 'PUT',
    headers: {
      'Content-Length': String(fileSize),
      'Content-Type': 'application/zip',
    },
    body: uploadBody,
    duplex: 'half',
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text().catch(() => '');
    throw new Error(`Google Drive stream upload failed (${uploadRes.status}): ${errText.slice(0, 300)}`);
  }

  invalidateSnapshotsCache();
  return true;
}

/**
 * Stream snapshot directly from Google Drive to a destination file on disk.
 * Avoids buffering entire zip into Node.js heap memory.
 */
export async function downloadSnapshotToFile(fileId, destFilePath) {
  const res = await driveFetch(`${FILES_URL}/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`);
  if (!res.body) throw new Error('Empty response body from Google Drive');
  const fileStream = fs.createWriteStream(destFilePath);
  await pipeline(Readable.fromWeb(res.body), fileStream);
  return destFilePath;
}

export async function downloadSnapshot(fileId) {
  const res = await driveFetch(`${FILES_URL}/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`);
  return Buffer.from(await res.arrayBuffer());
}

export async function deleteSnapshotByRepo(repoName) {
  const existingList = await listSnapshots(true);
  const existing = existingList.find((s) => s.repo === repoName);
  if (existing) {
    await driveFetch(`${FILES_URL}/${existing.fileId}?supportsAllDrives=true`, { method: 'DELETE' });
    invalidateSnapshotsCache();
  }
}
