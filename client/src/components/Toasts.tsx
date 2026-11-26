import { useStore } from '../store';

export default function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismissToast = useStore((s) => s.dismissToast);

  const color = (t: string) => (t === 'error' ? 'border-red-500' : t === 'success' ? 'border-green-500' : 'border-vsc-accent');

  return (
    <div className="fixed bottom-8 right-4 z-50 flex flex-col gap-2 max-w-md">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => dismissToast(t.id)}
          className={`bg-vsc-sidebar border-l-4 ${color(t.type)} border border-vsc-border rounded px-3 py-2 text-xs text-vsc-text shadow-lg cursor-pointer break-words whitespace-pre-wrap font-mono`}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}
