import { useEffect, useState } from "react";
import { Code, Page, Section, Table } from "../components/ui";
import { ACTS, firstOfAct, kickerFor, sectionsOf } from "../nav";
import type { Meta } from "../lib/meta";

interface Tx {
  eventName: string;
  txHash: string;
  blockNumber: string;
  escrowId: string | null;
  payload?: { amount?: string } | null;
  vehicle: string | null;
  amountUsdc: string | null;
  buyer: string | null;
  seller: string | null;
}

const EVENT_COPY: Record<string, string> = {
  EscrowCreated: "Escrow opened",
  Funded: "Funds deposited",
  Shipped: "Shipment recorded",
  Disputed: "Dispute raised",
  Released: "Payment released",
  Refunded: "Funds refunded",
  Cancelled: "Escrow cancelled",
};

const usdc = (base?: string) =>
  base ? `${(Number(base) / 1_000_000).toLocaleString("en-US")} USDC` : null;

const SELLER = [
  ["List the vehicle", "Enter make, model, year, VIN, mileage and price. The listing is public; no money is involved and nothing is committed."],
  ["Wait for funding", "The escrow appears as CREATED. There is nothing to ship yet. If the buyer never funds it, either side can cancel."],
  ["Ship once funded", "When the escrow shows FUNDED the USDC is already locked in the contract, so dispatch is safe. Marking it shipped starts a 14-day timer."],
  ["Get paid", "The buyer confirming delivery releases the funds. If the buyer goes silent, anyone can release to the seller after 14 days."],
];

const BUYER = [
  ["Open the escrow", "Choose the vehicle and open an escrow. This fixes the price in USDC and creates escrow #N. No money moves yet."],
  ["Fund it", "Approve and deposit the USDC into the contract, not to the seller. From this moment the seller can ship knowing the money exists."],
  ["Inspect on delivery", "The funds stay locked until the buyer confirms. Neither the seller nor the platform can withdraw them."],
  ["Confirm or dispute", "Confirming releases payment to the seller. Raising a dispute freezes the timer and hands the decision to the arbiter."],
];

export function Overview({ meta }: { meta: Meta | null }) {
  const [txs, setTxs] = useState<Tx[]>([]);
  useEffect(() => {
    const load = () =>
      fetch("/api/chain/events")
        .then((r) => r.json())
        .then((rows: Tx[]) => setTxs(rows.slice(0, 6).reverse()))
        .catch(() => undefined);
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  const explorer = meta?.chain.mode === "sepolia" ? "https://sepolia.etherscan.io" : null;
  return (
    <Page
      kicker={kickerFor("overview")}
      title="A vehicle marketplace where the money waits in a contract"
      lede="A buyer will not pay before delivery; a seller will not hand over the keys before payment. This closes that gap with an escrow contract instead of a bank account, so the platform never holds anyone else's money."
    >
      {/* Centerpiece: the live chain. */}
      <div className="rounded-lg border border-line">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line px-5 py-4">
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-good" />
            {meta ? meta.chain.network : "live chain"}
          </p>
          <p className="font-mono text-[11px] text-faint">
            contract {meta ? `${meta.chain.escrow.slice(0, 10)}…${meta.chain.escrow.slice(-4)}` : "…"} ·
            refreshed every 15s
          </p>
        </div>

        <div className="grid grid-cols-3 divide-x divide-line border-b border-line">
          {[
            ["block", meta?.chain.blockNumber ?? "—"],
            ["escrows", meta ? String(meta.counts.escrows) : "—"],
            ["events", meta ? String(meta.counts.events) : "—"],
          ].map(([label, value]) => (
            <div key={label} className="px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-faint">{label}</p>
              <p className="mt-1 font-mono text-lg text-ink">{value}</p>
            </div>
          ))}
        </div>

        <div className="divide-y divide-line">
          {txs.length === 0 && (
            <p className="px-5 py-4 font-mono text-[12px] text-faint">Reading the chain…</p>
          )}
          {txs.map((tx, i) => {
            const amount = tx.amountUsdc
              ? `${Number(tx.amountUsdc).toLocaleString("en-US", { maximumFractionDigits: 2 })} USDC`
              : null;
            const short = (a: string | null) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—");
            const subject = tx.vehicle ?? "the vehicle";
            const detail =
              tx.eventName === "EscrowCreated" ? `Escrow #${tx.escrowId} opened for the ${subject}. No funds moved.`
              : tx.eventName === "Funded" ? `${amount} moved from buyer ${short(tx.buyer)} into escrow #${tx.escrowId}.`
              : tx.eventName === "Shipped" ? `Seller ${short(tx.seller)} marked the ${subject} shipped; 14-day timer started.`
              : tx.eventName === "Released" ? `${amount} paid to seller ${short(tx.seller)}; escrow #${tx.escrowId} closed.`
              : tx.eventName === "Refunded" ? `${amount} returned to buyer ${short(tx.buyer)}.`
              : tx.eventName === "Disputed" ? `Buyer ${short(tx.buyer)} disputed escrow #${tx.escrowId}; timer frozen.`
              : "";
            return (
              <div key={tx.txHash} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-3">
                <span className="w-5 font-mono text-[11px] text-faint">{String(i + 1).padStart(2, "0")}</span>
                <span className="w-[9.5rem] font-mono text-[11px] uppercase tracking-wider text-accent">
                  {EVENT_COPY[tx.eventName] ?? tx.eventName}
                </span>
                <span className="min-w-0 flex-1 text-[12px] text-muted">{detail}</span>
                <span className="font-mono text-[11px] text-faint">block {tx.blockNumber}</span>
                {explorer ? (
                  <a href={`${explorer}/tx/${tx.txHash}`} target="_blank" rel="noreferrer"
                     className="font-mono text-[11px] text-muted underline-offset-4 hover:text-accent hover:underline">
                    {tx.txHash.slice(0, 10)}… ↗
                  </a>
                ) : (
                  <span className="font-mono text-[11px] text-muted">{tx.txHash.slice(0, 10)}…</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Links. These are the only boxes on the page. */}
      <div className="border-t border-line">
        {ACTS.map((act) => {
          const first = firstOfAct(act.group);
          if (!first) return null;
          return (
            <a
              key={act.group}
              href={`#/${first.id}`}
              className="group flex items-baseline justify-between gap-6 border-b border-line py-4 transition hover:bg-surface"
            >
              <span className="flex min-w-0 items-baseline gap-4">
                <span className="font-mono text-[11px] text-accent">{act.number}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">{act.label}</span>
                  <span className="mt-0.5 block text-[12px] leading-relaxed text-muted">{act.blurb}</span>
                </span>
              </span>
              <span className="whitespace-nowrap font-mono text-[10px] uppercase tracking-wider text-faint transition group-hover:text-accent">
                {sectionsOf(act.group).length} pages →
              </span>
            </a>
          );
        })}
      </div>

      <Section title="The problem">
        <p>
          Private vehicle sales run on trust neither side can verify. The alternatives cost
          something: a dealer takes margin, an escrow company takes a fee and several days.
        </p>
        <p>
          The obvious fix — a platform that holds the money — is the expensive one, because custody
          is money transmission and brings licensing with it. So the money goes into a contract that
          neither party can move alone.
        </p>
      </Section>

      <Section title="What each side actually does" tag="buyer and seller">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-accent">Seller</p>
            <ol className="space-y-3">
              {SELLER.map(([title, detail], i) => (
                <li key={title} className="flex gap-3">
                  <span className="font-mono text-[11px] text-faint">{i + 1}</span>
                  <div>
                    <p className="text-[13px] font-semibold text-ink">{title}</p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-accent">Buyer</p>
            <ol className="space-y-3">
              {BUYER.map(([title, detail], i) => (
                <li key={title} className="flex gap-3">
                  <span className="font-mono text-[11px] text-faint">{i + 1}</span>
                  <div>
                    <p className="text-[13px] font-semibold text-ink">{title}</p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
        <p className="border-t border-line pt-3 text-[12px]">
          The seller cannot be paid without the buyer&apos;s confirmation or the 14-day timeout. The
          buyer cannot recover funds after shipping without raising a dispute. The platform can do
          neither, at any point.
        </p>
      </Section>

      <Section title="How the pieces connect">
        <Code>{`        ┌──────────────┐   HTTPS / JSON   ┌──────────────┐
        │     WEB      │ ───────────────▶ │     API      │
        │  React SPA   │ ◀─────────────── │   NestJS     │
        └──────────────┘                  └──────┬───────┘
                                        SQL  │  │  signed transaction
                                             ▼  ▼
                                  ┌────────────┐  ┌────────────┐
                                  │  POSTGRES  │  │    WEB3    │
                                  │ read model │◀─│   escrow   │ logs
                                  └────────────┘  └────────────┘`}</Code>
        <p>
          Every escrow action is a signed transaction. The service submits it, waits for the
          receipt, and only then writes to the database — so the database is a projection of the
          chain, never its source.
        </p>
      </Section>

      <Section title="Deployment status" tag="live">
        <p>
          The escrow is deployed and executing on Ethereum Sepolia. Every action in the flow above is
          a signed transaction with a receipt, and every event on this site was read back from the
          chain.
        </p>
        <Table
          head={["", ""]}
          rows={[
            ["Settlement", meta ? meta.chain.network : "Ethereum Sepolia"],
            ["Escrows settled", meta ? String(meta.counts.escrows) : "—"],
            ["Funds held by the platform", "0 USDC, at every point"],
            ["Contract tests", "23 passing, including a reentrancy attack"],
            ["Audit and mainnet", "Next milestone — see the roadmap"],
          ]}
        />
      </Section>
    </Page>
  );
}
