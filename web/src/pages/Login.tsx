import { useState } from "react";
import { signIn } from "../lib/auth";

export function Login({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const ok = await signIn(username, password);
      if (!ok) {
        setError("Invalid username or password.");
        return;
      }
      onSuccess();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(16,185,129,0.12),transparent)]" />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-emerald-500 font-mono text-lg font-bold text-slate-950">
            ◈
          </span>
          <h1 className="mt-5 font-mono text-lg tracking-tight text-white">web3_proj</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Vehicle escrow MVP — sign in to continue
          </p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur"
        >
          <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">
            Username
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-500/60"
              placeholder="username"
            />
          </label>

          <label className="mt-4 block text-xs font-medium uppercase tracking-wider text-slate-500">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-500/60"
              placeholder="••••"
            />
          </label>

          {error && (
            <p className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !username || !password}
            className="mt-5 w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Checking…" : "Enter"}
          </button>

        </form>

        <p className="mt-6 text-center font-mono text-[10px] leading-relaxed text-slate-700">
          Demo gate only — not access control.
          <br />
          Settlement simulated on a local EVM with test USDC.
        </p>
      </div>
    </div>
  );
}
