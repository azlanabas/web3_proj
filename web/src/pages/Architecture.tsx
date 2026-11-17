import { Card, Code, List, Page, Table } from "../components/ui";

const CONTRACTS: [string, string][] = [
  ["VehicleEscrow.sol", "214 lines — escrow state machine, 9 functions, 7 events, immutable arbiter"],
  ["MockUSDC.sol", "6-decimal ERC-20 used as test settlement currency on the local chain"],
  ["VehicleEscrow.t.sol", "23 tests: happy path, arbiter asymmetry, dispute gating, timeouts, reentrancy"],
  ["MockUSDC.sol (test)", "Mock token plus a malicious reentrant token used in the attack test"],
  ["foundry.toml", "solc 0.8.28, optimizer on, remappings for OpenZeppelin and forge-std"],
];

const API: [string, string][] = [
  ["main.ts", "Bootstrap: helmet, cookie-parser, global /api prefix, BigInt JSON, port 8310 on localhost"],
  ["app.module.ts", "Wires modules plus the global throttler guard"],
  ["prisma/schema.prisma", "6 models, enums, numeric(20,6) money, unique event index"],
  ["prisma/migrations/", "2 versioned migrations (init, escrow simulation fields)"],
  ["auth/auth.service.ts", "SIWE nonce issue and verify, single-use, domain check, user upsert"],
  ["auth/auth.guard.ts", "HMAC cookie → user lookup, attaches req.user"],
  ["auth/session.ts", "Signed session payload, 2h expiry, timing-safe compare"],
  ["listings/*", "Paginated list, detail, create, owner-only update, Zod schemas"],
  ["escrow/escrow.service.ts", "State machine + viem writes; simulated fallback when CHAIN_MODE != local"],
  ["chain/chain.service.ts", "viem clients, ABIs, role keys, write/read helpers, evm_increaseTime"],
  ["chain/indexer.service.ts", "getLogs from checkpoint → ChainEvent rows → status reconciliation"],
  ["demo/*", "Seeded vehicles and one-click session for the walkthrough"],
  ["meta/meta.controller.ts", "Self-description consumed by the API explorer"],
  ["common/*", "Zod pipe (400 on invalid) and throttler guard extension"],
];

const WEB: [string, string][] = [
  ["App.tsx", "Auth gate, hash routing, header controls, back-to-top"],
  ["nav.ts", "Section registry — 16 entries in 4 groups, single source of navigation"],
  ["lib/api.ts", "Typed fetch wrapper, same-origin credentials"],
  ["lib/auth.ts", "SHA-256 demo gate, 12h sessionStorage flag"],
  ["lib/meta.ts", "Types for /api/meta"],
  ["components/Sidebar.tsx", "Persistent navigation, blueprint link, chain-mode badge"],
  ["components/ui.tsx", "Page, Card, Table, Badge, Code, Stats, List, Callout"],
  ["components/EscrowPanel.tsx", "Vehicle picker, state bar, role actions, event log"],
  ["pages/*.tsx", "16 pages: overview, architecture, requirements, web, api, data, 4 Web3 pages, demo, explorer, security, operations, roadmap"],
  ["public/system.html", "Standalone printable blueprint; guarded by the same session flag"],
];

const OPS: [string, string][] = [
  ["web3proj-api.service", "systemd unit: node dist/main.js, 400 MB heap cap, auto-restart"],
  ["anvil.service", "systemd unit: local EVM on 127.0.0.1:8545, 1s block time"],
  ["nginx vhost", "TLS termination, static frontend, /api proxy to 127.0.0.1:8310"],
  ["cron.d/web3proj-backup", "Nightly pg_dump at 03:00 GMT+8, 7-day rotation"],
  ["scripts/backup-db.sh", "Compressed dump using the migration role"],
  ["scripts/redeploy-local.sh", "Redeploys contracts if the in-memory chain restarts"],
  [".github/workflows/ci.yml", "3 jobs: Foundry tests, API typecheck, web build"],
];

export function Architecture() {
  return (
    <Page
      kicker="Start · Architecture"
      title="Architecture: every component, and how it is built"
      lede="A complete inventory of what exists in this system, which tool produces each artefact, and the order the pieces were assembled in. If it is not on this page, it is not in the build."
    >
      <Card title="How the three artefacts are produced" tag="build pipeline">
        <Code>{`CONTRACTS                         API                              WEB
forge build                       npm ci                           npm ci
  └ solc 0.8.28                   npx prisma generate              npx tsc --noEmit
  └ out/*.json (abi+bytecode)       └ client into node_modules      npx vite build
forge test                          npx tsc -p tsconfig.json         └ dist/
  └ 23 tests                        └ dist/*.js                     └ index.html + assets
forge create                        systemd restart                 nginx serves
  └ address → .env                  └ node dist/main.js :8310        └ /api proxied`}</Code>
        <p>
          Nothing is containerised. Each artefact is produced by a tool on the host and supervised
          by systemd or nginx — a deliberate choice given 1 GB of free memory on a shared instance.
        </p>
      </Card>

      <Card title="Dependency graph" tag="what calls what">
        <Code>{`browser
  └── nginx ──/──────────────▶ web/dist (static React build)
        └──/api/*────────────▶ NestJS :8310
                                 ├── Prisma ──▶ PostgreSQL :5432
                                 ├── viem ────▶ anvil :8545
                                 │                └── VehicleEscrow + MockUSDC
                                 └── indexer ──▶ getLogs ──▶ ChainEvent rows

contracts/ ──deployed to──▶ anvil ──address written to──▶ api/.env`}</Code>
      </Card>

      <Card title="Contracts" tag="5 files">
        <Table head={["Component", "Role"]} rows={CONTRACTS.map(([f, r]) => [<code className="font-mono text-[11px]">{f}</code>, r])} />
      </Card>

      <Card title="API" tag="15 files">
        <Table head={["Component", "Role"]} rows={API.map(([f, r]) => [<code className="font-mono text-[11px]">{f}</code>, r])} />
      </Card>

      <Card title="Web" tag="23 files">
        <Table head={["Component", "Role"]} rows={WEB.map(([f, r]) => [<code className="font-mono text-[11px]">{f}</code>, r])} />
      </Card>

      <Card title="Operations" tag="7 files">
        <Table head={["Component", "Role"]} rows={OPS.map(([f, r]) => [<code className="font-mono text-[11px]">{f}</code>, r])} />
      </Card>

      <Card title="How it was built, in order" tag="sequence">
        <List
          items={[
            "Requirements reconstructed from a brief that specified none of the edge cases — captured as a gap register before any code.",
            "Escrow contract first, because the API's shape is dictated by the contract's events, not the reverse.",
            "Twenty-three Foundry tests before deployment, including a reentrancy attack.",
            "PostgreSQL schema and migrations, then SIWE auth, then listings, then the escrow service.",
            "Real chain settlement: anvil, contract deployment, viem writes, then the log indexer.",
            "Frontend last, built against a working loop rather than mocks.",
            "Hardening: rate limits, least-privilege DB role, backups, CI.",
            "Documentation: this walkthrough plus a standalone printable blueprint.",
          ]}
        />
      </Card>

      <Card title="Configuration surface" tag="no secrets in git">
        <Code>{`CHAIN_MODE      local | simulated      fallback switch
RPC_URL         http://127.0.0.1:8545   chain endpoint
CHAIN_ID        31337                  anvil
CONTRACT_ADDRESS 0xCf7E…0Fc9           escrow
TOKEN_ADDRESS    0x9fE4…a6e0           test USDC
DATABASE_URL    …web3app_runtime       DML-only runtime role
MIGRATE_DATABASE_URL …web3app          owner, migrations only
SESSION_SECRET  32 bytes               HMAC for session cookies
*_PRIVATE_KEY   anvil accounts         demo signers
SIWE_DOMAIN     web3.heurist.online    EIP-4361 domain check`}</Code>
        <p className="text-xs">
          Stored in <code className="font-mono text-[11px]">/srv/web3proj/api/.env</code> at mode 600.
          The repository contains <code className="font-mono text-[11px]">.env.example</code> with
          names only.
        </p>
      </Card>

      <Card title="Testing" tag="two layers">
        <Table
          head={["Layer", "Tool", "Coverage"]}
          rows={[
            ["Contract", "forge test", "23 tests, invariants and adversarial token"],
            ["API", "Node e2e script", "nonce → sign → session → create → list → 401/400 paths"],
            ["Web", "tsc --noEmit", "Strict typecheck on every build"],
            ["CI", "GitHub Actions", "All three on every push"],
          ]}
        />
      </Card>
    </Page>
  );
}
