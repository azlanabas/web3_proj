import { Badge, Callout, Card, Code, List, Page, Stats, Table } from "../components/ui";

const LAYERS = [
  { n: "01", name: "Web", detail: "React 19 · Vite · Tailwind" },
  { n: "02", name: "Server", detail: "NestJS 12 · REST" },
  { n: "03", name: "App", detail: "escrow state machine" },
  { n: "04", name: "Web3", detail: "USDC · anvil EVM" },
];

export function Overview() {
  return (
    <Page
      kicker="Start · Overview"
      title="A vehicle marketplace where the money waits in a contract, not in our account"
      lede="This page explains the whole thing: why it exists, what it does, where it runs, how a sale moves through it, and which parts are real versus deliberately deferred. If you read only one page before the walkthrough, read this one."
    >
      <div className="grid gap-3 sm:grid-cols-4">
        {LAYERS.map((step) => (
          <div key={step.name} className="rounded-xl border border-line bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-faint">{step.n}</span>
              <span className="text-accent">→</span>
            </div>
            <p className="mt-2 text-sm font-semibold text-ink">{step.name}</p>
            <p className="mt-0.5 font-mono text-[10px] text-muted">{step.detail}</p>
          </div>
        ))}
      </div>

      <Stats
        items={[
          { value: "7", label: "escrow states, terminal states final" },
          { value: "23/23", label: "contract tests passing" },
          { value: "14d", label: "seller protection against a silent buyer" },
          { value: "0", label: "customer funds the platform holds" },
        ]}
      />

      {/* ---------------------------------------------------------------- WHY */}
      <Card title="Why this exists" tag="the problem">
        <p>
          Selling a vehicle privately has a trust gap that has nothing to do with the vehicle. The
          buyer will not send money before seeing the car; the seller will not hand over the keys
          before seeing money. Every option available today charges for that gap in some way — a
          dealer takes margin, an escrow company takes a fee and several days, cash takes the most
          risk of all.
        </p>
        <p>
          The obvious fix is a platform that holds the money. That is also the expensive fix: taking
          custody of someone else&rsquo;s funds is money transmission in most jurisdictions, and it
          brings licensing, audits, capital requirements and a compliance function far larger than
          the product.
        </p>
        <p>
          <strong>So the money goes into a smart contract instead.</strong> The buyer locks USDC
          against a specific sale; the seller can see it is locked; neither party can withdraw
          unilaterally; the platform never has custody of a cent. The platform sells evidence and
          arbitration — what happened, in what order, and who was right — not banking.
        </p>
      </Card>

      {/* --------------------------------------------------------------- WHAT */}
      <Card title="What it is" tag="the product">
        <p>
          A marketplace listing vehicles, with settlement through an on-chain escrow. One loop is
          the entire MVP:
        </p>
        <Code>{`list → create escrow → fund → ship → confirm → release
                                   │
                                   ├─ dispute → arbiter → refund | release
                                   └─ 14 days, no dispute → release to seller`}</Code>
        <Table
          head={["Role", "What they do", "What they cannot do"]}
          rows={[
            ["Visitor", "Browse listings", "See escrow detail"],
            ["Buyer", "Open escrow, fund it, confirm delivery, dispute", "Release to themselves, cancel after funding"],
            ["Seller", "Mark shipped, receive funds", "Touch funds before confirmation or timeout"],
            ["Arbiter", "Refund a funded escrow; release inside a dispute", "Pay itself, pay an arbitrary address"],
            ["Operator", "Read all escrows and events", "Move money without a role"],
          ]}
        />
      </Card>

      <Card title="What the platform owns, and what it never touches" tag="the boundary">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-good">Owns</p>
            <List
              items={[
                "Listings, vehicles and photos",
                "Identity: wallet address to session",
                "Escrow state and its audit trail",
                "Arbitration decisions",
              ]}
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-danger">Never owns</p>
            <List
              items={[
                "Buyer funds, at any moment",
                "The vehicle or its title",
                "User private keys",
                "Custody of USDC",
              ]}
            />
          </div>
        </div>
      </Card>

      {/* -------------------------------------------------------------- WHERE */}
      <Card title="Where it runs" tag="the deployment">
        <Table
          head={["Piece", "Where"]}
          rows={[
            ["Public URL", <code className="font-mono text-[10px]">https://web3.heurist.online</code>],
            ["Host", "AWS ap-southeast-1, single EC2 t4g.small, Ubuntu 24.04.4, arm64"],
            ["Edge", "nginx 1.24 with TLS from Let's Encrypt; HTTP redirects to HTTPS"],
            ["API", "NestJS on 127.0.0.1:8310 under systemd — not reachable from the internet directly"],
            ["Database", "PostgreSQL 16.15 on the same host, bound to localhost, DML-only runtime role"],
            ["Chain", "anvil, chain id 31337, 127.0.0.1:8545 — a private EVM on the box"],
            ["Contracts", "escrow 0xCf7E…0Fc9 · test USDC 0x9fE4…a6e0"],
            ["Source", "github.com/azlanabas/web3_proj — public, with CI on every push"],
          ]}
        />
      </Card>

      {/* --------------------------------------------------------------- HOW */}
      <Card title="How one sale moves through the system" tag="end to end">
        <List
          items={[
            "The seller publishes a listing. It is stored in PostgreSQL and appears in the public catalogue.",
            "The buyer opens an escrow. The API reads the listing price, converts it to USDC base units, and sends createEscrow — a real transaction.",
            "The buyer funds it. The service checks the token allowance, approves if needed, then calls fund. USDC moves from the buyer's wallet into the contract, not to the platform.",
            "The seller marks it shipped. That starts a 14-day timer on-chain.",
            "The buyer confirms delivery. The contract pays the seller and the escrow becomes RELEASED, permanently.",
          ]}
        />
        <p>
          At every step the API waits for a transaction receipt before it writes anything to the
          database. If the chain rejects the action, the state does not move. The database is a read
          model of the chain, not the authority — which is why the event log can rebuild it.
        </p>
        <Code>{`browser → POST /api/escrows/:id/fund
        → state + role checks
        → viem signs with the demo key
        → anvil mines a block (1s)
        → receipt: success, logs emitted
        → escrow.status = FUNDED  (PostgreSQL)
        → indexer reads the log → ChainEvent row
        → UI advances the state bar`}</Code>
      </Card>

      <Card title="Why these choices" tag="the reasoning">
        <Table
          head={["Decision", "Chosen", "Because"]}
          rows={[
            ["Custody model", "Non-custodial", "Custody is what triggers money-transmission licensing"],
            ["Settlement asset", "USDC, not ETH", "A 14-day window priced in ETH exposes both sides to volatility"],
            ["Arbiter", "One immutable address", "A per-escrow arbiter would let the buyer nominate themselves"],
            ["Buyer-ghosting", "14-day timeout + dispute", "Without it, a silent buyer locks the seller's money forever"],
            ["Upgradeability", "None", "An escrow users must trust should not be silently mutable"],
            ["Runtime", "systemd, no Docker", "2 GB host shared with another app; the daemon alone would be a quarter of it"],
            ["Frontend", "Vite SPA, no SSR", "Authenticated app — server rendering buys nothing here"],
            ["Pinned majors", "TypeScript 5.9, Prisma 6.19", "Both new majors are breaking; an MVP should not absorb that"],
          ]}
        />
      </Card>

      {/* --------------------------------------------------------------- REAL */}
      <Card title="What is real, and what is not" tag="be exact">
        <Table
          head={["Real", "Not real (deliberately)"]}
          rows={[
            ["Escrow contract deployed and executing", "The chain is local anvil, not Sepolia or mainnet"],
            ["Every action is a signed transaction with a receipt", "The USDC is a test token we minted, not Circle's"],
            ["Events indexed from chain logs", "No independent contract audit"],
            ["State machine, role rules, audit trail", "No wallet connect — the server holds demo keys"],
            ["TLS, DNS, systemd, backups, rate limits, CI", "No image upload, no dispute evidence workflow"],
          ]}
        />
        <Callout tone="slate" title="The one sentence that matters">
          <p>
            The escrow mechanics are real; the money and the network are not. That distinction is
            worth stating before anyone asks, because everything on this site is built to survive
            the question.
          </p>
        </Callout>
      </Card>

      <Card title="Verify it in sixty seconds" tag="proof, not claims">
        <Code>{`curl -s https://web3.heurist.online/api/health     # {"status":"ok"}
curl -s https://web3.heurist.online/api/meta | head -c 200

ssh web3 host, then:
cast chain-id --rpc-url http://127.0.0.1:8545    # 31337
cast call 0xCf7E…0Fc9 "nextEscrowId()(uint256)"   # escrows created
cast logs --address 0xCf7E…0Fc9 --from-block 1    # every event`}</Code>
      </Card>

      <Card title="How to read this site" tag="navigation">
        <Table
          head={["Group", "Read it for"]}
          rows={[
            ["Start", "This page, the full component inventory, and the requirement map"],
            ["Components", "Web tier, API tier, data tier — how each is built"],
            ["Web3", "Ethereum basics, source locations, chain, token, contract, transactions, lifecycle, references"],
            ["Practice", "Live walkthrough, API explorer, security model, operations, roadmap"],
          ]}
        />
        <p className="flex flex-wrap gap-2 pt-1">
          <Badge>19 sections</Badge>
          <Badge tone="slate">self-describing API</Badge>
          <Badge tone="slate">printable blueprint at /system.html</Badge>
        </p>
      </Card>
    </Page>
  );
}
