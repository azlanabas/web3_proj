import { Badge, Callout, Card, Code, List, Page, Table } from "../components/ui";

const TABLES: [string, string, string][] = [
  ["User", "id, walletAddress (unique), role, createdAt", "Wallet identity; role is BUYER, SELLER or OPERATOR"],
  ["Listing", "id, sellerId, title, make, model, year, vin, mileage, priceUsdc, status, deletedAt", "The vehicle. Soft-deleted, never hard-removed"],
  ["ListingImage", "id, listingId, s3Key, position", "Object-storage pointers, not blobs"],
  ["Escrow", "id, listingId, buyerId, sellerId, chainId, contractAddress, onchainId, amountUsdc, status, shippedAt, disputedAt, tx hashes", "The state machine, persisted"],
  ["ChainEvent", "id, txHash, logIndex, blockNumber, eventName, payload, processedAt", "Append-only audit trail"],
  ["SiweNonce", "id, nonce (unique), expiresAt, usedAt", "Single-use login challenges"],
];

export function Data() {
  return (
    <Page
      kicker="Components · 03"
      title="Data tier"
      lede="PostgreSQL 16 with Prisma. The database is a read model and an audit log — the chain, not the database, is the source of truth for money, which is exactly why every transition also writes an event row."
    >
      <Card title="Engine" tag="measured">
        <Table
          head={["Property", "Value"]}
          rows={[
            ["Engine", "PostgreSQL 16.15"],
            ["ORM", "Prisma 6.19.3 (client and CLI pinned together)"],
            ["Binding", "127.0.0.1:5432 — never exposed publicly"],
            ["Database", "web3proj, owned by role web3app"],
            ["Migrations", "2 applied, versioned in prisma/migrations"],
          ]}
        />
      </Card>

      <Card title="Tables" tag="schema">
        <Table head={["Table", "Columns", "Purpose"]} rows={TABLES.map(([t, c, p]) => [<code className="font-mono text-[11px] text-emerald-300">{t}</code>, <span className="font-mono text-[10px]">{c}</span>, p])} />
      </Card>

      <Card title="Money is never a float" tag="correctness">
        <Code>{`priceUsdc  Decimal @db.Decimal(20, 6)
amountUsdc Decimal @db.Decimal(20, 6)

-- accepted:  18500.000000
-- rejected:  12.1234567   (7 decimal places) → 400`}</Code>
        <p>
          USDC has six decimals. Storing money as a float would introduce rounding error that
          compounds through escrow arithmetic. Validation rejects anything with more than six
          decimal places before it reaches the database, and the column enforces it again.
        </p>
      </Card>

      <Card title="Audit trail" tag="append-only">
        <p>
          Every escrow transition writes a <code className="font-mono text-[11px]">ChainEvent</code>.
          The unique constraint on <code className="font-mono text-[11px]">(txHash, logIndex)</code>{" "}
          makes replay harmless: re-processing the same event is a no-op rather than a duplicate.
        </p>
        <List
          items={[
            "Events are ordered by insertion and rendered oldest-first in the UI.",
            "Payload carries the escrow id, so a single escrow can be reconstructed independently.",
            "This is the same shape a real indexer would persist after reading chain logs.",
          ]}
        />
      </Card>

      <Callout tone="emerald" title="Two roles, least privilege">
        <p>
          The application connects as <code className="font-mono text-[11px]">web3app_runtime</code>,
          which holds SELECT, INSERT, UPDATE and DELETE only — schema changes are denied. Migrations
          run as <code className="font-mono text-[11px]">web3app</code>, which owns the database and
          holds CREATEDB for Prisma shadow databases. Neither credential is in the repository.
        </p>
      </Callout>

      <Card title="Data lifecycle" tag="implemented">
        <p className="flex flex-wrap gap-2">
          <Badge>Nightly backups</Badge>
          <Badge>7-day rotation</Badge>
          <Badge>Soft delete</Badge>
          <Badge>Migration history</Badge>
          <Badge tone="slate">read replica — post-MVP</Badge>
        </p>
        <p className="text-xs text-slate-500">
          Backups run at 03:00 GMT+8 to /srv/web3proj/backups as compressed pg_dump archives with a
          seven-day retention window. A read replica is only meaningful once traffic justifies one.
        </p>
      </Card>
    </Page>
  );
}
