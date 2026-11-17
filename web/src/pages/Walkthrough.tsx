import { useCallback, useEffect, useState } from "react";
import { kickerFor } from "../nav";
import { api } from "../lib/api";
import { Page } from "../components/ui";
import type { ChainEvent, Escrow, Listing } from "../types";
import type { Meta } from "../lib/meta";

type Receipt = Awaited<ReturnType<typeof api.receipt>>;
type Role = "seller" | "buyer" | "arbiter";

interface Turn {
  n: number;
  role: Role;
  title: string;
  body: string;
  label: string | null;
  run?: () => void;
}

export function Walkthrough({ meta }: { meta: Meta | null }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [selected, setSelected] = useState<Escrow | null>(null);
  const [events, setEvents] = useState<ChainEvent[]>([]);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [started, setStarted] = useState(false);

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
      setReceipt(null);
      return;
    }
    const detail = await api.detail(id);
    setSelected(detail.escrow);
    setEvents(detail.events);
    setReceipt(await api.receipt(id));
  }, []);

  useEffect(() => {
    loadListings().catch(() => undefined);
    loadEscrows().catch(() => undefined);
  }, [loadListings, loadEscrows]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "request failed");
    } finally {
      setBusy(false);
    }
  };

  const start = () =>
    run(async () => {
      await api.startSession();
      setSignedIn(true);
      setStarted(true);
      await loadListings();
      await loadEscrows();
    });

  const open = (listingId: string) =>
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

  const reset = () =>
    run(async () => {
      await api.reset();
      setStarted(false);
      setSelected(null);
      setEvents([]);
      setReceipt(null);
      await loadListings();
      await loadEscrows();
    });

  const listing = listings[0];
  const vehicle = listing ? `${listing.year} ${listing.make} ${listing.model}` : "the vehicle";
  const status = selected?.status ?? null;

  const turn: Turn = !started
    ? { n: 1, role: "seller", title: "Start the session", body: "One session drives both parties, turn by turn. Start it to load the vehicle and open the escrow.", label: "start session", run: start }
    : !selected
    ? { n: 1, role: "seller", title: "Seller publishes the vehicle", body: `${vehicle} is listed with its price in USDC. Publishing commits nothing and moves no money.`, label: "seller reviewed the listing", run: () => open(listing.id) }
    : status === "CREATED"
    ? { n: 2, role: "buyer", title: "Buyer funds the escrow", body: `Escrow #${selected.onchainId} holds ${vehicle.toLowerCase()}. Funding deposits the USDC into the contract, not to the seller.`, label: "buyer funds the escrow", run: () => act("fund") }
    : status === "FUNDED"
    ? { n: 3, role: "seller", title: "Seller marks the vehicle shipped", body: "The money is locked in the contract, so dispatch is safe. This starts the 14-day timer.", label: "seller marks it shipped", run: () => act("ship") }
    : status === "SHIPPED"
    ? { n: 4, role: "buyer", title: "Buyer confirms delivery", body: "Confirmation releases the funds to the seller and closes the escrow. A dispute would send it to the arbiter instead.", label: "buyer confirms delivery", run: () => act("confirm") }
    : status === "DISPUTED"
    ? { n: 5, role: "arbiter", title: "Arbiter resolves the dispute", body: "The arbiter pays the seller or refunds the buyer, and only from this state.", label: null }
    : { n: 5, role: "buyer", title: "Escrow complete", body: `Final state ${status}. The seller holds the funds and the contract balance is zero.`, label: null };

  const usdc = (v: string) => (Number(v) / 1e6).toLocaleString("en-US", { maximumFractionDigits: 0 });

  return (
    <Page
      kicker={kickerFor("walkthrough")}
      title="Run an escrow"
      lede="One session, both parties, in order. Each turn names who acts, what it does, and then shows the transaction and where the money moved."
    >
      {/* session + vehicle, one strip */}
      <div className="rounded-lg border border-line">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
            turn {turn.n} of 5 · acting as {turn.role}
          </p>
          <div className="flex items-center gap-3">
            {escrows.length > 1 && (
              <select
                value={selected?.id ?? ""}
                onChange={(e) => loadEscrows(e.target.value).catch(() => undefined)}
                className="rounded border border-line bg-paper px-2 py-1 font-mono text-[11px] text-ink"
              >
                {escrows.map((e) => (
                  <option key={e.id} value={e.id}>escrow #{e.onchainId} · {e.status}</option>
                ))}
              </select>
            )}
            <button onClick={reset} className="font-mono text-[10px] uppercase tracking-wider text-faint hover:text-accent">
              start over
            </button>
          </div>
        </div>

        <div className="px-4 py-4">
          <p className="text-sm font-semibold text-ink">{turn.title}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted">{turn.body}</p>
          {turn.label && (
            <button
              onClick={() => turn.run?.()}
              disabled={busy}
              className="mt-3 rounded-md bg-accent px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-paper transition hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "submitting…" : turn.label}
            </button>
          )}
        </div>

        {/* the transaction this turn produced */}
        {receipt?.txHash && (
          <div className="border-t border-line px-4 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-mono text-[10px] uppercase tracking-wider text-faint">
                transaction · {receipt.event}
              </p>
              <a
                href={`https://sepolia.etherscan.io/tx/${receipt.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[11px] text-ink underline-offset-4 hover:text-accent hover:underline"
              >
                {receipt.txHash.slice(0, 18)}… ↗
              </a>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
              {[
                ["block", receipt.tx?.block ?? "—"],
                ["gas", receipt.tx?.gasUsed ?? "—"],
                ["from", receipt.tx ? `${receipt.tx.from.slice(0, 6)}…${receipt.tx.from.slice(-4)}` : "—"],
                ["status", "success"],
              ].map(([k, v]) => (
                <p key={k} className="font-mono text-[11px] text-muted">
                  <span className="text-faint">{k} </span>{v}
                </p>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-2">
              {[
                ["buyer", receipt.balances.buyer],
                ["escrow", receipt.balances.escrow],
                ["seller", receipt.balances.seller],
              ].map(([k, v]) => (
                <p key={k} className="font-mono text-[12px] text-ink">
                  <span className="text-faint">{k} </span>{usdc(v)} USDC
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* the escrow's history, same session */}
      {events.length > 0 && (
        <div className="rounded-lg border border-line">
          <p className="border-b border-line px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-faint">
            this escrow, oldest first
          </p>
          <div className="divide-y divide-line">
            {[...events].reverse().map((ev, i) => (
              <div key={ev.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-2">
                <span className="w-4 font-mono text-[10px] text-faint">{i + 1}</span>
                <span className="font-mono text-[11px] uppercase tracking-wider text-accent">{ev.eventName}</span>
                <span className="font-mono text-[10px] text-faint">block {ev.blockNumber.toString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-danger/40 bg-surface px-4 py-3 font-mono text-xs text-danger shadow-xl">
          {error}
          <button onClick={() => setError(null)} className="ml-4">dismiss</button>
        </div>
      )}
    </Page>
  );
}
