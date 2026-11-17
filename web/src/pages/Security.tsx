import { Badge, Callout, Card, List, Page, Table } from "../components/ui";
import { kickerFor } from "../nav";

export function Security() {
  return (
    <Page
      kicker={kickerFor("security")}
      title="Security model"
      lede="The interesting security question here is not whether the server is hardened — it is which party has to be trusted at each moment, and what the damage is when that trust is misplaced."
    >
      <Card title="Trust boundaries" tag="what is assumed">
        <Table
          head={["Boundary", "Trusted?", "Mitigation"]}
          rows={[
            ["Buyer confirms delivery", "Yes — it is the delivery oracle", "Documented openly; not described as trustless"],
            ["Arbiter key", "Yes, refund + dispute release", "Refund-only outside disputes; never pays itself"],
            ["RPC provider", "Partly — could lie about logs", "Two providers configured; verify before terminal states"],
            ["Chain reorgs", "No", "Confirmation depth before terminal state (planned)"],
            ["PostgreSQL", "No", "Rebuildable read model; the chain holds the funds"],
            ["Browser session", "No", "HMAC-signed HttpOnly cookie, 2h expiry"],
          ]}
        />
      </Card>

      <Card title="Authentication" tag="SIWE">
        <List
          items={[
            "Nonce is generated server-side, stored in Postgres, single-use, 5-minute TTL.",
            "Signature verified against the message with EIP-4361 semantics; domain is checked.",
            "A replayed message fails because the nonce is already consumed — verified by test.",
            "Session is an HMAC-signed payload, HttpOnly, SameSite=Lax, Secure in production.",
            "No JWT in localStorage: nothing readable by injected script can be replayed elsewhere.",
          ]}
        />
      </Card>

      <Card title="Server hardening" tag="implemented">
        <List
          items={[
            "helmet sets security headers on every response.",
            "Zod validates every request body; malformed input never reaches a service.",
            "API binds to 127.0.0.1 only and is reached through nginx.",
            "PostgreSQL listens on localhost only.",
            "TLS via Let's Encrypt with automatic renewal; HTTP redirects to HTTPS.",
            "Secrets live in a mode-600 environment file, never in git or the bundle.",
            "The application has no internet-facing administrative surface.",
          ]}
        />
      </Card>

      <Callout tone="slate" title="Single-operator mode weakens role enforcement">
        <p>
          <code className="font-mono text-[11px]">OPERATOR_MODE=true</code> lets a single session act
          as buyer, seller and arbiter so the walkthrough works without three wallets. It bypasses
          role checks in the escrow service and must be set to false before any real use.
        </p>
      </Callout>

      <Card title="Controls in place" tag="implemented">
        <List
          items={[
            "Global rate limit of 120 requests per minute, with 10 per minute on auth routes.",
            "The runtime database role holds DML only — a compromised app cannot alter the schema.",
            "Nightly compressed database backups with seven-day rotation.",
            "Journald capped at 200 MB and nginx logs rotated by logrotate.",
            "GitHub Actions runs contract tests and both builds on every push.",
            "systemd restarts the API on failure; the chain is a separate supervised unit.",
          ]}
        />
      </Card>

      <Card title="Post-MVP scope" tag="deliberately deferred">
        <p className="flex flex-wrap gap-2">
          <Badge tone="slate">WAF</Badge>
          <Badge tone="slate">contract audit</Badge>
          <Badge tone="slate">KMS-held arbiter key</Badge>
          <Badge tone="slate">Sepolia / mainnet</Badge>
        </p>
        <p className="text-xs text-muted">
          These are scoped out of the MVP rather than incomplete. A public-network launch requires
          all four, and the audit is the gating item.
        </p>
      </Card>
    </Page>
  );
}
