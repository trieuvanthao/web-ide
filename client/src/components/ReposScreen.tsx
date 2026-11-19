import { useState } from 'react';
import { RepoIcon, TrashIcon, ChevronRight } from './Icons';
import { useStore } from '../store';

export default function ReposScreen() {
  const repos = useStore((s) => s.repos);
  const repo = useStore((s) => s.repo);
  const busy = useStore((s) => s.busy);
  const clone = useStore((s) => s.clone);
  const deleteRepo = useStore((s) => s.deleteRepo);
  const openRepo = useStore((s) => s.openRepo);

  return (
    <div className="flex flex-col gap-4 p-3">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-vsc-dim mb-2">Clone repository</h2>
        <CloneForm busy={busy} onClone={clone} />
      </div>
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-vsc-dim mb-2">Repositories on server</h2>
        {repos.length === 0 && <p className="text-xs text-vsc-dim px-1">No repositories yet. Clone one above.</p>}
        <ul className="flex flex-col gap-0.5">
          {repos.map((name) => (
            <li
              key={name}
              className={`group flex items-center gap-1 px-2 py-1 rounded text-sm cursor-pointer hover:bg-vsc-hover ${
                repo === name ? 'bg-vsc-selected' : ''
              }`}
              onClick={() => void openRepo(name)}
            >
              <RepoIcon className="shrink-0 text-vsc-dim" />
              <span className="flex-1 truncate">{name}</span>
              {repo === name && <ChevronRight className="text-vsc-dim rotate-90" />}
              <button
                title="Delete from server"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Delete "${name}" from server? (Code already pushed to GitHub is safe)`)) {
                    void deleteRepo(name);
                  }
                }}
                className="opacity-0 group-hover:opacity-100 text-vsc-dim hover:text-red-400"
              >
                <TrashIcon />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CloneForm({ busy, onClone }: { busy: boolean; onClone: (url: string, token: string, name: string) => Promise<void> }) {
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [name, setName] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || busy) return;
    await onClone(url.trim(), token.trim(), name.trim());
  };

  const inputCls =
    'w-full bg-vsc-bg border border-vsc-border rounded px-2 py-1.5 text-xs text-vsc-text outline-none focus:border-vsc-accent placeholder:text-vsc-dim';

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <input className={inputCls} placeholder="https://github.com/user/repo.git" value={url} onChange={(e) => setUrl(e.target.value)} />
      <input className={inputCls} type="password" placeholder="GitHub token (PAT) — required for private repos & push" value={token} onChange={(e) => setToken(e.target.value)} />
      <input className={inputCls} placeholder="Folder name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
      <button
        type="submit"
        disabled={busy || !url.trim()}
        className="bg-vsc-accent hover:bg-vsc-accent-hover disabled:opacity-50 text-white text-xs rounded py-1.5"
      >
        {busy ? 'Cloning…' : 'Clone'}
      </button>
    </form>
  );
}
