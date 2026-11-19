import { useState } from 'react';
import { api } from '../api';
import { useStore } from '../store';

export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuthed = useStore((s) => s.setAuthed);
  const loadRepos = useStore((s) => s.loadRepos);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || loading) return;
    setLoading(true);
    setError('');
    try {
      await api.login(password);
      setAuthed(true);
      await loadRepos();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-vsc-bg">
      <form onSubmit={submit} className="w-80 bg-vsc-sidebar border border-vsc-border rounded p-6 flex flex-col gap-4">
        <h1 className="text-lg font-semibold text-vsc-text">Web IDE</h1>
        <p className="text-xs text-vsc-dim">Enter the server password to continue</p>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="bg-vsc-bg border border-vsc-border rounded px-3 py-2 text-sm text-vsc-text outline-none focus:border-vsc-accent"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-vsc-accent hover:bg-vsc-accent-hover disabled:opacity-50 text-white text-sm rounded py-2"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
