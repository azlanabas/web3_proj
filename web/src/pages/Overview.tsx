import { Badge, Callout, Card, Code, Page, Stats, Table } from "../components/ui";

const STEPS = [
  {
    n: "01",
    title: "Seller lists a vehicle",
    actor: "Seller",
    what: "Make, model, year, VIN, mileage, price. Stored in PostgreSQL and shown publicly.",
    layers: ["Web", "API", "Data"],
  },
  {
    n: "02",
    title: "Buyer opens an escrow",
    actor: "Buyer",
    what: "The price is converted to USDC base units and createEscrow is sent to the contract.",
    layers: ["API", "Web3"],
  },
  {
    n: "03",
    title: "Buyer funds it",
    actor: "Buyer",
    what: "USDC moves from the buyer into the contract — not to the platform. This is the moment money is locked.",
    layers: ["Web3"],
  },
  {
    n: "04",
    title: "Seller ships",
    actor: "Seller",
    what: "A transaction records shipment and starts a 14-day timer on-chain.",
    layers: ["API", "Web3"],
  },
  {
    n: "05",
    title: "Buyer confirms delivery",
    actor: "Buyer",
    what: "The contract pays the seller and the escrow becomes RELEASED, permanently.",
    layers: ["Web3"],
  },
  {
    n: "06",
    title: "The event is indexed",
    actor: "System",
    what: "The log is read back from the chain into an append-only table. The database now mirrors what happened.",
    layers: ["Web3", "API", "Data"],
  },
];

const NEXT = [
  { href: "#/lifecycle", name: "The product", line: "The six steps above, as a state machine with role rules" },
  { href: "#/architecture", name: "How it is built", line: "Every file, every module, and the order it was assembled" },
  { href: "#/fundamentals", name: "The chain", line: "ETH, gas, staking, proofs, sequencers — and what this app does not use" },
  { href: "#/explorer", name: "The evidence", line: "Call the live API, read the security model, see the deployment" },
];

export function Overview() {
  return (
    <Page
      kicker="Start"
      title="A vehicle marketplace where the money waits in a contract"
      lede="A buyer will not pay before delivery; a seller will not hand over the keys before payment. This app closes that gap with an escrow contract instead of a bank account — so the platform never holds anyone's money."
    >
      <div className="flex flex-wrap gap-2">
        <a href="#/demo" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-paper transition hover:bg-accent-strong">
          Run it yourself
        </a>
        <a href="#/architecture" className="rounded-lg border border-line px-4 py-2 text-sm text-ink transition hover:border-accent/60">
          How it is built
        </a>
        <a href="/system.html" className="rounded-lg border border-line px-4 py-2 text-sm text-muted transition hover:border-accent/60">
          One-page blueprint ↗
        </a>
      </div>

      <Card title="The problem, in three sentences" tag="why">
        <p>
          Private vehicle sales run on trust that neither side can verify. The two alternatives both
          cost something: a dealer takes margin, an escrow company takes a fee and several days.
        </p>
        <p>
          The obvious fix — a platform that holds the money — is the expensive one, because custody
          is money transmission and brings licensing with it. So the money goes into a smart
          contract that neither party can move alone, and the platform is left selling evidence and
          arbitration rather than banking.
        </p>
      </Card>

      <Card title="Follow one sale" tag="the whole product in six steps">
        <ol className="space-y-4">
          {STEPS.map((step) => (
            <li key={step.n} className="flex gap-4">
              <span className="mt-0.5 font-mono text-[11px] text-faint">{step.n}</span>
              <div className="min-w-0 flex-1 border-l border-line pl-4">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-semibold text-ink">{step.title}</span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-accent">{step.actor}</span>
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">{step.what}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {step.layers.map((l) => (
                    <span key={l} className="rounded border border-line bg-paper px-1.5 py-0.5 font-mono text-[10px] text-faint">
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-xs">
          Two branches leave this path: the buyer can dispute before confirming, which freezes the
          timer for an arbiter; or, if the buyer goes silent for 14 days, anyone can release the
          funds to the seller.
        </p>
      </Card>

      <Card title="How the pieces connect" tag="the architecture, honestly">
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
          The browser never touches the chain and holds no keys. The API signs with server-held demo
          keys, waits for a receipt, and only then writes to the database — which is why the
          database can always be rebuilt from the chain.
        </p>
      </Card>

      <Stats
        items={[
          { value: "7", label: "escrow states, terminal states final" },
          { value: "23/23", label: "contract tests passing" },
          { value: "14d", label: "seller protection against a silent buyer" },
          { value: "0", label: "customer funds the platform holds" },
        ]}
      />

      <Card title="What is real, and what is not" tag="say it first">
        <Table
          head={["Real", "Not real (deliberately)"]}
          rows={[
            ["Escrow contract deployed and executing on an EVM", "The chain is local anvil, not Sepolia or mainnet"],
            ["Every action is a signed transaction with a receipt", "The USDC is a test token we minted"],
            ["Events indexed from chain logs", "No independent contract audit"],
            ["TLS, DNS, systemd, backups, rate limits, CI", "No wallet connect — the server holds demo keys"],
          ]}
        />
        <Callout tone="slate" title="The sentence to remember">
          <p>
            The escrow mechanics are real; the money and the network are not. Everything on this
            site is built to survive that question rather than avoid it.
          </p>
        </Callout>
      </Card>

      <Card title="Where to go next" tag="the sequence">
        <div className="space-y-2">
          {NEXT.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-baseline justify-between gap-4 rounded-lg border border-line px-3 py-2 transition hover:border-accent/60"
            >
              <span>
                <span className="text-sm font-medium text-ink">{item.name}</span>
                <span className="mt-0.5 block text-[12px] text-muted">{item.line}</span>
              </span>
              <span className="font-mono text-[11px] text-accent">→</span>
            </a>
          ))}
        </div>
        <p className="flex flex-wrap gap-2 pt-1">
          <Badge>23 sections</Badge>
          <Badge tone="slate">four acts</Badge>
          <Badge tone="slate">self-describing API</Badge>
        </p>
      </Card>
    </Page>
  );
}
