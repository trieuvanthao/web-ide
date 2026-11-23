import { useState } from 'react';
import { RepoIcon, TrashIcon, CloudIcon, UploadIcon, DownloadIcon } from './Icons';
import { useStore } from '../store';

function fmtTime(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function ReposScreen() {
  const repos = useStore((s) => s.repos);
  const repo = useStore((s) => s.repo);
  const busy = useStore((s) => s.busy);
  const driveEnabled = useStore((s) => s.driveEnabled);
  const clone = useStore((s) => s.clone);
  const deleteRepo = useStore((s) => s.deleteRepo);
  const openRepo = useStore((s) => s.openRepo);
  const backupNow = useStore((s) => s.backupNow);
  const restoreSnapshot = useStore((s) => s.restoreSnapshot);
  const deleteSnapshot = useStore((s) => s.deleteSnapshot);

  return (
    <div className="flex flex-col gap-4 p-3">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-vsc-dim mb-2">Clone repository</h2>
        <CloneForm busy={busy} onClone={clone} />
      </div>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-vsc-dim mb-2">
          Repositories {driveEnabled ? '(server + Google Drive)' : '(on server)'}
        </h2>
        {repos.length === 0 && <p className="text-xs text-vsc-dim px-1">No repositories yet. Clone one above.</p>}
        <ul className="flex flex-col gap-0.5">
          {repos.map((entry) => (
            <li
              key={entry.name}
              className={`group flex items-center gap-1.5 px-2 py-1 rounded text-sm cursor-pointer hover:bg-vsc-hover ${
                repo === entry.name ? 'bg-vsc-selected' : ''
              }`}
              onClick={() => void openRepo(entry.name)}
            >
              {entry.onServer ? (
                <RepoIcon className="shrink-0 text-vsc-dim" />
              ) : (
                <CloudIcon className="shrink-0 text-[#76b6e4]" />
              )}
              <span className="flex-1 truncate" title={entry.onServer ? entry.name : `${entry.name} — on Google Drive, will restore when opened`}>
                {entry.name}
              </span>
              {!entry.onServer && (
                <span className="text-[10px] text-[#76b6e4] shrink-0" title={`Drive backup — ${fmtTime(entry.savedAt)}`}>
                  ☁ Drive
                </span>
              )}
              {entry.onServer && driveEnabled && (
                <button
                  title="Backup to Google Drive now"
                  onClick={(e) => {
                    e.stopPropagation();
                    void backupNow(entry.name);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-vsc-dim hover:text-[#76b6e4]"
                >
                  <UploadIcon />
                </button>
              )}
              {entry.onServer ? (
                <button
                  title="Delete from server (Drive backup is kept)"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Delete "${entry.name}" from server? (Drive backup will be kept; pushed code is safe on Git)`)) {
                      void deleteRepo(entry.name);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 text-vsc-dim hover:text-red-400"
                >
                  <TrashIcon />
                </button>
              ) : (
                <button
                  title="Delete Drive backup"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Delete the Drive backup of "${entry.name}"? This cannot be undone.`)) {
                      void deleteSnapshot(entry.name);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 text-vsc-dim hover:text-red-400"
                >
                  <TrashIcon />
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-vsc-dim mb-2">Google Drive backups</h2>
        {!driveEnabled && (
          <p className="text-xs text-vsc-dim px-1 leading-5">
            Not configured. Set <code className="text-vsc-text">GOOGLE_SERVICE_ACCOUNT_JSON</code> and{' '}
            <code className="text-vsc-text">GOOGLE_DRIVE_FOLDER_ID</code> env vars to enable (see README).
          </p>
        )}
        {driveEnabled && <DriveList onRestore={restoreSnapshot} />}
      </div>
    </div>
  );
}

function DriveList({ onRestore }: { onRestore: (repo: string) => Promise<void> }) {
  const snapshots = useStore((s) => s.snapshots);

  if (snapshots.length === 0) {
    return <p className="text-xs text-vsc-dim px-1">No backups yet. Hover a repository and click the upload icon.</p>;
  }

  return (
    <ul className="flex flex-col gap-0.5">
      {snapshots.map((snap) => (
        <li key={snap.fileId} className="group flex items-center gap-1.5 px-2 py-1 rounded text-xs hover:bg-vsc-hover">
          <CloudIcon className="shrink-0 text-[#76b6e4]" />
          <span className="flex-1 truncate">{snap.repo}</span>
          <span className="text-[10px] text-vsc-dim shrink-0">
            {fmtSize(snap.size)} · {fmtTime(snap.savedAt)}
          </span>
          <button
            title="Restore to server now"
            onClick={() => void onRestore(snap.repo)}
            className="opacity-0 group-hover:opacity-100 text-vsc-dim hover:text-vsc-text"
          >
            <DownloadIcon />
          </button>
        </li>
      ))}
    </ul>
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