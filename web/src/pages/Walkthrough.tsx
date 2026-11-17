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
        <Card title="Two paths worth running" tag="script">
          <List
            items={[
              "Happy path: open escrow → fund → ship → confirm. The seller is paid and the escrow settles.",
              "Failure path: open escrow → fund → ship → dispute → arbiter refund. The buyer is made whole.",
              "Timeout path: the 14-day window must actually elapse on a public network, so those controls are disabled here.",
            ]}
          />
          <p className="text-xs text-muted">
            A single session may act as buyer, seller and arbiter, the way an operator would.
          </p>
        </Card>
      </Page>
      <div className="-mt-10">
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
