import type { ChainEvent, Escrow, Listing } from "../types";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export const api = {
  health: () => req<{ status: string }>("/health"),
  startSession: () => req<{ walletAddress: string }>("/session", { method: "POST" }),
  listings: () => req<{ items: Listing[]; total: number }>("/listings"),
  escrows: () => req<Escrow[]>("/escrows"),
  receipt: (id: string) =>
    req<{
      event: string | null;
      txHash: string | null;
      block: string | null;
      tx: { from: string; to: string; gasUsed: string; status: string; block: string } | null;
      amountUsdc: string;
      balances: { buyer: string; seller: string; escrow: string };
    }>(`/escrows/${id}/receipt`),
  detail: (id: string) => req<{ escrow: Escrow; events: ChainEvent[] }>(`/escrows/${id}`),
  createEscrow: (listingId: string) =>
    req<Escrow>("/escrows", { method: "POST", body: JSON.stringify({ listingId }) }),
  act: (id: string, action: string) =>
    req<Escrow>(`/escrows/${id}/${action}`, { method: "POST" }),
  reset: () => req<{ ok: boolean }>("/session/reset", { method: "POST" }),
};

export const short = (hash?: string | null, n = 10): string =>
  hash ? `${hash.slice(0, n)}…${hash.slice(-4)}` : "—";

export const usd = (value: string): string =>
  Number(value).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
