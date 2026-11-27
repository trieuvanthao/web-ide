import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useStore } from '../store';
import { CloseIcon, MaximizeIcon, MinimizeIcon, RefreshIcon, TerminalIcon, TrashIcon } from './Icons';

export default function TerminalPane() {
  const repo = useStore((s) => s.repo);
  const terminalHeight = useStore((s) => s.terminalHeight);
  const setTerminalHeight = useStore((s) => s.setTerminalHeight);
  const setTerminalOpen = useStore((s) => s.setTerminalOpen);

  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [isMaximized, setIsMaximized] = useState(false);
  const isDraggingRef = useRef(false);

  // Initialize terminal and WebSocket
  useEffect(() => {
    if (!containerRef.current) return;

    // Create xterm instance matching VS Code Dark+ theme
    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'bar',
      fontSize: 13,
      fontFamily: 'Consolas, "Courier New", monospace, "Segoe UI Mono"',
      lineHeight: 1.2,
      theme: {
        background: '#181818',
        foreground: '#cccccc',
        cursor: '#ffffff',
        cursorAccent: '#181818',
        selectionBackground: 'rgba(255, 255, 255, 0.2)',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#ffffff',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    try {
      fitAddon.fit();
    } catch {}

    // Connect WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/terminal?repo=${encodeURIComponent(repo || '')}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      try {
        fitAddon.fit();
        ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
      } catch {}
      term.focus();
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'data' && msg.data) {
          term.write(msg.data);
        } else if (msg.type === 'exit') {
          term.write(`\r\n\x1b[33m[Process exited with code ${msg.code}]\x1b[0m\r\n`);
          setStatus('disconnected');
        }
      } catch {
        term.write(event.data);
      }
    };

    ws.onclose = () => {
      setStatus('disconnected');
    };

    ws.onerror = () => {
      setStatus('disconnected');
    };

    // User input from xterm to WebSocket
    const onDataDisposable = term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data }));
      }
    });

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
        }
      } catch {}
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      onDataDisposable.dispose();
      resizeObserver.disconnect();
      try {
        ws.close();
      } catch {}
      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
      wsRef.current = null;
    };
  }, [repo]);

  // Handle reconnect
  const handleReconnect = () => {
    if (!termRef.current || !fitAddonRef.current) return;
    setStatus('connecting');
    termRef.current.clear();

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/terminal?repo=${encodeURIComponent(repo || '')}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      try {
        fitAddonRef.current?.fit();
        ws.send(JSON.stringify({ type: 'resize', cols: termRef.current?.cols, rows: termRef.current?.rows }));
      } catch {}
      termRef.current?.focus();
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'data' && msg.data) {
          termRef.current?.write(msg.data);
        } else if (msg.type === 'exit') {
          termRef.current?.write(`\r\n\x1b[33m[Process exited with code ${msg.code}]\x1b[0m\r\n`);
          setStatus('disconnected');
        }
      } catch {
        termRef.current?.write(event.data);
      }
    };

    ws.onclose = () => setStatus('disconnected');
    ws.onerror = () => setStatus('disconnected');
  };

  // Drag-to-resize handle
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    const startY = e.clientY;
    const startH = terminalHeight;

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaY = startY - ev.clientY;
      setTerminalHeight(startH + deltaY);
      try {
        fitAddonRef.current?.fit();
      } catch {}
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      try {
        fitAddonRef.current?.fit();
      } catch {}
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const statusColor =
    status === 'connected' ? 'bg-green-500' : status === 'connecting' ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div
      style={{ height: isMaximized ? '100%' : `${terminalHeight}px` }}
      className={`border-t border-vsc-border bg-[#181818] flex flex-col shrink-0 overflow-hidden ${
        isMaximized ? 'absolute inset-0 z-40' : 'relative'
      }`}
    >
      {/* Resizer Handle */}
      {!isMaximized && (
        <div
          onMouseDown={handleMouseDown}
          className="h-1.5 w-full cursor-row-resize bg-transparent hover:bg-vsc-accent transition-colors absolute top-0 left-0 z-10"
          title="Drag to resize terminal"
        />
      )}

      {/* Panel Header */}
      <div className="h-8 bg-vsc-sidebar border-b border-vsc-border flex items-center justify-between px-3 select-none text-xs text-vsc-dim shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-white font-medium">
            <TerminalIcon className="text-vsc-accent" />
            <span className="tracking-wide uppercase text-[11px]">Terminal</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]" title={`Status: ${status}`}>
            <span className={`w-2 h-2 rounded-full ${statusColor}`} />
            <span>{repo ? `${repo}` : 'Server Shell'}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-vsc-dim">
          <button
            onClick={() => termRef.current?.clear()}
            className="p-1 hover:text-white hover:bg-vsc-hover rounded"
            title="Clear Terminal"
          >
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleReconnect}
            className="p-1 hover:text-white hover:bg-vsc-hover rounded"
            title="Restart / Reconnect Terminal"
          >
            <RefreshIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setIsMaximized(!isMaximized);
              setTimeout(() => fitAddonRef.current?.fit(), 100);
            }}
            className="p-1 hover:text-white hover:bg-vsc-hover rounded"
            title={isMaximized ? 'Restore Terminal Size' : 'Maximize Terminal'}
          >
            {isMaximized ? <MinimizeIcon className="w-3.5 h-3.5" /> : <MaximizeIcon className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setTerminalOpen(false)}
            className="p-1 hover:text-white hover:bg-vsc-hover rounded"
            title="Close Terminal Panel (Ctrl+` to reopen)"
          >
            <CloseIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Body */}
      <div
        ref={containerRef}
        onClick={() => termRef.current?.focus()}
        className="flex-1 w-full p-2 overflow-hidden bg-[#181818]"
      />
    </div>
  );
}
