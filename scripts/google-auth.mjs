import http from 'node:http';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';

const PORT = 53682;
const REDIRECT_URI = `http://localhost:${PORT}`;
const SCOPE = 'https://www.googleapis.com/auth/drive';

const clientId = process.env.GOOGLE_CLIENT_ID || process.argv[2];
const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.argv[3];

if (!clientId || !clientSecret) {
  console.error('Missing credentials.');
  console.error('Usage:');
  console.error('  node scripts/google-auth.mjs <CLIENT_ID> <CLIENT_SECRET>');
  console.error('  or set env GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET first.');
  process.exit(1);
}

const state = crypto.randomBytes(16).toString('hex');
const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.set('client_id', clientId);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', SCOPE);
authUrl.searchParams.set('access_type', 'offline');
authUrl.searchParams.set('prompt', 'consent');
authUrl.searchParams.set('state', state);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);
  if (url.pathname !== '/') {
    res.writeHead(404);
    res.end();
    return;
  }
  if (url.searchParams.get('state') !== state) {
    res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h3>State mismatch. Close this tab and run the script again.</h3>');
    return;
  }
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  if (error || !code) {
    res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h3>Authorization failed: ${error || 'no code returned'}</h3>`);
    server.close();
    return;
  }
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });
    const data = await tokenRes.json();
    if (!tokenRes.ok) {
      throw new Error(data.error_description || data.error || 'token exchange failed');
    }
    if (!data.refresh_token) {
      throw new Error('No refresh_token returned. Revoke access at https://myaccount.google.com/permissions then run this script again.');
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h3>Success! You can close this tab and copy the token from the terminal.</h3>');
    console.log('');
    console.log('=== GOOGLE_REFRESH_TOKEN (copy this) ===');
    console.log('');
    console.log(data.refresh_token);
    console.log('');
    console.log('=== Set these 4 env vars (local or Render) ===');
    console.log(`GOOGLE_CLIENT_ID=${clientId}`);
    console.log(`GOOGLE_CLIENT_SECRET=${clientSecret}`);
    console.log(`GOOGLE_REFRESH_TOKEN=${data.refresh_token}`);
    console.log('GOOGLE_DRIVE_FOLDER_ID=<your Drive folder ID>');
    console.log('');
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h3>Token exchange failed: ${e.message}</h3>`);
    console.error(`Token exchange failed: ${e.message}`);
  } finally {
    server.close();
  }
});

server.listen(PORT, () => {
  console.log(`Listening for Google callback on ${REDIRECT_URI}`);
  console.log('A browser window should open for authorization.');
  console.log(`If nothing opens, visit this URL manually:\n`);
  console.log(authUrl.toString());
  console.log('');
  openBrowser(authUrl.toString());
});

function openBrowser(url) {
  try {
    if (process.platform === 'win32') {
      spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
    } else if (process.platform === 'darwin') {
      spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
    } else {
      spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
    }
  } catch {
    console.log('Could not open the browser automatically. Use the URL above.');
  }
}