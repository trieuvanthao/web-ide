import { create } from 'zustand';
import { api } from './api';
import type { FileMeta, GitStatus, ModalState, TreeNode } from './types';

export interface Tab {
  path: string;
  dirty: boolean;
}

interface Toast {
  id: number;
  msg: string;
  type: 'info' | 'error' | 'success';
}

let toastId = 0;

interface Store {
  authed: boolean | null;
  repos: string[];
  repo: string | null;
  tree: TreeNode[];
  treeLoading: boolean;
  view: 'repos' | 'explorer' | 'git';
  tabs: Tab[];
  active: string | null;
  contents: Record<string, string>;
  metas: Record<string, FileMeta>;
  expanded: Set<string>;
  token: string | null;
  gitStatus: GitStatus | null;
  branches: { current: string; all: string[] } | null;
  autoSave: boolean;
  toasts: Toast[];
  contextMenu: { x: number; y: number; path: string; type: 'file' | 'dir' } | null;
  modal: ModalState | null;
  busy: boolean;

  setAuthed: (v: boolean) => void;
  setView: (v: Store['view']) => void;
  setToken: (t: string | null) => void;
  toggleAutoSave: () => void;
  toast: (msg: string, type?: Toast['type']) => void;
  dismissToast: (id: number) => void;
  setContextMenu: (m: Store['contextMenu']) => void;
  openModal: (m: ModalState) => void;
  closeModal: () => void;

  init: () => Promise<void>;
  logout: () => Promise<void>;
  loadRepos: () => Promise<void>;
  openRepo: (name: string) => Promise<void>;
  closeRepo: () => void;
  clone: (url: string, token: string, name: string) => Promise<void>;
  deleteRepo: (name: string) => Promise<void>;
  refreshTree: () => Promise<void>;
  toggleExpanded: (path: string) => void;

  openFile: (path: string) => Promise<void>;
  closeTab: (path: string) => void;
  setActive: (path: string) => void;
  updateContent: (path: string, content: string) => void;
  saveFile: (path?: string) => Promise<void>;
  createEntry: (parent: string, name: string, type: 'file' | 'dir') => Promise<void>;
  renameEntry: (path: string, newName: string) => Promise<void>;
  deleteEntry: (path: string) => Promise<void>;

  refreshGit: () => Promise<void>;
  commit: (message: string) => Promise<void>;
  push: () => Promise<void>;
  pull: () => Promise<void>;
  switchBranch: (branch: string) => Promise<void>;
}

export const useStore = create<Store>((set, get) => ({
  authed: null,
  repos: [],
  repo: null,
  tree: [],
  treeLoading: false,
  view: 'repos',
  tabs: [],
  active: null,
  contents: {},
  metas: {},
  expanded: new Set(),
  token: null,
  gitStatus: null,
  branches: null,
  autoSave: false,
  toasts: [],
  contextMenu: null,
  modal: null,
  busy: false,

  setAuthed: (v) => set({ authed: v }),
  setView: (v) => set({ view: v }),
  setToken: (t) => set({ token: t }),
  toggleAutoSave: () => set((s) => ({ autoSave: !s.autoSave })),

  toast: (msg, type = 'info') => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts, { id, msg, type }] }));
    setTimeout(() => get().dismissToast(id), 5000);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setContextMenu: (m) => set({ contextMenu: m }),
  openModal: (m) => set({ modal: m }),
  closeModal: () => set({ modal: null }),

  init: async () => {
    try {
      const r = await api.me();
      if (r.auth) {
        set({ authed: true });
        await get().loadRepos();
      } else {
        set({ authed: false });
      }
    } catch {
      set({ authed: false });
    }
  },

  logout: async () => {
    await api.logout().catch(() => {});
    set({
      authed: false,
      repos: [],
      repo: null,
      tree: [],
      tabs: [],
      active: null,
      contents: {},
      metas: {},
      gitStatus: null,
      branches: null,
      view: 'repos',
    });
  },

  loadRepos: async () => {
    try {
      const r = await api.repos();
      set({ repos: r.repos });
    } catch (e: any) {
      get().toast(e.message, 'error');
    }
  },

  openRepo: async (name) => {
    set({ repo: name, tree: [], treeLoading: true, view: 'explorer', tabs: [], active: null, contents: {}, metas: {}, gitStatus: null, branches: null });
    await get().refreshTree();
    await get().refreshGit();
    set((s) => {
      const expanded = new Set<string>();
      for (const n of s.tree) {
        if (n.type === 'dir') expanded.add(n.path);
      }
      return { expanded };
    });
  },

  closeRepo: () => set({ repo: null, tree: [], tabs: [], active: null, contents: {}, metas: {}, gitStatus: null, branches: null, view: 'repos' }),

  clone: async (url, token, name) => {
    set({ busy: true });
    try {
      const r = await api.clone(url, token, name);
      get().toast(`Cloned ${r.repo}`, 'success');
      await get().loadRepos();
      await get().openRepo(r.repo);
    } catch (e: any) {
      get().toast(e.message, 'error');
    } finally {
      set({ busy: false });
    }
  },

  deleteRepo: async (name) => {
    try {
      await api.deleteRepo(name);
      get().toast(`Deleted ${name}`, 'success');
      if (get().repo === name) get().closeRepo();
      await get().loadRepos();
    } catch (e: any) {
      get().toast(e.message, 'error');
    }
  },

  refreshTree: async () => {
    const repo = get().repo;
    if (!repo) return;
    set({ treeLoading: true });
    try {
      const r = await api.tree(repo);
      set({ tree: r.tree });
    } catch (e: any) {
      get().toast(e.message, 'error');
      set({ tree: [] });
    } finally {
      set({ treeLoading: false });
    }
  },

  toggleExpanded: (path) =>
    set((s) => {
      const expanded = new Set(s.expanded);
      if (expanded.has(path)) expanded.delete(path);
      else expanded.add(path);
      return { expanded };
    }),

  openFile: async (path) => {
    const { repo, tabs, active } = get();
    if (!repo) return;
    if (tabs.some((t) => t.path === path)) {
      set({ active: path });
      return;
    }
    try {
      const r = await api.file(repo, path);
      if (r.tooLarge) {
        set((s) => ({ metas: { ...s.metas, [path]: { binary: false, tooLarge: true } }, tabs: [...s.tabs, { path, dirty: false }], active: path }));
        return;
      }
      if (r.binary) {
        set((s) => ({ metas: { ...s.metas, [path]: { binary: true, base64: r.base64 } }, tabs: [...s.tabs, { path, dirty: false }], active: path }));
        return;
      }
      set((s) => ({
        contents: { ...s.contents, [path]: r.content },
        tabs: [...s.tabs, { path, dirty: false }],
        active: path,
      }));
    } catch (e: any) {
      get().toast(e.message, 'error');
    }
  },

  closeTab: (path) =>
    set((s) => {
      const idx = s.tabs.findIndex((t) => t.path === path);
      const tabs = s.tabs.filter((t) => t.path !== path);
      let active = s.active;
      if (s.active === path) {
        active = tabs[Math.min(idx, tabs.length - 1)]?.path ?? null;
      }
      const contents = { ...s.contents };
      delete contents[path];
      const metas = { ...s.metas };
      delete metas[path];
      return { tabs, active, contents, metas };
    }),

  setActive: (path) => set({ active: path }),

  updateContent: (path, content) =>
    set((s) => ({
      contents: { ...s.contents, [path]: content },
      tabs: s.tabs.map((t) => (t.path === path ? { ...t, dirty: true } : t)),
    })),

  saveFile: async (path) => {
    const { repo, active, contents } = get();
    const p = path || active;
    if (!repo || !p) return;
    const content = contents[p];
    if (content === undefined) return;
    try {
      await api.saveFile(repo, p, content);
      set((s) => ({ tabs: s.tabs.map((t) => (t.path === p ? { ...t, dirty: false } : t)) }));
      await get().refreshGit();
    } catch (e: any) {
      get().toast(e.message, 'error');
    }
  },

  createEntry: async (parent, name, type) => {
    const { repo } = get();
    if (!repo || !name.trim()) return;
    const clean = name.trim().replace(/^\/+|\/+$/g, '');
    const path = parent ? `${parent}/${clean}` : clean;
    try {
      await api.createFile(repo, path, type);
      await get().refreshTree();
      if (type === 'file') await get().openFile(path);
      else set((s) => ({ expanded: new Set(s.expanded).add(parent || clean) }));
      get().toast(`Created ${path}`, 'success');
    } catch (e: any) {
      get().toast(e.message, 'error');
    }
  },

  renameEntry: async (path, newName) => {
    const { repo } = get();
    if (!repo || !newName.trim() || newName.trim() === path.split('/').pop()) return;
    const parent = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
    const newPath = parent ? `${parent}/${newName.trim()}` : newName.trim();
    try {
      await api.renameFile(repo, path, newPath);
      set((s) => {
        const remap = (p: string) => (p === path ? newPath : p.startsWith(path + '/') ? newPath + p.slice(path.length) : p);
        const contents: Record<string, string> = {};
        for (const [k, v] of Object.entries(s.contents)) contents[remap(k)] = v;
        const metas: Record<string, FileMeta> = {};
        for (const [k, v] of Object.entries(s.metas)) metas[remap(k)] = v;
        return {
          tabs: s.tabs.map((t) => ({ ...t, path: remap(t.path), dirty: t.dirty })),
          active: s.active ? remap(s.active) : null,
          contents,
          metas,
        };
      });
      await get().refreshTree();
      await get().refreshGit();
    } catch (e: any) {
      get().toast(e.message, 'error');
    }
  },

  deleteEntry: async (path) => {
    const { repo } = get();
    if (!repo) return;
    try {
      await api.deleteFile(repo, path);
      set((s) => {
        const affected = (p: string) => p === path || p.startsWith(path + '/');
        const closedIdx = s.tabs.findIndex((t) => t.path === s.active);
        const tabs = s.tabs.filter((t) => !affected(t.path));
        let active = s.active;
        if (s.active && affected(s.active)) {
          active = tabs.length ? tabs[Math.min(closedIdx, tabs.length - 1)].path : null;
        }
        const contents: Record<string, string> = {};
        for (const [k, v] of Object.entries(s.contents)) if (!affected(k)) contents[k] = v;
        const metas: Record<string, FileMeta> = {};
        for (const [k, v] of Object.entries(s.metas)) if (!affected(k)) metas[k] = v;
        return { tabs, active, contents, metas };
      });
      await get().refreshTree();
      await get().refreshGit();
      get().toast(`Deleted ${path}`, 'success');
    } catch (e: any) {
      get().toast(e.message, 'error');
    }
  },

  refreshGit: async () => {
    const repo = get().repo;
    if (!repo) return;
    try {
      const [status, branches] = await Promise.all([api.gitStatus(repo), api.branches(repo)]);
      set({ gitStatus: status, branches });
    } catch {
      set({ gitStatus: null, branches: null });
    }
  },

  commit: async (message) => {
    const { repo } = get();
    if (!repo) return;
    set({ busy: true });
    try {
      await api.commit(repo, message);
      get().toast('Committed', 'success');
      await get().refreshGit();
    } catch (e: any) {
      get().toast(e.message, 'error');
    } finally {
      set({ busy: false });
    }
  },

  push: async () => {
    const { repo, token } = get();
    if (!repo) return;
    if (!token) {
      get().toast('Enter a GitHub token in the Git panel first', 'error');
      return;
    }
    set({ busy: true });
    try {
      const r = await api.push(repo, token);
      get().toast(`Pushed to ${r.branch}`, 'success');
      await get().refreshGit();
    } catch (e: any) {
      get().toast(e.message, 'error');
    } finally {
      set({ busy: false });
    }
  },

  pull: async () => {
    const { repo, token } = get();
    if (!repo) return;
    if (!token) {
      get().toast('Enter a GitHub token in the Git panel first', 'error');
      return;
    }
    set({ busy: true });
    try {
      const r = await api.pull(repo, token);
      get().toast(r.files > 0 ? `Pulled ${r.files} file(s)` : 'Already up to date', 'success');
      set({ tabs: [], active: null, contents: {}, metas: {} });
      await get().refreshTree();
      await get().refreshGit();
    } catch (e: any) {
      get().toast(e.message, 'error');
    } finally {
      set({ busy: false });
    }
  },

  switchBranch: async (branch) => {
    const { repo } = get();
    if (!repo) return;
    set({ busy: true });
    try {
      await api.checkout(repo, branch);
      get().toast(`Switched to ${branch}`, 'success');
      set({ tabs: [], active: null, contents: {}, metas: {} });
      await get().refreshTree();
      await get().refreshGit();
    } catch (e: any) {
      get().toast(e.message, 'error');
    } finally {
      set({ busy: false });
    }
  },
}));
