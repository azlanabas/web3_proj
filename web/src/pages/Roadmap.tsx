import { Badge, Card, Page, Table } from "../components/ui";

export function Roadmap() {
  return (
    <Page
      kicker="Practice"
      title="Status and roadmap"
      lede="What is genuinely finished, what is simulated, and what a production launch would still require. The distinction between the first two is the one that matters in a review."
    >
      <Card title="Finished" tag="verified">
        <Table
          head={["Area", "State"]}
          rows={[
            ["Solidity escrow contract", "Written, 23/23 Foundry tests passing, mirrored in repo"],
            ["Escrow state machine", "All 7 states, role-gated, every transition recorded"],
            ["PostgreSQL schema", "6 tables, migrations applied, money as numeric(20,6)"],
            ["REST API", "23 endpoints, Zod validation, SIWE auth, session cookies"],
            ["React walkthrough", "12 navigable sections, live escrow demo, API explorer"],
            ["Deployment", "AWS EC2, systemd, nginx, TLS, auto-renew verified"],
            ["DNS", "web3.heurist.online resolving on public resolvers"],
          ]}
        />
      </Card>

      <Card title="Deliberately out of MVP scope" tag="post-MVP">
        <Table
          head={["Item", "What is actually happening"]}
          rows={[
            ["Public testnet deployment", "Escrow runs on a local anvil EVM; Sepolia is a config swap"],
            ["Vehicle image storage", "Schema exists; uploads are not part of the MVP surface"],
            ["Formal arbitration workflow", "Decision is a role check, not an evidence-and-review process"],
            ["Contract audit", "Required before any mainnet deployment, not before a local demo"],
          ]}
        />
      </Card>

      <Card title="Next, in order" tag="if this continued">
        <Table
          head={["Step", "Why it comes first"]}
          rows={[
            ["Deploy the contract to Sepolia", "Turns the simulation into a real settlement path"],
            ["Replace simulation with viem writes", "One service changes; the product does not"],
            ["Point the indexer at real logs", "Proves the audit trail is chain-derived"],
            ["Nightly pg_dump + log rotation", "Cheapest way to avoid losing the demo database"],
            ["Rate limiting on auth", "The only endpoint class with meaningful abuse value"],
            ["S3 with an instance role", "Images are the last missing piece of a listing"],
          ]}
        />
      </Card>

      <Card title="Decision log highlights" tag="why it looks like this">
        <Table
          head={["Decision", "Choice"]}
          rows={[
            ["D-02", "Non-custodial escrow — removes money-transmission exposure"],
            ["D-03", "TypeScript / Node / React — the brief's stack, GDA Stack C"],
            ["D-15", "systemd instead of Docker — 2 GB host shared with another app"],
            ["D-17", "14-day timeout plus dispute — fixes the buyer-ghosting deadlock"],
            ["D-18", "Held back TypeScript 7 and Prisma 7 — breaking majors mid-MVP"],
            ["D-19", "Simulated settlement — deployment pending a funded testnet key"],
          ]}
        />
      </Card>

      <p className="flex flex-wrap gap-2">
        <Badge>demo ready</Badge>
        <Badge>on-chain settlement</Badge>
        <Badge>contract tested</Badge>
        <Badge tone="slate">audit post-MVP</Badge>
      </p>
    </Page>
  );
}
