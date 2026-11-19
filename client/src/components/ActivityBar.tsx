import { ExplorerIcon, RepoIcon, SourceControlIcon } from './Icons';
import { useStore } from '../store';

export default function ActivityBar() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const repo = useStore((s) => s.repo);
  const gitStatus = useStore((s) => s.gitStatus);
  const changeCount = gitStatus
    ? gitStatus.created.length + gitStatus.modified.length + gitStatus.deleted.length + gitStatus.renamed.length + gitStatus.conflicted.length
    : 0;

  const btn = (v: string) =>
    `relative w-12 h-12 flex items-center justify-center cursor-pointer border-l-2 ${
      view === v ? 'text-white border-white' : 'text-vsc-dim border-transparent hover:text-vsc-text'
    }`;

  return (
    <div className="w-12 bg-vsc-activity flex flex-col items-center shrink-0">
      <button title="Repositories" className={btn('repos')} onClick={() => setView('repos')}>
        <RepoIcon />
      </button>
      <button title="Explorer" className={btn('explorer')} onClick={() => setView('explorer')} disabled={!repo}>
        <ExplorerIcon />
      </button>
      <button title="Source Control" className={btn('git')} onClick={() => setView('git')} disabled={!repo}>
        <SourceControlIcon />
        {changeCount > 0 && (
          <span className="absolute bottom-1.5 right-1.5 bg-vsc-accent text-white text-[10px] leading-none rounded-full px-1.5 py-0.5 min-w-[16px]">
            {changeCount}
          </span>
        )}
      </button>
    </div>
  );
}
