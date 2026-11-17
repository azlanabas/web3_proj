import { Badge, Callout, Card, Page, Table } from "../components/ui";
import { kickerFor } from "../nav";
import type { Meta } from "../lib/meta";

export function Roadmap({ meta }: { meta: Meta | null }) {
  const c = meta?.chain;
  const live = c && c.mode !== "simulated";
  const publicChain = c?.mode === "sepolia" || c?.mode === "mainnet";

  return (
    <Page
      kicker={kickerFor("roadmap")}
      title="Status and roadmap"
      lede="Current state, deferred work, and the requirements for a production launch."
    >
      <Card title="Running now" tag={live ? "live" : "local only"}>
        <Table
          head={["Area", "State"]}
          rows={[
            ["Settlement network", c ? `${c.network} · chain ${c.chainId}` : "…"],
            ["Escrow contract", c?.escrow || "…"],
            ["Test USDC", c?.token || "…"],
            ["Current block", c?.blockNumber ?? "…"],
            ["Escrows recorded", meta ? String(meta.counts.escrows) : "…"],
            ["Events indexed", meta ? String(meta.counts.events) : "…"],
            ["REST endpoints", meta ? String(meta.endpoints.length) : "…"],
            ["Whole-vehicle flow", "list → escrow → fund → ship → confirm → release, verified on-chain"],
            ["Database", "PostgreSQL 16 with migrations, soft delete, numeric(20,6) money"],
            ["Operations", "systemd, nginx, Let's Encrypt, nightly backups, rate limits, CI"],
          ]}
        />
        <p className="flex flex-wrap gap-2 pt-1">
          {publicChain ? <Badge>public testnet</Badge> : <Badge tone="amber">development network</Badge>}
          <Badge>real transactions</Badge>
          <Badge tone="slate">test currency only</Badge>
        </p>
      </Card>

      <Card title="Next milestones" tag="sequence">
        <Table
          head={["Milestone", "Scope"]}
          rows={[
            ["Independent contract audit", "The gate before mainnet, following the 23-test suite."],
            ["Mainnet deployment", "Follows the audit and a period on testnet."],
            ["Wallet signing", "Each party signs their own escrow actions from their own wallet."],
            ["Vehicle image uploads", "The schema is ready; object storage is the next piece."],
            ["Formal arbitration workflow", "Extends dispute resolution with evidence and review."],
            ["WAF, uptime alerting, read replica", "Operational additions timed with traffic growth."],
          ]}
        />
      </Card>

      <Card title="If this continued, in order" tag="next">
        <Table
          head={["Step", "Why first"]}
          rows={[
            ["Contract audit", "The foundation for every later step."],
            ["Source verification on Etherscan", "Publishes the deployed bytecode as readable code."],
            ["Wallet signing", "Moves buyer and seller keys into their own wallets."],
            ["Image storage + CDN", "The last missing piece of a usable listing."],
            ["Alerting and a read replica", "Only once real traffic exists."],
          ]}
        />
      </Card>

      <Card title="Decision highlights" tag="why it looks like this">
        <Table
          head={["Decision", "Choice"]}
          rows={[
            ["D-02", "Non-custodial escrow — removes money-transmission exposure"],
            ["D-15", "systemd instead of Docker — 2 GB host shared with another app"],
            ["D-17", "14-day timeout plus dispute — fixes the buyer-ghosting deadlock"],
            ["D-18", "Held back TypeScript 7 and Prisma 7 — breaking majors mid-MVP"],
            ["D-29", "Sepolia deployment with fresh keys after the default development keys proved squatted"],
          ]}
        />
      </Card>

      <Callout tone="slate" title="Summary">
        <p>
          This is a working escrow on a public testnet with real transactions, a real indexer and a
          real deployment pipeline. It is not audited, it is not on mainnet, and users do not sign
          their own transactions yet. Those three sentences are the accurate description.
        </p>
      </Callout>
    </Page>
  );
}
