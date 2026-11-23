export function ChevronRight({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.2" fill="none" />
    </svg>
  );
}

export function ChevronDown({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.2" fill="none" />
    </svg>
  );
}

export function FolderIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M1.5 3.5h4l1.5 1.5h7.5v7.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-9z" fill="none" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

export function FileIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M4 1.5h5L12.5 5v9.5h-9v-13z" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <path d="M9 1.5V5h3.5" fill="none" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

export function RepoIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M2 2.5h9.5a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1z" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <path d="M5 1.5v10" stroke="currentColor" strokeWidth="1.1" fill="none" />
      <path d="M5 11.5h7" stroke="currentColor" strokeWidth="1.1" fill="none" />
    </svg>
  );
}

export function GitBranchIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <circle cx="4" cy="3.5" r="1.6" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="4" cy="12.5" r="1.6" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="12" cy="5.5" r="1.6" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <path d="M4 5.1v5.8M12 7.1c0 2.5-2.5 3-5.5 3" fill="none" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

export function PlusFileIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M9 1.5H4.5v13h7V4L9 1.5z" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <path d="M8 6v4M6 8h4" stroke="currentColor" strokeWidth="1.2" fill="none" />
    </svg>
  );
}

export function PlusFolderIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M1.5 3.5h4l1.5 1.5h7.5v7.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-9z" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <path d="M8 7v4M6 9h4" stroke="currentColor" strokeWidth="1.2" fill="none" />
    </svg>
  );
}

export function RefreshIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M13 8a5 5 0 1 1-1.5-3.6M13 2v3h-3" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function TrashIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M3 4h10M6.5 4V2.5h3V4M4.5 4l.5 9.5h6L11.5 4M6.8 6.5v5M9.2 6.5v5" fill="none" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

export function CloseIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.2" fill="none" />
    </svg>
  );
}

export function ExplorerIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 16 16" fill="currentColor">
      <path d="M1.5 2.5h4l1.5 1.5h7.5v8.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-10z" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

export function SourceControlIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 16 16" fill="currentColor">
      <circle cx="4" cy="3.5" r="1.6" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="4" cy="12.5" r="1.6" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="12" cy="5.5" r="1.6" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M4 5.1v5.8M12 7.1c0 2.5-2.5 3-5.5 3" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

export function CloudIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M4.5 12.5a3 3 0 0 1-.4-5.97 4 4 0 0 1 7.8-.7 2.8 2.8 0 0 1-.4 5.67h-7z" fill="none" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

export function UploadIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 11V3M5 6l3-3 3 3M3 13h10" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function DownloadIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 3v8M5 8l3 3 3-3M3 13h10" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function SaveIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M2.5 2.5h8L13.5 5.5v8h-11v-11z" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <path d="M5 2.5V6h5V2.5M5 13.5V9.5h6v4" fill="none" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

const extColors: Record<string, string> = {
  ts: '#519aba',
  tsx: '#519aba',
  js: '#cbcb41',
  jsx: '#cbcb41',
  mjs: '#cbcb41',
  cjs: '#cbcb41',
  json: '#cbcb41',
  css: '#519aba',
  scss: '#f55385',
  less: '#519aba',
  html: '#e37933',
  htm: '#e37933',
  vue: '#41b883',
  svelte: '#f96e5b',
  md: '#519aba',
  mdx: '#519aba',
  py: '#3572a5',
  rb: '#701516',
  go: '#00add8',
  rs: '#dea584',
  java: '#b07219',
  kt: '#a971ff',
  cs: '#178600',
  php: '#4f5d95',
  c: '#555555',
  h: '#555555',
  cpp: '#f34b7d',
  hpp: '#f34b7d',
  swift: '#f05138',
  sh: '#89e051',
  bat: '#c1f12e',
  yml: '#cb171e',
  yaml: '#cb171e',
  xml: '#e37933',
  svg: '#ffb13b',
  sql: '#dad8d8',
  png: '#a074c4',
  jpg: '#a074c4',
  jpeg: '#a074c4',
  gif: '#a074c4',
  webp: '#a074c4',
  ico: '#a074c4',
  lock: '#8a8a8a',
  env: '#ecd53f',
  txt: '#cccccc',
  gitignore: '#f14e32',
};

export function iconColorFor(fileName: string): string {
  if (fileName.startsWith('.env')) return extColors['env'];
  const lower = fileName.toLowerCase();
  if (lower === '.gitignore' || lower === '.gitattributes') return extColors['gitignore'];
  const ext = lower.includes('.') ? lower.slice(lower.lastIndexOf('.') + 1) : '';
  return extColors[ext] || '#8a8a8a';
}

export const imageExts = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'bmp']);
