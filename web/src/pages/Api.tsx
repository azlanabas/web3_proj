import { Badge, Card, Code, List, Page, Table } from "../components/ui";
import type { Meta } from "../lib/meta";

const MODULES: [string, string][] = [
  ["PrismaModule", "Global database client with lifecycle hooks"],
  ["AuthModule", "SIWE nonce, signature verification, session guard"],
  ["ListingsModule", "Vehicle CRUD with ownership checks"],
  ["EscrowModule", "State machine, transitions, chain-event log"],
  ["DemoModule", "Seeded vehicles and one-click session"],
  ["MetaModule", "This self-description, consumed by the explorer"],
  ["HealthController", "Liveness probe used by ops"],
];

const LIFECYCLE = [
  "nginx forwards /api/* to 127.0.0.1:8310",
  "helmet sets security headers; cookie-parser hydrates the session",
  "ZodPipe validates and narrows the body — bad input never reaches a service",
  "AuthGuard resolves the HMAC cookie to a user row and attaches it",
  "Controller delegates; the service enforces state and ownership rules",
  "Prisma writes; a ChainEvent row records the transition",
];

export function Api({ meta }: { meta: Meta | null }) {
  const endpoints = meta?.endpoints ?? [];
  return (
    <Page
      kicker="Components · 02"
      title="API tier"
      lede="A NestJS REST service that owns authentication, validation, the escrow state machine and the audit trail. Thin controllers, fat services, and every request validated before it reaches business logic."
    >
      <Card title="Module map" tag="structure">
        <Table head={["Module", "Responsibility"]} rows={MODULES.map(([m, r]) => [<code className="font-mono text-[11px] text-accent">{m}</code>, r])} />
      </Card>

      <Card title="Request lifecycle" tag="pipeline">
        <ol className="space-y-2">
          {LIFECYCLE.map((step, i) => (
            <li key={step} className="flex gap-3">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-accent/40 bg-accent-soft font-mono text-[10px] text-accent">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </Card>

      <Card title={`Endpoints (${endpoints.length})`} tag="live from /api/meta">
        <p className="text-xs text-muted">
          This table is fetched from the running service, not hardcoded — if a route changes, this
          page changes with it.
        </p>
        <Table
          head={["Method", "Path", "Auth", "Purpose"]}
          rows={endpoints.map((e) => [
            <span className={`font-mono text-[11px] ${e.method === "GET" ? "text-accent" : "text-warn"}`}>{e.method}</span>,
            <code className="font-mono text-[11px] text-ink">{e.path}</code>,
            <Badge tone="slate">{e.auth}</Badge>,
            e.purpose,
          ])}
        />
      </Card>

      <Card title="Authentication flow" tag="SIWE">
        <Code>{`POST /api/auth/siwe/nonce      → single-use nonce, 5 min TTL, stored in Postgres
POST /api/auth/siwe/verify     → verify signature (EIP-4361), check domain + nonce
                               → mark nonce used, upsert user
                               → Set-Cookie: sess=<payload>.<hmac>, HttpOnly, SameSite=Lax
GET  /api/auth/me              → guard resolves cookie → user`}</Code>
        <List
          items={[
            "Nonces are single use and deleted logic prevents replay — a replayed message returns 401.",
            "The session cookie is HMAC-signed with a 32-byte secret held only on the host.",
            "Two-hour expiry; there is no refresh token to steal.",
            "Roles are enforced in services, not only in controllers.",
          ]}
        />
      </Card>

      <Card title="Error model" tag="contract">
        <Table
          head={["Status", "Meaning", "Example"]}
          rows={[
            ["400", "Validation or illegal transition", "expected SHIPPED, escrow is FUNDED"],
            ["401", "No session, bad signature, replayed nonce", "invalid or expired nonce"],
            ["403", "Authenticated but not the right actor", "only the seller can ship"],
            ["404", "Unknown listing or escrow", "escrow not found"],
          ]}
        />
      </Card>
    </Page>
  );
}
