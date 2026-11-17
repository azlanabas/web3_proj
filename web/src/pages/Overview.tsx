import { useEffect, useState } from "react";
import { Code, Page, Section, Table } from "../components/ui";
import { ACTS, firstOfAct, kickerFor, sectionsOf } from "../nav";
import type { Meta } from "../lib/meta";

interface Tx {
  eventName: string;
  txHash: string;
  blockNumber: string;
  escrowId: string | null;
}

const STEPS = [
  ["01", "Seller lists a vehicle", "Seller", "Make, model, year, VIN, mileage, price. Stored in PostgreSQL and shown publicly."],
  ["02", "Buyer opens an escrow", "Buyer", "The price becomes USDC base units and createEscrow is sent to the contract."],
  ["03", "Buyer funds it", "Buyer", "USDC moves from the buyer into the contract, not to the platform. This is the moment money is locked."],
  ["04", "Seller ships", "Seller", "A transaction records shipment and starts a 14-day timer on chain."],
  ["05", "Buyer confirms delivery", "Buyer", "The contract pays the seller and the escrow becomes RELEASED, permanently."],
  ["06", "The event is indexed", "System", "The log is read back into an append-only table, so the database mirrors what happened."],
];

export function Overview({ meta }: { meta: Meta | null }) {
  const [txs, setTxs] = useState<Tx[]>([]);
  useEffect(() => {
    const load = () =>
      fetch("/api/chain/events")
        .then((r) => r.json())
        .then((rows: Tx[]) => setTxs(rows.slice(0, 6)))
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
          <p className="font-mono text-[11px] text-faint">transaction snapshot · updates every 15s</p>
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
          {txs.map((tx) => (
            <div key={tx.txHash} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-3">
              <span className="min-w-[8rem] font-mono text-[13px] uppercase tracking-wider text-accent">
                {tx.eventName}
              </span>
              <span className="font-mono text-[11px] text-faint">escrow #{tx.escrowId ?? "—"}</span>
              <span className="font-mono text-[11px] text-faint">block {tx.blockNumber}</span>
              {explorer ? (
                <a
                  href={`${explorer}/tx/${tx.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[13px] text-ink underline-offset-4 hover:text-accent hover:underline"
                >
                  {tx.txHash.slice(0, 20)}… ↗
                </a>
              ) : (
                <span className="font-mono text-[13px] text-ink">{tx.txHash.slice(0, 20)}…</span>
              )}
            </div>
          ))}
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

      <Section title="One sale, end to end" tag="the product in six steps">
        <ol className="space-y-4">
          {STEPS.map(([n, title, actor, what]) => (
            <li key={n} className="flex gap-4">
              <span className="mt-0.5 font-mono text-[11px] text-faint">{n}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-semibold text-ink">{title}</span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-accent">{actor}</span>
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">{what}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-xs">
          Two branches leave this path: the buyer can dispute before confirming, which freezes the
          timer for an arbiter; or, if the buyer goes silent for 14 days, anyone can release the
          funds to the seller.
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
