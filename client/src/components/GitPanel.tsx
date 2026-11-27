import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { DownloadIcon, GitBranchIcon, RefreshIcon, UploadIcon } from './Icons';

export default function GitPanel() {
  const gitStatus = useStore((s) => s.gitStatus);
  const branches = useStore((s) => s.branches);
  const token = useStore((s) => s.token);
  const setToken = useStore((s) => s.setToken);
  const busy = useStore((s) => s.busy);
  const refreshGit = useStore((s) => s.refreshGit);
  const commit = useStore((s) => s.commit);
  const push = useStore((s) => s.push);
  const pull = useStore((s) => s.pull);
  const switchBranch = useStore((s) => s.switchBranch);
  const [message, setMessage] = useState('');
  const [tokenInput, setTokenInput] = useState(token || '');
  const [showToken, setShowToken] = useState(!token);

  useEffect(() => {
    setShowToken(!token);
    if (token) setTokenInput(token);
  }, [token]);

  if (!gitStatus) {
    return <p className="text-xs text-vsc-dim p-3">Loading git status…</p>;
  }

  const s = gitStatus;
  const rows: { path: string; badge: string; color: string; staged: boolean }[] = [];
  for (const p of s.created) rows.push({ path: p, badge: 'U', color: 'text-green-400', staged: s.staged.includes(p) });
  for (const p of s.modified) rows.push({ path: p, badge: 'M', color: 'text-yellow-400', staged: s.staged.includes(p) });
  for (const p of s.deleted) rows.push({ path: p, badge: 'D', color: 'text-red-400', staged: s.staged.includes(p) });
  for (const r of s.renamed) rows.push({ path: `${r.from} → ${r.to}`, badge: 'R', color: 'text-blue-400', staged: s.staged.includes(r.to) });
  for (const p of s.conflicted) rows.push({ path: p, badge: 'C', color: 'text-orange-400', staged: s.staged.includes(p) });

  const branchOptions = Array.from(
    new Set(
      (branches?.all || [])
        .filter((b) => b !== 'HEAD')
        .map((b) => b.replace(/^remotes\/origin\//, ''))
    )
  ).sort();

  return (
    <div className="flex flex-col h-full text-sm">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-vsc-border">
        <GitBranchIcon className="text-vsc-dim shrink-0" />
        <select
          value={s.branch || ''}
          onChange={(e) => void switchBranch(e.target.value)}
          className="flex-1 bg-vsc-bg border border-vsc-border rounded px-1.5 py-1 text-xs text-vsc-text outline-none focus:border-vsc-accent"
          disabled={busy}
        >
          {s.branch && <option value={s.branch}>{s.branch}</option>}
          {branchOptions.filter((b) => b !== s.branch).map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <button title="Refresh status" onClick={() => void refreshGit()} className="p-1 text-vsc-dim hover:text-vsc-text hover:bg-vsc-hover rounded">
          <RefreshIcon />
        </button>
      </div>

      {(s.ahead > 0 || s.behind > 0) && (
        <div className="px-3 py-1 text-xs text-vsc-dim">
          {s.ahead > 0 && <span className="mr-3">↑ {s.ahead} ahead</span>}
          {s.behind > 0 && <span>↓ {s.behind} behind</span>}
        </div>
      )}

      <div className="px-3 py-2 flex flex-col gap-2 border-b border-vsc-border">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Commit message (Ctrl+Enter to commit)"
          rows={2}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && message.trim() && rows.length > 0) {
              void commit(message.trim()).then(() => setMessage(''));
            }
          }}
          className="bg-vsc-bg border border-vsc-border rounded px-2 py-1.5 text-xs text-vsc-text outline-none focus:border-vsc-accent resize-none"
        />
        <div className="flex gap-2">
          <button
            disabled={busy || rows.length === 0 || !message.trim()}
            onClick={() => void commit(message.trim()).then(() => setMessage(''))}
            className="flex-1 bg-vsc-accent hover:bg-vsc-accent-hover disabled:opacity-40 text-white text-xs rounded py-1.5"
          >
            ✓ Commit ({rows.length})
          </button>
        </div>
        <div className="flex gap-2">
          <button
            disabled={busy}
            onClick={() => void pull()}
            className="flex-1 flex items-center justify-center gap-1 border border-vsc-border hover:bg-vsc-hover text-vsc-text text-xs rounded py-1.5 disabled:opacity-40"
          >
            <DownloadIcon /> Pull
          </button>
          <button
            disabled={busy}
            onClick={() => void push()}
            className="flex-1 flex items-center justify-center gap-1 border border-vsc-border hover:bg-vsc-hover text-vsc-text text-xs rounded py-1.5 disabled:opacity-40"
          >
            <UploadIcon /> Push
          </button>
        </div>
      </div>

      <div className="px-3 py-2 border-b border-vsc-border">
        <button onClick={() => setShowToken((v) => !v)} className="text-xs text-vsc-dim hover:text-vsc-text">
          {showToken ? '▾' : '▸'} GitHub token {token ? '(active & synced with Terminal ✓)' : '(required for pull/push/terminal)'}
        </button>
        {showToken && (
          <div className="flex gap-1 mt-2">
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="ghp_… (scope: repo, workflow)"
              className="flex-1 bg-vsc-bg border border-vsc-border rounded px-2 py-1 text-xs text-vsc-text outline-none focus:border-vsc-accent"
            />
            <button
              onClick={() => {
                const clean = tokenInput.trim();
                setToken(clean || null);
                if (clean) useStore.getState().toast('GitHub token saved & synced with Git and Terminal!', 'success');
                else useStore.getState().toast('GitHub token cleared', 'info');
              }}
              className="bg-vsc-accent hover:bg-vsc-accent-hover text-white text-xs rounded px-2"
            >
              Save
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-vsc-dim">Changes</p>
        {rows.length === 0 && <p className="px-3 pb-2 text-xs text-vsc-dim">No changes — working tree clean</p>}
        {rows.map((row) => (
          <div key={row.path} className="flex items-center gap-2 px-3 py-1 hover:bg-vsc-hover">
            <span className={`text-xs font-bold w-3 ${row.staged ? 'text-green-300' : row.color}`}>{row.badge}</span>
            <span className="text-xs truncate" title={row.path}>
              {row.path.split('/').pop()}
            </span>
            <span className="text-[10px] text-vsc-dim truncate ml-auto">{row.path}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
