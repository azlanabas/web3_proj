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
      lede="What is running, what is deliberately deferred, and what a production launch would still require. The first two columns are the ones that matter in a review — the third is why this is not on mainnet."
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
          {publicChain ? <Badge>public testnet</Badge> : <Badge tone="amber">local chain</Badge>}
          <Badge>real transactions</Badge>
          <Badge tone="slate">test currency only</Badge>
        </p>
      </Card>

      <Card title="Deliberately deferred" tag="and why">
        <Table
          head={["Item", "Why it is not done"]}
          rows={[
            ["Independent contract audit", "The gating item before mainnet. 23 tests are not an audit."],
            ["Mainnet deployment", "Real money plus no audit is not a trade worth making."],
            ["Wallet connect", "The server signs with demo keys so the walkthrough needs no extension. Real users would sign themselves."],
            ["Vehicle image uploads", "Schema exists; object storage is not provisioned."],
            ["Formal arbitration workflow", "Dispute resolution is a role check, not an evidence-and-review process."],
            ["WAF, uptime alerting, read replica", "Operational maturity that traffic has not yet justified."],
          ]}
        />
      </Card>

      <Card title="If this continued, in order" tag="next">
        <Table
          head={["Step", "Why first"]}
          rows={[
            ["Contract audit", "Nothing else on this list matters if the escrow can be drained."],
            ["Source verification on Etherscan", "Turns the deployed address into readable, checkable code."],
            ["Wallet connect", "Removes the server-held buyer and seller keys, which is the biggest honest gap."],
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
            ["D-29", "Sepolia deployment with fresh keys after anvil's defaults proved squatted"],
          ]}
        />
      </Card>

      <Callout tone="slate" title="The honest summary">
        <p>
          This is a working escrow on a public testnet with real transactions, a real indexer and a
          real deployment pipeline. It is not audited, it is not on mainnet, and users do not sign
          their own transactions yet. Those three sentences are the accurate description.
        </p>
      </Callout>
    </Page>
  );
}
