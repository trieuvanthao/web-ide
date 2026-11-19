import { useStore } from '../store';

export default function StatusBar() {
  const repo = useStore((s) => s.repo);
  const gitStatus = useStore((s) => s.gitStatus);
  const autoSave = useStore((s) => s.autoSave);
  const toggleAutoSave = useStore((s) => s.toggleAutoSave);
  const dirtyCount = useStore((s) => s.tabs.filter((t) => t.dirty).length);
  const logout = useStore((s) => s.logout);

  const unsavedChanges = gitStatus
    ? gitStatus.created.length + gitStatus.modified.length + gitStatus.deleted.length + gitStatus.renamed.length
    : 0;

  return (
    <div className="h-6 bg-vsc-status flex items-center justify-between px-2 text-[11px] text-white shrink-0">
      <div className="flex items-center gap-3">
        <span className="font-medium">{repo || 'No repository'}</span>
        {gitStatus?.branch && <span>⑂ {gitStatus.branch}</span>}
        {gitStatus && gitStatus.ahead > 0 && <span>↑ {gitStatus.ahead}</span>}
        {gitStatus && gitStatus.behind > 0 && <span>↓ {gitStatus.behind}</span>}
        {unsavedChanges > 0 && <span>⚠ {unsavedChanges} changed (not committed)</span>}
      </div>
      <div className="flex items-center gap-3">
        {dirtyCount > 0 && <span>{dirtyCount} unsaved</span>}
        <button onClick={toggleAutoSave} className="hover:underline">
          Auto Save: {autoSave ? 'On' : 'Off'}
        </button>
        <button onClick={() => void logout()} className="hover:underline">
          Sign out
        </button>
      </div>
    </div>
  );
}
