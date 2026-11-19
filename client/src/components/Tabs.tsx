import { useStore } from '../store';
import { CloseIcon, iconColorFor } from './Icons';

export default function Tabs() {
  const tabs = useStore((s) => s.tabs);
  const active = useStore((s) => s.active);
  const setActive = useStore((s) => s.setActive);
  const closeTab = useStore((s) => s.closeTab);

  if (tabs.length === 0) return <div className="h-9 bg-vsc-sidebar border-b border-vsc-border shrink-0" />;

  return (
    <div className="h-9 bg-vsc-sidebar border-b border-vsc-border flex overflow-x-auto shrink-0">
      {tabs.map((tab) => (
        <div
          key={tab.path}
          onClick={() => setActive(tab.path)}
          className={`group flex items-center gap-1.5 pl-3 pr-1.5 min-w-[120px] max-w-[220px] cursor-pointer text-sm border-r border-vsc-border ${
            active === tab.path ? 'bg-vsc-bg text-white border-t-2 border-t-vsc-accent' : 'text-vsc-dim hover:text-vsc-text'
          }`}
        >
          <span className="truncate flex-1" style={{ color: active === tab.path ? iconColorFor(tab.path.split('/').pop() || '') : undefined }}>
            {tab.path.split('/').pop()}
          </span>
          {tab.dirty && <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />}
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeTab(tab.path);
            }}
            className="opacity-0 group-hover:opacity-100 hover:bg-vsc-hover rounded p-0.5 shrink-0"
          >
            <CloseIcon />
          </button>
        </div>
      ))}
    </div>
  );
}
