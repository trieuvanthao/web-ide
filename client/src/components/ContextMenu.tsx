import { useStore } from '../store';

export default function ContextMenu() {
  const contextMenu = useStore((s) => s.contextMenu);
  const setContextMenu = useStore((s) => s.setContextMenu);
  const openModal = useStore((s) => s.openModal);

  if (!contextMenu) return null;

  const close = () => setContextMenu(null);
  const { path, type } = contextMenu;

  const newItem = (t: 'file' | 'dir') => {
    const parent = type === 'dir' ? path : path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
    openModal({
      title: `New ${t === 'file' ? 'File' : 'Folder'}${parent ? ` in ${parent}/` : ' (repo root)'}`,
      placeholder: t === 'file' ? 'name.ts' : 'folder-name',
      initial: '',
      onSubmit: (v) => void useStore.getState().createEntry(parent, v, t),
    });
  };

  const rename = () => {
    openModal({
      title: `Rename ${path.split('/').pop()}`,
      placeholder: path.split('/').pop() || '',
      initial: path.split('/').pop() || '',
      onSubmit: (v) => void useStore.getState().renameEntry(path, v),
    });
  };

  const del = () => {
    if (window.confirm(`Delete "${path}"?`)) void useStore.getState().deleteEntry(path);
  };

  const itemCls = 'px-4 py-1.5 text-xs text-vsc-text hover:bg-vsc-accent cursor-pointer whitespace-nowrap';

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={close} onContextMenu={(e) => { e.preventDefault(); close(); }} />
      <div className="fixed z-50 bg-vsc-sidebar border border-vsc-border rounded shadow-lg py-1 min-w-[180px]" style={{ left: contextMenu.x, top: contextMenu.y }}>
        {type === 'dir' && (
          <>
            <div className={itemCls} onClick={() => { newItem('file'); close(); }}>
              New File…
            </div>
            <div className={itemCls} onClick={() => { newItem('dir'); close(); }}>
              New Folder…
            </div>
            <div className="h-px bg-vsc-border my-1" />
          </>
        )}
        <div className={itemCls} onClick={() => { rename(); close(); }}>
          Rename…
        </div>
        <div className={`${itemCls} hover:!bg-red-600`} onClick={() => { del(); close(); }}>
          Delete
        </div>
      </div>
    </>
  );
}
