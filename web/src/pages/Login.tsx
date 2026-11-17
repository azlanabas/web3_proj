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
    <div className="relative flex min-h-screen items-center justify-center bg-paper px-6">
      <div className="pointer-events-none absolute inset-0 bg-paper" />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-accent font-mono text-lg font-bold text-paper">
            ◈
          </span>
          <h1 className="mt-5 font-mono text-lg tracking-tight text-ink">web3_proj</h1>
          <p className="mt-1.5 text-sm text-muted">
            Vehicle escrow MVP — sign in to continue
          </p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-2xl border border-line bg-surface p-6 backdrop-blur"
        >
          <label className="block text-xs font-medium uppercase tracking-wider text-muted">
            Username
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none transition focus:border-accent/40"
              placeholder="username"
            />
          </label>

          <label className="mt-4 block text-xs font-medium uppercase tracking-wider text-muted">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none transition focus:border-accent/40"
              placeholder="••••"
            />
          </label>

          {error && (
            <p className="mt-4 rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-xs text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !username || !password}
            className="mt-5 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Checking…" : "Enter"}
          </button>

        </form>

        <p className="mt-6 text-center font-mono text-[10px] leading-relaxed text-faint">
          Access gate — not security.
          <br />
          Settlement on Ethereum Sepolia with test USDC.
        </p>
      </div>
    </div>
  );
}
