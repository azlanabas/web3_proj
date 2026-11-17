import { useCallback, useEffect, useState } from "react";
import { EscrowPanel } from "../components/EscrowPanel";
import { Card, List, Page } from "../components/ui";
import { api } from "../lib/api";
import type { ChainEvent, Escrow, Listing } from "../types";

export function Demo() {
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
    <>
      <Page
        kicker="1 · The product · 3 of 3"
        title="Live walkthrough"
        lede="This runs against the production API you are reading this page from. Start a demo session, open an escrow on a vehicle, then drive it through every state. Each action writes a chain event on the right."
      >
        <Card title="Two paths worth demonstrating" tag="script">
          <List
            items={[
              "Happy path: open escrow → fund → ship → confirm. The seller is paid and the escrow settles.",
              "Failure path: open escrow → fund → ship → dispute → arbiter refund. The buyer is made whole.",
              "Timeout path: open escrow → fund → ship → simulate 14 days → release by timeout. Protects a seller from a silent buyer.",
            ]}
          />
          <p className="text-xs text-muted">
            In demo mode a single session may act as buyer, seller and arbiter, the way an operator
            walking through the product would.
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
