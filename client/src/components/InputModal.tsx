import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';

export default function InputModal() {
  const modal = useStore((s) => s.modal);
  const closeModal = useStore((s) => s.closeModal);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (modal) {
      setValue(modal.initial);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [modal]);

  if (!modal) return null;

  const submit = () => {
    if (value.trim()) {
      modal.onSubmit(value.trim());
    }
    closeModal();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-24" onClick={closeModal}>
      <div className="bg-vsc-sidebar border border-vsc-border rounded shadow-xl w-[420px] p-4 flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm text-vsc-text">{modal.title}</h3>
        <input
          ref={inputRef}
          value={value}
          placeholder={modal.placeholder}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
            if (e.key === 'Escape') closeModal();
          }}
          className="bg-vsc-bg border border-vsc-border rounded px-3 py-2 text-sm text-vsc-text outline-none focus:border-vsc-accent"
        />
        <div className="flex justify-end gap-2">
          <button onClick={closeModal} className="px-3 py-1.5 text-xs text-vsc-dim hover:text-vsc-text">
            Cancel
          </button>
          <button onClick={submit} className="px-3 py-1.5 text-xs bg-vsc-accent hover:bg-vsc-accent-hover text-white rounded">
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
