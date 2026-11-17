import { Badge, Callout, Code, Page, Section, Table } from "../components/ui";
import { ACTS, SECTIONS, firstOfAct, kickerFor, sectionsOf } from "../nav";
import type { Meta } from "../lib/meta";

const STEPS = [
  ["01", "Seller lists a vehicle", "Seller", "Make, model, year, VIN, mileage, price. Stored in PostgreSQL and shown publicly."],
  ["02", "Buyer opens an escrow", "Buyer", "The price becomes USDC base units and createEscrow is sent to the contract."],
  ["03", "Buyer funds it", "Buyer", "USDC moves from the buyer into the contract, not to the platform. This is the moment money is locked."],
  ["04", "Seller ships", "Seller", "A transaction records shipment and starts a 14-day timer on chain."],
  ["05", "Buyer confirms delivery", "Buyer", "The contract pays the seller and the escrow becomes RELEASED, permanently."],
  ["06", "The event is indexed", "System", "The log is read back into an append-only table, so the database mirrors what happened."],
];

export function Overview({ meta }: { meta: Meta | null }) {
  return (
    <Page
      kicker={kickerFor("overview")}
      title="A vehicle marketplace where the money waits in a contract"
      lede="A buyer will not pay before delivery; a seller will not hand over the keys before payment. This closes that gap with an escrow contract instead of a bank account, so the platform never holds anyone else's money."
    >
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

      <Section title="Why this exists">
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

      <Section title="Follow one sale" tag="the product in six steps">
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

      <Section title="What is real, and what is not">
        <Table
          head={["Real", "Not real (deliberately)"]}
          rows={[
            ["Escrow contract executing on Ethereum Sepolia", "No independent audit, and not mainnet"],
            ["Every action is a signed transaction with a receipt", "The USDC is a test token, not Circle's"],
            ["Events indexed from chain logs", "No wallet connect yet — the service submits for users"],
            ["TLS, DNS, systemd, backups, rate limits, CI", "No image upload, no dispute evidence workflow"],
          ]}
        />
        <Callout tone="slate" title="The sentence to remember">
          <p>
            The escrow mechanics and the network are real; the currency is testnet.{" "}
            {meta ? `${meta.counts.escrows} escrow${meta.counts.escrows === 1 ? "" : "s"} settled on ${meta.chain.network}.` : ""}
          </p>
        </Callout>
        <p className="flex flex-wrap gap-2 pt-1">
          <Badge>{SECTIONS.length} sections</Badge>
          <Badge tone="slate">four acts</Badge>
          <Badge tone="slate">self-describing API</Badge>
        </p>
      </Section>
    </Page>
  );
}
