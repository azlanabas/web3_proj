import { Badge, Callout, Card, List, Page, Stats } from "../components/ui";

const FLOW = [
  { name: "Web", detail: "React 19 · Vite" },
  { name: "API", detail: "NestJS 12 · REST" },
  { name: "App", detail: "escrow state machine" },
  { name: "Web3", detail: "USDC · Sepolia" },
];

export function Overview() {
  return (
    <Page
      kicker="Overview"
      title="A vehicle marketplace where the money waits in a contract, not in our account"
      lede="Buyers and sellers trade vehicles using USDC held in escrow. The platform matches, authenticates and arbitrates — but never takes custody of funds. That single constraint is what keeps it out of money-transmission licensing, and it shapes every layer below."
    >
      <div className="grid gap-3 sm:grid-cols-4">
        {FLOW.map((step, i) => (
          <div key={step.name} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-slate-600">0{i + 1}</span>
              <span className="text-emerald-500">→</span>
            </div>
            <p className="mt-2 text-sm font-semibold text-white">{step.name}</p>
            <p className="mt-0.5 font-mono text-[10px] text-slate-500">{step.detail}</p>
          </div>
        ))}
      </div>

      <Card title="The problem this design solves" tag="why">
        <p>
          A marketplace that holds money on behalf of users is, in most jurisdictions, a money
          transmitter. That brings licensing, audits and capital requirements far beyond an
          early-stage product.
        </p>
        <p>
          Remove custody and the problem disappears. The USDC goes into a smart contract that
          neither party controls unilaterally. The platform's job becomes evidence and
          arbitration — recording what happened and resolving disputes — not banking.
        </p>
      </Card>

      <Card title="What the platform owns, and what it never touches" tag="boundary">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">Owns</p>
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
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-rose-400">Never owns</p>
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

      <Stats
        items={[
          { value: "7", label: "escrow states, terminal states final" },
          { value: "23/23", label: "Foundry contract tests passing" },
          { value: "14d", label: "seller protection against a silent buyer" },
          { value: "0", label: "customer funds the platform holds" },
        ]}
      />

      <Callout tone="amber" title="What is real and what is simulated">
        Real: the state machine, role rules, PostgreSQL persistence, audit trail, TLS, DNS and
        deployment. The Solidity contract is written and tested but <strong>not deployed</strong>,
        so escrow transitions are recorded in the database with the same event shape a live chain
        would emit.
      </Callout>

      <Card title="How to read this site" tag="navigation">
        <p>
          Use the sidebar. Components walks each layer in order — web, API, data, web3 — then the
          escrow lifecycle that ties them together. Practice lets you run it: a live walkthrough,
          an API explorer, the security model and the deployment story.
        </p>
        <p className="flex flex-wrap gap-2 pt-1">
          <Badge>11 sections</Badge>
          <Badge tone="slate">self-describing API</Badge>
          <Badge tone="slate">live endpoints</Badge>
        </p>
      </Card>
    </Page>
  );
}
