import { Badge, Card, Code, List, Page, Table } from "../components/ui";

const COMPONENTS: [string, string][] = [
  ["App.tsx", "Layout, routing between sections, data fetching orchestration"],
  ["components/Sidebar.tsx", "Persistent navigation, grouped by Start / Components / Practice"],
  ["components/EscrowPanel.tsx", "Interactive escrow: vehicle picker, state bar, actions, event log"],
  ["components/ui.tsx", "Shared primitives: Page, Card, Table, Badge, Code, Stats, Callout"],
  ["pages/Overview.tsx", "Thesis, boundary of ownership, real-vs-simulated callout"],
  ["pages/Web.tsx", "This page — the browser tier"],
  ["pages/Api.tsx", "Endpoint reference and request lifecycle"],
  ["pages/Data.tsx", "Schema, migrations and the audit trail"],
  ["pages/Web3.tsx", "Contract interface, invariants, gas and tests"],
  ["pages/Lifecycle.tsx", "Every state transition with its guard"],
  ["pages/Explorer.tsx", "Live endpoint caller driven by /api/meta"],
  ["lib/api.ts", "Typed fetch wrapper, same-origin credentials, error surfacing"],
];

export function Web() {
  return (
    <Page
      kicker="Components · 01"
      title="Web tier"
      lede="A single-page React application, statically built and served by nginx. It holds no secrets, makes no direct blockchain calls, and talks only to the JSON API behind the same origin."
    >
      <Table
        head={["Piece", "Version", "Role"]}
        rows={[
          ["React", "19.3.1", "Component model and rendering"],
          ["Vite", "8.3.8", "Dev server, production bundling, tree shaking"],
          ["Tailwind CSS", "4.3.5", "Utility styling via the first-party Vite plugin"],
          ["TypeScript", "5.9.3", "Strict typing across components and API payloads"],
        ]}
      />

      <Card title="Production bundle" tag="measured">
        <Code>{`dist/index.html                0.72 kB │ gzip:  0.47 kB
dist/assets/index-*.css      22.18 kB │ gzip:  5.10 kB
dist/assets/index-*.js      238.51 kB │ gzip: 74.31 kB`}</Code>
        <p>
          One JS chunk, no runtime dependency on a CDN, no webfont round-trip. On a cold load the
          page is interactive well under a second on a normal connection.
        </p>
      </Card>

      <Card title="Component map" tag="structure">
        <Table head={["File", "Responsibility"]} rows={COMPONENTS.map(([f, r]) => [<code className="font-mono text-[11px] text-accent">{f}</code>, r])} />
      </Card>

      <Card title="How the browser talks to the server" tag="data flow">
        <Code>{`fetch("/api/listings", { credentials: "same-origin" })
  → nginx :443 → proxy_pass 127.0.0.1:8310 → NestJS
  → JSON  → typed in lib/api.ts → rendered`}</Code>
        <List
          items={[
            "Same-origin requests only, so the session cookie travels without CORS games.",
            "No API base URL is compiled into the bundle; every path is relative.",
            "Failures surface in a dismissible toast rather than a blank screen.",
            "Nothing sensitive is bundled: no keys, no RPC URLs, no contract ABI secrets.",
          ]}
        />
      </Card>

      <Card title="Why Vite and not Next.js" tag="tradeoff">
        <p>
          This is an authenticated application, not a content site. There is no SEO surface to
          server-render — the interesting pages are behind a session. Next.js would add a Node
          process, a build cache and roughly 300 to 500 MB of runtime on a host that has about
          1 GB free and already serves another application.
        </p>
        <p>
          <Badge tone="slate">static files</Badge>{" "}
          <Badge tone="slate">no SSR process</Badge>{" "}
          <Badge tone="slate">nginx serves bytes</Badge>
        </p>
      </Card>
    </Page>
  );
}
