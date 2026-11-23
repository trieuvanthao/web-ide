import crypto from 'node:crypto';

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

export async function listSnapshots() {
  if (!driveEnabled()) return [];
  const cfg = getOAuthConfig()?.folderId || getServiceAccountConfig()?.folderId;
  const params = new URLSearchParams({
    q: `'${cfg}' in parents and name contains 'webide-snapshot-' and trashed = false`,
    fields: 'files(id,name,size,modifiedTime)',
    spaces: 'drive',
    orderBy: 'modifiedTime desc',
    pageSize: '100',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  });
  const res = await driveFetch(`${FILES_URL}?${params}`);
  const data = await res.json();
  return (data.files || []).map((f) => ({
    repo: f.name.replace(/^webide-snapshot-/, '').replace(/\.zip$/, ''),
    fileId: f.id,
    size: Number(f.size || 0),
    savedAt: f.modifiedTime,
  }));
}

export async function uploadSnapshot(repoName, zipBuffer) {
  const cfg = getOAuthConfig() || getServiceAccountConfig();
  if (!cfg) throw new Error('Google Drive not configured');
  const boundary = 'webide' + crypto.randomBytes(16).toString('hex');
  const metadata = JSON.stringify({ name: `webide-snapshot-${repoName}.zip`, parents: [cfg.folderId] });
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: application/zip\r\n\r\n`),
    zipBuffer,
    Buffer.from(`\r\n--${boundary}--`),
  ]);
  const existing = (await listSnapshots()).find((s) => s.repo === repoName);
  const base = existing
    ? `${UPLOAD_URL}/${existing.fileId}?uploadType=multipart&fields=id`
    : `${UPLOAD_URL}?uploadType=multipart&fields=id`;
  const url = `${base}&supportsAllDrives=true`;
  await driveFetch(url, {
    method: existing ? 'PATCH' : 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
  return true;
}

export async function downloadSnapshot(fileId) {
  const res = await driveFetch(`${FILES_URL}/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`);
  return Buffer.from(await res.arrayBuffer());
}

export async function deleteSnapshotByRepo(repoName) {
  const existing = (await listSnapshots()).find((s) => s.repo === repoName);
  if (existing) {
    await driveFetch(`${FILES_URL}/${existing.fileId}?supportsAllDrives=true`, { method: 'DELETE' });
  }
}