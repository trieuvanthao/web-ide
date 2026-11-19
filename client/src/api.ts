async function j(res: Response): Promise<any> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

function post(body: unknown): RequestInit {
  return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

const enc = encodeURIComponent;

export const api = {
  me: () => fetch('/api/auth/me').then(j),
  login: (password: string) => fetch('/api/auth/login', post({ password })).then(j),
  logout: () => fetch('/api/auth/logout', { method: 'POST' }).then(j),

  repos: () => fetch('/api/repos').then(j),
  clone: (url: string, token: string, name: string) => fetch('/api/repos/clone', post({ url, token, name })).then(j),
  deleteRepo: (name: string) => fetch(`/api/repos/${enc(name)}`, { method: 'DELETE' }).then(j),

  tree: (repo: string) => fetch(`/api/tree?repo=${enc(repo)}`).then(j),
  file: (repo: string, path: string) => fetch(`/api/file?repo=${enc(repo)}&path=${enc(path)}`).then(j),
  saveFile: (repo: string, path: string, content: string) => fetch('/api/file', post({ repo, path, content })).then(j),
  createFile: (repo: string, path: string, type: 'file' | 'dir') => fetch('/api/file', post({ repo, path, type })).then(j),
  deleteFile: (repo: string, path: string) => fetch(`/api/file?repo=${enc(repo)}&path=${enc(path)}`, { method: 'DELETE' }).then(j),
  renameFile: (repo: string, path: string, newPath: string) => fetch('/api/file/rename', post({ repo, path, newPath })).then(j),

  gitStatus: (repo: string) => fetch(`/api/git/status?repo=${enc(repo)}`).then(j),
  branches: (repo: string) => fetch(`/api/git/branches?repo=${enc(repo)}`).then(j),
  commit: (repo: string, message: string) => fetch('/api/git/commit', post({ repo, message })).then(j),
  push: (repo: string, token: string) => fetch('/api/git/push', post({ repo, token })).then(j),
  pull: (repo: string, token: string) => fetch('/api/git/pull', post({ repo, token })).then(j),
  checkout: (repo: string, branch: string) => fetch('/api/git/checkout', post({ repo, branch })).then(j),
};
