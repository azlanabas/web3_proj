import { useCallback, useEffect, useState } from "react";
import { kickerFor } from "../nav";
import { EscrowPanel } from "../components/EscrowPanel";
import { Card, List, Page } from "../components/ui";
import { api } from "../lib/api";
import type { ChainEvent, Escrow, Listing } from "../types";
import type { Meta } from "../lib/meta";

export function Walkthrough({ meta }: { meta: Meta | null }) {
  const [viewAs, setViewAs] = useState<"buyer" | "seller" | "arbiter">("buyer");
  const [sellerReviewed, setSellerReviewed] = useState(false);
  const [receipt, setReceipt] = useState<Awaited<ReturnType<typeof api.receipt>> | null>(null);
  const roleNote = {
    buyer: "The buyer funds the escrow, confirms delivery, or raises a dispute.",
    seller: "The seller marks the vehicle shipped once the escrow is funded.",
    arbiter: "The arbiter resolves a dispute by paying the seller or refunding the buyer.",
  }[viewAs];
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
    setReceipt(await api.receipt(id));
  }, []);

  useEffect(() => {
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
      await api.startSession();
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
    <>
      <Page
        kicker={kickerFor("walkthrough")}
        title="Live walkthrough"
        lede="The escrow lifecycle executed against the live API. Each action produces a transaction and a corresponding chain event."
      >
      {(() => {
        const status = selected?.status ?? null;
        const listing = listings[0];
        const vehicle = listing ? `${listing.year} ${listing.make} ${listing.model}` : "the vehicle";

        type Turn = { n: number; role: "seller" | "buyer"; title: string; body: string; label: string | null };
        const turns: Turn[] = [];
        if (!selected) {
          turns.push(
            sellerReviewed
              ? { n: 2, role: "buyer", title: "Buyer opens the escrow", body: "The buyer selects the vehicle and opens an escrow. This fixes the price on-chain and creates escrow #N.", label: "buyer opens the escrow" }
              : { n: 1, role: "seller", title: "Seller publishes the vehicle", body: `${vehicle} is listed with its price in USDC. Publishing commits nothing and moves no money.`, label: "seller reviewed the listing" },
          );
        } else if (status === "CREATED") {
          turns.push({ n: 2, role: "buyer", title: "Buyer funds the escrow", body: `${vehicle} is held in escrow #${selected.onchainId}. The buyer deposits the USDC into the contract, not to the seller.`, label: "buyer funds the escrow" });
        } else if (status === "FUNDED") {
          turns.push({ n: 3, role: "seller", title: "Seller marks the vehicle shipped", body: "The money is locked in the contract, so dispatch is safe. This starts the 14-day timer.", label: "seller marks it shipped" });
        } else if (status === "SHIPPED") {
          turns.push({ n: 4, role: "buyer", title: "Buyer confirms delivery", body: "Confirmation releases the funds to the seller and closes the escrow. A dispute would send it to the arbiter instead.", label: "buyer confirms delivery" });
        } else if (status === "DISPUTED") {
          turns.push({ n: 5, role: "seller", title: "Arbiter resolves the dispute", body: "The arbiter pays the seller or refunds the buyer. Switch the view to arbiter to act.", label: null });
        } else {
          turns.push({ n: 5, role: "buyer", title: "Escrow complete", body: `Final state ${status}. The seller holds the funds and the contract balance is zero.`, label: null });
        }

        const turn = turns[0];
        const total = 5;
        return (
          <div className="rounded-lg border border-line">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
                turn {turn.n} of {total}
              </p>
              <p className="font-mono text-[11px] text-faint">
                acting as <span className="text-ink">{turn.role}</span>
              </p>
            </div>
            <div className="px-4 py-4">
              <p className="text-sm font-semibold text-ink">{turn.title}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted">{turn.body}</p>
              {turn.label && (
                <button
                  onClick={() => {
                    setViewAs(turn.role);
                    if (turn.n === 1) {
                      setSellerReviewed(true);
                    } else if (turn.label === "buyer opens the escrow") {
                      if (listing) openEscrow(listing.id);
                    } else if (turn.n === 2) act("fund");
                    else if (turn.n === 3) act("ship");
                    else if (turn.n === 4) act("confirm");
                  }}
                  disabled={busy}
                  className="mt-3 rounded-md bg-accent px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-paper transition hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? "submitting…" : turn.label}
                </button>
              )}
            </div>
          </div>
        );
      })()}
        {receipt && receipt.txHash && (
          <div className="mt-4 rounded-lg border border-line">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-4 py-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
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
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-3 sm:grid-cols-4">
              {[
                ["block", receipt.tx?.block ?? receipt.block ?? "—"],
                ["status", "success"],
                ["gas used", receipt.tx?.gasUsed ?? "—"],
                ["from", receipt.tx ? `${receipt.tx.from.slice(0, 6)}…${receipt.tx.from.slice(-4)}` : "—"],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-faint">{k}</p>
                  <p className="font-mono text-[12px] text-ink">{v}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-line px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-wider text-faint">where the money is now</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {[
                  ["buyer wallet", receipt.balances.buyer],
                  ["in escrow", receipt.balances.escrow],
                  ["seller wallet", receipt.balances.seller],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="font-mono text-[10px] text-faint">{k}</p>
                    <p className="font-mono text-[13px] text-ink">
                      {(Number(v) / 1e6).toLocaleString("en-US", { maximumFractionDigits: 0 })} USDC
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Page>


      <div className="mt-4">
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
          canTimeTravel={meta?.chain.supportsTimeTravel ?? false}
          viewAs={viewAs}
          hideActions
        />
      </div>
      {error && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-danger/40 bg-surface px-4 py-3 font-mono text-xs text-danger shadow-xl">
          {error}
          <button onClick={() => setError(null)} className="ml-4 text-danger hover:text-danger">
            dismiss
          </button>
        </div>
      )}
    </>
  );
}
