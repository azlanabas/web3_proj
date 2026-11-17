import { Badge, Callout, Card, List, Page, Table } from "../components/ui";

export function Security() {
  return (
    <Page
      kicker="Practice"
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
            ["PostgreSQL", "No", "Rebuildable read model; events are the record"],
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

      <Callout tone="amber" title="Demo mode weakens role enforcement">
        <p>
          <code className="font-mono text-[11px]">DEMO_MODE=true</code> lets a single session act
          as buyer, seller and arbiter so the walkthrough works without three wallets. It bypasses
          role checks in the escrow service and must be set to false before any real use.
        </p>
      </Callout>

      <Card title="Not yet hardened" tag="honest">
        <p className="flex flex-wrap gap-2">
          <Badge tone="rose">no rate limiting on auth</Badge>
          <Badge tone="rose">no WAF</Badge>
          <Badge tone="rose">no contract audit</Badge>
          <Badge tone="rose">arbiter key not in KMS</Badge>
          <Badge tone="rose">runtime DB role over-privileged</Badge>
        </p>
        <p className="text-xs text-slate-500">
          Each of these is a known, recorded gap rather than an oversight. The contract is not
          deployed, so an audit is a launch blocker rather than a current defect.
        </p>
      </Card>
    </Page>
  );
}
