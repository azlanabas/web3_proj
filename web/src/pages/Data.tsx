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

      <Callout tone="amber" title="Known gap: the app role owns the database">
        <p>
          <code className="font-mono text-[11px]">web3app</code> owns the database and holds
          CREATEDB so Prisma can build a shadow database during migrations. For production this
          should be split into a migration role and a runtime role with DML only.
        </p>
      </Callout>

      <Card title="Not yet present" tag="honest">
        <p className="flex flex-wrap gap-2">
          <Badge tone="rose">no backups</Badge>
          <Badge tone="rose">no log rotation</Badge>
          <Badge tone="rose">no read replica</Badge>
          <Badge tone="slate">soft delete implemented</Badge>
        </p>
      </Card>
    </Page>
  );
}
