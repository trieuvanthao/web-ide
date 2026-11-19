import Editor from '@monaco-editor/react';
import { useEffect } from 'react';
import { useStore } from '../store';
import { imageExts } from './Icons';

const langMap: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  json: 'json',
  css: 'css',
  scss: 'scss',
  less: 'less',
  html: 'html',
  htm: 'html',
  vue: 'html',
  md: 'markdown',
  mdx: 'markdown',
  py: 'python',
  rb: 'ruby',
  go: 'go',
  rs: 'rust',
  java: 'java',
  kt: 'kotlin',
  cs: 'csharp',
  php: 'php',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  hpp: 'cpp',
  swift: 'swift',
  sh: 'shell',
  bash: 'shell',
  bat: 'bat',
  ps1: 'powershell',
  yml: 'yaml',
  yaml: 'yaml',
  xml: 'xml',
  svg: 'xml',
  sql: 'sql',
  txt: 'plaintext',
  dockerfile: 'dockerfile',
};

function langFor(path: string): string {
  const base = path.split('/').pop()?.toLowerCase() || '';
  if (base === 'dockerfile') return 'dockerfile';
  const ext = base.includes('.') ? base.slice(base.lastIndexOf('.') + 1) : '';
  return langMap[ext] || 'plaintext';
}

export default function EditorPane() {
  const repo = useStore((s) => s.repo);
  const active = useStore((s) => s.active);
  const content = useStore((s) => (s.active ? s.contents[s.active] : undefined));
  const meta = useStore((s) => (s.active ? s.metas[s.active] : undefined));
  const updateContent = useStore((s) => s.updateContent);
  const autoSave = useStore((s) => s.autoSave);
  const dirty = useStore((s) => s.tabs.find((t) => t.path === s.active)?.dirty ?? false);
  const saveFile = useStore((s) => s.saveFile);

  useEffect(() => {
    if (!autoSave || !active || !dirty) return;
    const t = setTimeout(() => void saveFile(active), 1000);
    return () => clearTimeout(t);
  }, [autoSave, active, dirty, content, saveFile]);

  if (!repo) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-vsc-dim gap-2">
        <p className="text-4xl font-light">Web IDE</p>
        <p className="text-sm">Clone or select a repository from the left panel</p>
      </div>
    );
  }

  if (!active) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-vsc-dim gap-1">
        <p className="text-sm">Select a file to start editing</p>
        <p className="text-xs">Ctrl+S to save · Right-click files for actions</p>
      </div>
    );
  }

  if (meta?.tooLarge) {
    return <div className="flex-1 flex items-center justify-center text-vsc-dim text-sm">File is too large to edit (&gt; 8 MB)</div>;
  }

  if (meta?.binary) {
    const ext = active.split('.').pop()?.toLowerCase() || '';
    if (imageExts.has(ext) && meta.base64) {
      const mime = ext === 'jpg' ? 'jpeg' : ext;
      return (
        <div className="flex-1 flex items-center justify-center overflow-auto p-4">
          <img src={`data:image/${mime};base64,${meta.base64}`} alt={active} className="max-w-full max-h-full object-contain" />
        </div>
      );
    }
    return <div className="flex-1 flex items-center justify-center text-vsc-dim text-sm">Binary file — cannot edit</div>;
  }

  return (
    <div className="flex-1 min-h-0">
      <Editor
        path={active}
        language={langFor(active)}
        theme="vscode-dark-plus"
        value={content ?? ''}
        onChange={(v) => updateContent(active, v ?? '')}
        options={{
          fontSize: 14,
          fontFamily: "'Consolas', 'SF Mono', 'Cascadia Code', monospace",
          fontLigatures: true,
          minimap: { enabled: true },
          automaticLayout: true,
          tabSize: 2,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          renderWhitespace: 'selection',
          bracketPairColorization: { enabled: true },
          guides: { bracketPairs: true },
        }}
      />
    </div>
  );
}
