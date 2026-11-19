import { useStore } from '../store';
import type { TreeNode } from '../types';
import { ChevronDown, ChevronRight, FileIcon, FolderIcon, PlusFileIcon, PlusFolderIcon, RefreshIcon, iconColorFor } from './Icons';

export default function Explorer() {
  const repo = useStore((s) => s.repo);
  const tree = useStore((s) => s.tree);
  const treeLoading = useStore((s) => s.treeLoading);
  const refreshTree = useStore((s) => s.refreshTree);
  const openModal = useStore((s) => s.openModal);

  if (!repo) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-vsc-dim">
        <span className="truncate">{repo}</span>
        <div className="flex items-center gap-1">
          <button
            title="New File"
            onClick={() =>
              openModal({
                title: 'New File (path from repo root)',
                placeholder: 'src/new-file.ts',
                initial: '',
                onSubmit: (v) => void useStore.getState().createEntry('', v, 'file'),
              })
            }
            className="p-0.5 hover:bg-vsc-hover rounded text-vsc-dim hover:text-vsc-text"
          >
            <PlusFileIcon />
          </button>
          <button
            title="New Folder"
            onClick={() =>
              openModal({
                title: 'New Folder (path from repo root)',
                placeholder: 'src/new-folder',
                initial: '',
                onSubmit: (v) => void useStore.getState().createEntry('', v, 'dir'),
              })
            }
            className="p-0.5 hover:bg-vsc-hover rounded text-vsc-dim hover:text-vsc-text"
          >
            <PlusFolderIcon />
          </button>
          <button title="Refresh" onClick={() => void refreshTree()} className="p-0.5 hover:bg-vsc-hover rounded text-vsc-dim hover:text-vsc-text">
            <RefreshIcon />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {treeLoading && <p className="text-xs text-vsc-dim px-3 py-1">Loading…</p>}
        {!treeLoading && tree.length === 0 && <p className="text-xs text-vsc-dim px-3 py-1">Empty repository</p>}
        {tree.map((node) => (
          <TreeItem key={node.path} node={node} depth={0} />
        ))}
      </div>
    </div>
  );
}

function TreeItem({ node, depth }: { node: TreeNode; depth: number }) {
  const expanded = useStore((s) => s.expanded.has(node.path));
  const toggleExpanded = useStore((s) => s.toggleExpanded);
  const openFile = useStore((s) => s.openFile);
  const active = useStore((s) => s.active);
  const isDirty = useStore((s) => s.tabs.find((t) => t.path === node.path)?.dirty ?? false);
  const setContextMenu = useStore((s) => s.setContextMenu);

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, path: node.path, type: node.type });
  };

  if (node.type === 'dir') {
    return (
      <div>
        <div
          className="flex items-center gap-0.5 h-[22px] pr-2 cursor-pointer hover:bg-vsc-hover select-none"
          style={{ paddingLeft: depth * 12 + 4 }}
          onClick={() => toggleExpanded(node.path)}
          onContextMenu={onContextMenu}
        >
          {expanded ? <ChevronDown className="shrink-0 text-vsc-dim" /> : <ChevronRight className="shrink-0 text-vsc-dim" />}
          <FolderIcon className="shrink-0 text-[#dcb67a]" />
          <span className="text-sm truncate">{node.name}</span>
        </div>
        {expanded &&
          node.children?.map((child) => <TreeItem key={child.path} node={child} depth={depth + 1} />)}
        {expanded && node.children?.length === 0 && (
          <p className="text-xs text-vsc-dim" style={{ paddingLeft: depth * 12 + 26 }}>
            (empty)
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-0.5 h-[22px] pr-2 cursor-pointer select-none ${
        active === node.path ? 'bg-vsc-selected' : 'hover:bg-vsc-hover'
      }`}
      style={{ paddingLeft: depth * 12 + 20 }}
      onClick={() => void openFile(node.path)}
      onContextMenu={onContextMenu}
    >
      <FileIcon className="shrink-0" />
      <span className="text-sm truncate" style={{ color: iconColorFor(node.name) }}>
        {node.name}
      </span>
      {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-white ml-1 shrink-0" />}
    </div>
  );
}
