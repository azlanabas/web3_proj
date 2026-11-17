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
  fn?: string;
  args?: string;
  action?: string;
  run?: () => void;
}

export function Walkthrough({ meta }: { meta: Meta | null }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [selected, setSelected] = useState<Escrow | null>(null);
  const [events, setEvents] = useState<ChainEvent[]>([]);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [before, setBefore] = useState<Receipt["balances"] | null>(null);
  const [call, setCall] = useState<{ fn: string; args: string; to: string; data: string; from: string } | null>(null);
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
    const next = await api.receipt(id);
    setSelected(detail.escrow);
    setEvents(detail.events);
    setBefore((prev) => (receipt ? receipt.balances : prev));
    setReceipt(next);
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
    ? { n: 2, role: "buyer", title: "Fund the escrow", body: "The buyer approves the escrow contract to spend the USDC, then calls fund() with the escrow id. The contract pulls the funds from the buyer.", label: "send fund()", fn: "fund", args: `[${selected.onchainId}]`, action: "fund", run: () => act("fund") }
    : status === "FUNDED"
    ? { n: 3, role: "seller", title: "Mark shipped", body: "The seller calls markShipped(). The contract records the timestamp and starts the 14-day release window.", label: "send markShipped()", fn: "markShipped", args: `[${selected.onchainId}]`, action: "ship", run: () => act("ship") }
    : status === "SHIPPED"
    ? { n: 4, role: "buyer", title: "Confirm delivery", body: "The buyer calls confirmDelivery(). The contract transfers the escrowed USDC to the seller and moves the escrow to a terminal state.", label: "send confirmDelivery()", fn: "confirmDelivery", args: `[${selected.onchainId}]`, action: "confirm", run: () => act("confirm") }
    : status === "DISPUTED"
    ? { n: 5, role: "arbiter", title: "Arbiter resolves the dispute", body: "The arbiter pays the seller or refunds the buyer, and only from this state.", label: null }
    : { n: 5, role: "buyer", title: "Escrow complete", body: `Final state ${status}. The seller holds the funds and the contract balance is zero.`, label: null };

  useEffect(() => {
    if (selected && turn.action) {
      api
        .prepareAction(selected.id, turn.action)
        .then((p) => setCall({ fn: turn.fn ?? "", args: turn.args ?? "[]", to: p.to, data: p.data, from: p.from }))
        .catch(() => setCall(null));
    } else {
      setCall(null);
    }
  }, [selected, turn.action, turn.fn, turn.args]);

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
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-ink">{turn.title}</p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-faint">{turn.role}</p>
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-muted">{turn.body}</p>
          {call && (
            <div className="mt-3 rounded border border-line bg-paper px-3 py-2 font-mono text-[11px] leading-relaxed">
              <p className="text-accent">{call.fn}({turn.args?.replace(/[[\]]/g, "")})</p>
              <p className="text-faint">to {call.to}</p>
              <p className="break-all text-faint">calldata {call.data.slice(0, 74)}…</p>
            </div>
          )}
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

        {/* what the last transaction did */}
        {receipt?.txHash && (() => {
          const usdc = (v: string) => (Number(v) / 1e6).toLocaleString("en-US", { maximumFractionDigits: 0 });
          const delta = (k: keyof Receipt["balances"]) =>
            before ? Number(receipt.balances[k]) - Number(before[k]) : 0;
          const call =
            receipt.event === "Funded" ? "fund(escrowId)" :
            receipt.event === "Shipped" ? "markShipped(escrowId)" :
            receipt.event === "Released" ? "confirmDelivery(escrowId)" :
            receipt.event === "Refunded" ? "refund(escrowId)" :
            receipt.event === "Disputed" ? "dispute(escrowId)" : "createEscrow(...)";
          const transition: Record<string, string> = {
            EscrowCreated: "— → CREATED",
            Funded: "CREATED → FUNDED",
            Shipped: "FUNDED → SHIPPED",
            Disputed: "SHIPPED → DISPUTED",
            Released: selected?.status === "DISPUTED" ? "DISPUTED → RELEASED" : "SHIPPED → RELEASED",
            Refunded: "DISPUTED → REFUNDED",
            Cancelled: "CREATED → CANCELLED",
          };
          const moved = Math.abs(delta("escrow"));
          const direction = delta("escrow") > 0 ? "into the contract" : delta("escrow") < 0 ? "out of the contract" : "no movement";
          const boxes: [string, keyof Receipt["balances"], string][] = [
            ["Buyer wallet", "buyer", receipt.buyer ? `${receipt.buyer.slice(0, 6)}…${receipt.buyer.slice(-4)}` : "—"],
            ["Escrow contract", "escrow", meta ? `${meta.chain.escrow.slice(0, 6)}…${meta.chain.escrow.slice(-4)}` : "—"],
            ["Seller wallet", "seller", receipt.seller ? `${receipt.seller.slice(0, 6)}…${receipt.seller.slice(-4)}` : "—"],
          ];
          return (
            <div className="border-t border-line px-4 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-mono text-[10px] uppercase tracking-wider text-faint">
                  what just happened
                </p>
                <a href={`https://sepolia.etherscan.io/tx/${receipt.txHash}`} target="_blank" rel="noreferrer"
                   className="font-mono text-[10px] text-faint underline-offset-4 hover:text-accent hover:underline">
                  view transaction ↗
                </a>
              </div>

              <p className="mt-2 text-[13px] text-ink">
                <span className="font-mono text-accent">{call}</span>{" "}
                {moved > 0 ? `moved ${usdc(String(moved))} USDC ${direction}` : "recorded a state change"}.
              </p>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {boxes.map(([label, key, addr]) => {
                  const d = delta(key);
                  return (
                    <div key={key} className="rounded border border-line px-3 py-2">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-faint">{label}</p>
                      <p className="mt-0.5 font-mono text-[14px] text-ink">{usdc(receipt.balances[key])}</p>
                      <p className={"font-mono text-[10px] " + (d > 0 ? "text-good" : d < 0 ? "text-danger" : "text-faint")}>
                        {d === 0 ? "unchanged" : `${d > 0 ? "+" : "−"}${usdc(String(Math.abs(d)))}`}
                      </p>
                      <p className="mt-0.5 font-mono text-[9px] text-faint">{addr}</p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 grid gap-1 border-t border-line pt-2 font-mono text-[11px]">
                <p className="text-muted">
                  <span className="text-faint">log </span>
                  <span className="text-accent">{receipt.event}(escrowId={selected?.onchainId})</span>
                </p>
                <p className="text-muted">
                  <span className="text-faint">state </span>
                  {transition[receipt.event ?? ""] ?? "unchanged"}
                </p>
              </div>

              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11px] text-muted">
                <span><span className="text-faint">block </span>{receipt.tx?.block ?? receipt.block}</span>
                <span><span className="text-faint">gas </span>{receipt.tx?.gasUsed}</span>
                <span><span className="text-faint">from </span>{receipt.tx?.from.slice(0, 10)}…</span>
                <span><span className="text-faint">to </span>{receipt.tx?.to.slice(0, 10)}…</span>
                <span className="text-good">success</span>
              </div>
            </div>
          );
        })()}
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
