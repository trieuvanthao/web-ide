import { WebSocketServer } from 'ws';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { URL } from 'node:url';
import simpleGit from 'simple-git';
import { REPOS_DIR, repoPath, isValidRepoName } from './config.js';

let nodePty = null;
try {
  const mod = await import('node-pty');
  nodePty = mod.default || mod;
  console.log('[terminal] Loaded native node-pty successfully');
} catch {
  console.log('[terminal] node-pty not available, using child_process shell fallback');
}

/**
 * Determine the default shell for the system
 */
function getDefaultShell() {
  const isWin = os.platform() === 'win32';
  if (isWin) {
    // Prefer Git Bash if installed on Windows for full POSIX/git experience
    const gitBash = 'C:\\Program Files\\Git\\bin\\bash.exe';
    if (fs.existsSync(gitBash)) {
      return { shell: gitBash, args: ['--login', '-i'] };
    }
    const ps = process.env.COMSPEC || 'powershell.exe';
    return { shell: ps, args: ps.toLowerCase().includes('powershell') ? ['-NoLogo'] : [] };
  }
  // Linux / macOS (Render)
  const sh = process.env.SHELL || '/bin/bash';
  const exists = fs.existsSync(sh);
  const target = exists ? sh : '/bin/sh';
  return { shell: target, args: ['-i'] };
}

/**
 * Check if the upgrade request has a valid authenticated session
 */
function isRequestAuthenticated(req) {
  if (!process.env.IDE_PASSWORD) return true;
  const cookieHeader = req.headers.cookie || '';
  const cookies = Object.fromEntries(
    cookieHeader
      .split(';')
      .map((c) => c.trim().split('='))
      .filter(([k]) => Boolean(k))
  );

  const rawSid = cookies['webside.sid'];
  if (!rawSid) return false;

  try {
    const decoded = Buffer.from(decodeURIComponent(rawSid), 'base64').toString('utf8');
    const parsed = JSON.parse(decoded);
    return parsed.auth === true;
  } catch {
    return false;
  }
}

/**
 * Initialize WebSocket Terminal handler attached to the HTTP server
 */
export function initTerminalWebSocket(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    try {
      const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      if (parsedUrl.pathname !== '/api/terminal') return;

      if (!isRequestAuthenticated(req)) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    } catch (err) {
      console.error('[terminal] Upgrade error:', err.message);
      socket.destroy();
    }
  });

  wss.on('connection', async (ws, req) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const repoParam = parsedUrl.searchParams.get('repo');
    const tokenParam = parsedUrl.searchParams.get('token');

    let cwd = REPOS_DIR;
    if (repoParam && isValidRepoName(repoParam)) {
      try {
        const p = repoPath(repoParam);
        if (fs.existsSync(p)) {
          cwd = p;
          if (tokenParam) {
            try {
              const git = simpleGit(cwd);
              const remotes = await git.getRemotes(true);
              const origin = remotes.find((r) => r.name === 'origin');
              if (origin) {
                const currentUrl = origin.refs.fetch || origin.refs.push || '';
                if (!currentUrl.includes(tokenParam)) {
                  const clean = currentUrl.replace(/https:\/\/[^@\s]+@/, 'https://');
                  const targetUrl = clean.replace(/^https:\/\//, `https://x-access-token:${encodeURIComponent(tokenParam)}@`);
                  await git.remote(['set-url', 'origin', targetUrl]);
                }
              }
            } catch (err) {
              console.warn('[terminal] Could not set git origin token:', err.message);
            }
          }
        }
      } catch {}
    }

    const { shell, args } = getDefaultShell();
    console.log(`[terminal] Spawning shell "${shell}" in "${cwd}" (token: ${tokenParam ? 'yes' : 'no'})`);

    const termEnv = {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      ...(tokenParam ? { GITHUB_TOKEN: tokenParam, GH_TOKEN: tokenParam } : {}),
    };

    let term = null;
    const isPty = nodePty !== null;

    if (isPty) {
      try {
        term = nodePty.spawn(shell, args, {
          name: 'xterm-256color',
          cols: 80,
          rows: 24,
          cwd,
          env: termEnv,
        });

        term.onData((data) => {
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type: 'data', data }));
          }
        });

        term.onExit(({ exitCode }) => {
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type: 'exit', code: exitCode }));
          }
        });
      } catch (err) {
        console.error('[terminal] node-pty spawn failed, falling back to child_process:', err.message);
        term = null;
      }
    }

    if (!term) {
      // Child process fallback
      try {
        term = spawn(shell, args, {
          cwd,
          env: termEnv,
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        const sendData = (chunk) => {
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type: 'data', data: chunk.toString('utf8') }));
          }
        };

        term.stdout.on('data', sendData);
        term.stderr.on('data', sendData);

        term.on('close', (code) => {
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type: 'exit', code }));
          }
        });
      } catch (err) {
        console.error('[terminal] Shell spawn failed:', err.message);
        ws.send(JSON.stringify({ type: 'data', data: `\r\nFailed to start shell: ${err.message}\r\n` }));
        ws.close();
        return;
      }
    }

    // Send initial notification
    ws.send(
      JSON.stringify({
        type: 'data',
        data: `\x1b[36mConnected to Web IDE Terminal [${path.basename(cwd)}]\x1b[0m\r\n\r\n`,
      })
    );

    ws.on('message', (message) => {
      try {
        const msg = JSON.parse(message.toString('utf8'));
        if (msg.type === 'input' && msg.data) {
          if (isPty && term.write) {
            term.write(msg.data);
          } else if (term.stdin && term.stdin.writable) {
            term.stdin.write(msg.data);
          }
        } else if (msg.type === 'resize' && isPty && term.resize) {
          const cols = Math.max(10, Math.min(msg.cols || 80, 400));
          const rows = Math.max(5, Math.min(msg.rows || 24, 200));
          term.resize(cols, rows);
        }
      } catch (err) {
        console.error('[terminal] Handle message error:', err.message);
      }
    });

    ws.on('close', () => {
      try {
        if (isPty && term.kill) {
          term.kill();
        } else if (term && term.kill) {
          term.kill();
        }
      } catch {}
    });

    ws.on('error', (err) => {
      console.error('[terminal] WebSocket error:', err.message);
    });
  });

  return wss;
}
