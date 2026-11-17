import { useCallback, useEffect, useState } from "react";
import { kickerFor } from "../nav";
import { EscrowPanel } from "../components/EscrowPanel";
import { Card, List, Page } from "../components/ui";
import { api } from "../lib/api";
import type { ChainEvent, Escrow, Listing } from "../types";
import type { Meta } from "../lib/meta";

export function Walkthrough({ meta }: { meta: Meta | null }) {
  const [viewAs, setViewAs] = useState<"buyer" | "seller" | "arbiter">("buyer");
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
        const stages = ["Open", "Fund", "Ship", "Confirm", "Settled"];
        const idx = !status ? 0
          : status === "CREATED" ? 1
          : status === "FUNDED" ? 2
          : status === "SHIPPED" || status === "DISPUTED" ? 3
          : 4;
        const next =
          !selected
            ? {
                title: "Open an escrow",
                body: "Choose a vehicle below. This fixes the price in USDC and creates an on-chain escrow. No funds move yet.",
                label: null as string | null,
              }
            : status === "CREATED"
            ? viewAs === "buyer"
              ? { title: "Fund the escrow", body: "Deposit the USDC into the contract. The seller can then ship knowing the money is locked.", label: "fund" }
              : { title: "Waiting for the buyer", body: "The seller can ship once the escrow is funded.", label: null }
            : status === "FUNDED"
            ? viewAs === "seller"
              ? { title: "Mark the vehicle shipped", body: "The money is already locked, so dispatch is safe. This starts the 14-day timer.", label: "ship" }
              : { title: "Waiting for the seller", body: "The seller marks shipped once they dispatch the vehicle.", label: null }
            : status === "SHIPPED"
            ? viewAs === "buyer"
              ? { title: "Confirm delivery", body: "This releases the funds to the seller and closes the escrow. Raise a dispute instead if the vehicle is wrong.", label: "confirm" }
              : { title: "Waiting for the buyer", body: "The buyer confirms delivery, or the 14-day timer releases the funds.", label: null }
            : status === "DISPUTED"
            ? viewAs === "arbiter"
              ? { title: "Resolve the dispute", body: "Pay the seller or refund the buyer. The contract permits both, and only from this state.", label: "release" }
              : { title: "Dispute raised", body: "The arbiter decides. Switch the view to arbiter to act.", label: null }
            : { title: "Escrow settled", body: `Final state: ${status}. Move to another vehicle to run the flow again.`, label: null };

        return (
          <div className="rounded-lg border border-line">
            <div className="flex flex-wrap items-center gap-1 border-b border-line px-4 py-3">
              {stages.map((s, i) => (
                <span key={s} className="flex items-center gap-1">
                  <span
                    className={
                      "rounded px-2 py-1 font-mono text-[10px] uppercase tracking-wider " +
                      (i === idx ? "bg-accent/15 text-accent" : i < idx ? "text-good" : "text-faint")
                    }
                  >
                    {i < idx ? "✓ " : ""}{s}
                  </span>
                  {i < stages.length - 1 && <span className="text-faint">→</span>}
                </span>
              ))}
            </div>
            <div className="px-4 py-4">
              <p className="text-sm font-semibold text-ink">{next.title}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted">{next.body}</p>
              {next.label && (
                <button
                  onClick={() => act(next.label!)}
                  disabled={busy}
                  className="mt-3 rounded-md bg-accent px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-paper transition hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? "submitting…" : next.title}
                </button>
              )}
            </div>
          </div>
        );
      })()}
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
