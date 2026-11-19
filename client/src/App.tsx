import { useEffect } from 'react';
import { useStore } from './store';
import Login from './components/Login';
import ActivityBar from './components/ActivityBar';
import Explorer from './components/Explorer';
import ReposScreen from './components/ReposScreen';
import GitPanel from './components/GitPanel';
import Tabs from './components/Tabs';
import EditorPane from './components/EditorPane';
import StatusBar from './components/StatusBar';
import ContextMenu from './components/ContextMenu';
import InputModal from './components/InputModal';
import Toasts from './components/Toasts';

export default function App() {
  const authed = useStore((s) => s.authed);
  const init = useStore((s) => s.init);
  const view = useStore((s) => s.view);
  const repo = useStore((s) => s.repo);
  const saveFile = useStore((s) => s.saveFile);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void saveFile();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [saveFile]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const { tabs, gitStatus } = useStore.getState();
      const dirty = tabs.some((t) => t.dirty);
      const unpushed =
        gitStatus && (gitStatus.created.length || gitStatus.modified.length || gitStatus.deleted.length || gitStatus.renamed.length) > 0;
      if (dirty || unpushed) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  if (authed === null) {
    return <div className="h-screen flex items-center justify-center text-vsc-dim text-sm">Loading…</div>;
  }

  if (!authed) return <Login />;

  return (
    <div className="h-screen flex flex-col bg-vsc-bg text-vsc-text">
      <div className="flex flex-1 min-h-0">
        <ActivityBar />
        <aside className="w-64 bg-vsc-sidebar border-r border-vsc-border shrink-0 overflow-y-auto">
          {view === 'repos' && <ReposScreen />}
          {view === 'explorer' && (repo ? <Explorer /> : <EmptySidebar />)}
          {view === 'git' && (repo ? <GitPanel /> : <EmptySidebar />)}
        </aside>
        <main className="flex flex-col flex-1 min-w-0">
          <Tabs />
          <EditorPane />
        </main>
      </div>
      <StatusBar />
      <ContextMenu />
      <InputModal />
      <Toasts />
    </div>
  );
}

function EmptySidebar() {
  return <p className="text-xs text-vsc-dim p-3">Open a repository first (Repositories panel)</p>;
}
