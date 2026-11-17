import { useCallback, useEffect, useState } from "react";
import { EscrowPanel } from "./components/EscrowPanel";
import { Layers } from "./components/Layers";
import { Requirements } from "./components/Requirements";
import { api } from "./lib/api";
import type { ChainEvent, Escrow, Listing } from "./types";

export default function App() {
  const [online, setOnline] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [selected, setSelected] = useState<Escrow | null>(null);
  const [events, setEvents] = useState<ChainEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadListings = useCallback(async () => {
    const data = await api.listings();
    setListings(data.items);
  }, []);

  const loadEscrows = useCallback(async (preferId?: string) => {
    const rows = await api.escrows();
    setEscrows(rows);
    const id = preferId ?? rows[0]?.id;
    if (!id) {
      setSelected(null);
      setEvents([]);
      return;
    }
    const detail = await api.detail(id);
    setSelected(detail.escrow);
    setEvents(detail.events);
  }, []);

  useEffect(() => {
    api.health().then(() => setOnline(true)).catch(() => setOnline(false));
    loadListings().catch(() => undefined);
    loadEscrows().catch(() => undefined);
  }, [loadListings, loadEscrows]);

  async function run(fn: () => Promise<void>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "request failed");
    } finally {
      setBusy(false);
    }
  }

  const login = () =>
    run(async () => {
      await api.demoLogin();
      setSignedIn(true);
      await loadListings();
      await loadEscrows();
    });

  const openEscrow = (listingId: string) =>
    run(async () => {
      const created = await api.createEscrow(listingId);
      await loadEscrows(created.id);
    });

  const act = (action: string) =>
    run(async () => {
      if (!selected) return;
      await api.act(selected.id, action);
      await loadEscrows(selected.id);
    });

  const select = (id: string) => run(async () => loadEscrows(id));

  const reset = () =>
    run(async () => {
      await api.reset();
      setSelected(null);
      setEvents([]);
      await loadEscrows();
    });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <header className="sticky top-0 z-10 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-emerald-500 font-mono text-sm font-bold text-slate-950">
              ◈
            </span>
            <span className="font-mono text-sm tracking-tight text-white">web3_proj</span>
          </div>
          <nav className="hidden gap-6 text-sm text-slate-400 md:flex">
            <a href="#how" className="hover:text-white">How it works</a>
            <a href="#demo" className="hover:text-white">Live demo</a>
            <a href="#requirements" className="hover:text-white">Requirements</a>
          </nav>
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-emerald-400" : "bg-rose-500"}`} />
            <span className="text-slate-500">{online ? "api online" : "api offline"}</span>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(16,185,129,0.12),transparent)]" />
        <div className="mx-auto max-w-6xl px-6 pb-16 pt-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-[11px] text-emerald-300">
            MVP · non-custodial escrow
          </span>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
            A vehicle marketplace where the money waits in a smart contract, not in our account.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-400">
            Buyer funds USDC into escrow. The seller ships. The buyer confirms, and the contract
            pays out. If delivery fails, an arbiter refunds. The platform never holds the funds —
            which is exactly what keeps it out of the money-transmission business.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#demo"
              className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
            >
              Run the escrow demo
            </a>
            <a
              href="#how"
              className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-500"
            >
              See the architecture
            </a>
          </div>
          <dl className="mt-14 grid grid-cols-2 gap-6 border-t border-slate-800/60 pt-8 sm:grid-cols-4">
            {[
              ["7", "escrow states"],
              ["23", "contract tests passing"],
              ["14d", "seller timeout protection"],
              ["1", "artefact the platform never owns"],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="font-mono text-2xl text-white">{value}</dt>
                <dd className="mt-1 text-xs text-slate-500">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <Layers />

      <EscrowPanel
        listings={listings}
        escrows={escrows}
        selected={selected}
        events={events}
        busy={busy}
        signedIn={signedIn}
        onLogin={login}
        onOpen={openEscrow}
        onSelect={select}
        onAct={act}
        onReset={reset}
      />

      <Requirements />

      {error && (
        <div className="fixed bottom-5 left-1/2 z-20 -translate-x-1/2 rounded-lg border border-rose-500/40 bg-rose-950/90 px-4 py-3 font-mono text-xs text-rose-200 shadow-xl">
          {error}
          <button onClick={() => setError(null)} className="ml-4 text-rose-400 hover:text-rose-200">
            dismiss
          </button>
        </div>
      )}

      <footer className="border-t border-slate-800/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono">web3_proj · AWS ap-southeast-1 · Sepolia 11155111</p>
          <p>
            Escrow settlement simulated. Contract:{" "}
            <span className="font-mono text-slate-400">VehicleEscrow.sol</span> · 23/23 tests
          </p>
        </div>
      </footer>
    </div>
  );
}
