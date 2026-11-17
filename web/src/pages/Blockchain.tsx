import { useEffect, useState } from "react";
import { Callout, Card, Code, List, Page, Table } from "../components/ui";
import { kickerFor } from "../nav";
import type { Block, Meta } from "../lib/meta";

export function Blockchain({ meta }: { meta: Meta | null }) {
  const [block, setBlock] = useState<Block | null>(null);
  useEffect(() => {
    fetch("/api/chain/block")
      .then((r) => r.json())
      .then((b: Block) => setBlock(b))
      .catch(() => setBlock({ available: false }));
  }, []);

  return (
    <Page
      kicker={kickerFor("blockchain")}
      title="Blockchain and the ledger"
      lede="What a block actually contains here, how blocks are chained, what the ledger is made of, and the honest answer to 'where is the distributed part?'"
    >
      <Card title="A real block from this chain" tag="live from /api/chain/block">
        <Table
          head={["Field", "Value", "What it is"]}
          rows={[
            ["number", block?.number ?? "…", "Its position in the chain"],
            ["hash", <code className="font-mono text-[10px]">{block?.hash ? block.hash.slice(0, 18) + "…" : "…"}</code>, "keccak-256 of the header"],
            ["parentHash", <code className="font-mono text-[10px]">{block?.parentHash ? block.parentHash.slice(0, 18) + "…" : "…"}</code>, "The previous block — this is the link"],
            ["stateRoot", <code className="font-mono text-[10px]">{block?.stateRoot ? block.stateRoot.slice(0, 18) + "…" : "…"}</code>, "Root of the world state after execution"],
            ["timestamp", block?.timestamp ?? "…", "Unix seconds; drives the release timeout"],
            ["gasUsed", block?.gasUsed ?? "…", "Zero when the block is empty, which anvil still mines on its timer"],
            ["transactions", block ? String(block.transactions ?? 0) : "…", "Blocks can be empty"],
          ]}
        />
      </Card>

      <Card title="What chains blocks together" tag="the actual mechanism">
        <Code>{`block N   header = { number, parentHash, stateRoot, timestamp, gasUsed, … }
          hash   = keccak256(header)

block N+1 header.parentHash = hash(N)`}</Code>
        <p>
          Each header contains the previous header&rsquo;s hash. Change a transaction in block N and
          its state root changes, so its hash changes, so every later <code className="font-mono text-[11px]">parentHash</code>{" "}
          is wrong. That is immutability: not a rule anyone enforces, just arithmetic that stops
          matching.
        </p>
        <p className="text-xs">
          Anvil has no consensus and no reorgs, so this property is never actually tested here. On
          Sepolia it is, every 12 seconds.
        </p>
      </Card>

      <Card title="What the ledger is made of" tag="state plus log">
        <Table
          head={["Part", "Contents", "In this app"]}
          rows={[
            ["World state", "Every account balance and contract storage slot", "USDC balances, escrow structs, allowances"],
            ["Transaction list", "The ordered transactions in each block", "fund, ship, confirm, refund, dispute"],
            ["Receipts", "Execution result plus emitted logs", "The API refuses to update the DB without one"],
            ["Logs", "Structured events, indexed by topic", "Read by the indexer into ChainEvent rows"],
          ]}
        />
        <p>
          The state is what makes the escrow enforceable; the logs are what makes it observable.
          This app depends on both: state for the money, logs for the history.
        </p>
      </Card>

      <Card title="The app has a second ledger" tag="event sourcing">
        <p>
          Every event is mirrored into a PostgreSQL table, <code className="font-mono text-[11px]">ChainEvent</code>,
          with a unique constraint on <code className="font-mono text-[11px]">(txHash, logIndex)</code>.
          It is append-only and idempotent — replaying the same log inserts nothing.
        </p>
        <List
          items={[
            "The chain is the authority for money; the database is a projection of it.",
            "Escrow status can be rebuilt by replaying events in block order.",
            "A restart does not lose history because the checkpoint is the last indexed block.",
            "Listings, users, sessions and photos never touch the chain — only settlement does.",
          ]}
        />
        <Code>{`SELECT "eventName", count(*) FROM "ChainEvent" GROUP BY 1;
-- Funded, Shipped, Released, Refunded, Disputed, EscrowCreated`}</Code>
      </Card>

      <Card title="Where is the distributed part?" tag="say it plainly">
        <Callout tone="slate" title="There isn't one, here.">
          <p>
            A blockchain is distributed because many independent nodes each hold a copy and agree on
            ordering. This deployment runs <strong>one</strong> anvil node on one machine. There are
            no peers, no replication, no consensus, and no independent verification — if the process
            dies, the state dies with it.
          </p>
          <p className="mt-2">
            What is genuine is the <em>structure</em>: hash-linked blocks, signed transactions,
            receipts, logs, and a state machine that cannot be argued with. That structure is what a
            public chain adds distribution to.
          </p>
        </Callout>
        <Table
          head={["Property", "Mainnet / Sepolia", "This anvil chain"]}
          rows={[
            ["Nodes holding a copy", "Thousands", "One"],
            ["Consensus", "Proof of Stake, validators", "None — a block timer"],
            ["Reorg risk", "Yes, until finality (~12.8 min)", "None"],
            ["Who can write", "Anyone with gas", "Anyone who can reach :8545"],
            ["Data availability", "Replicated", "A single process, in memory"],
          ]}
        />
      </Card>

      <Card title="Verify the chain" tag="commands">
        <Code>{`cast block-number --rpc-url http://127.0.0.1:8545
cast block 2137 --rpc-url http://127.0.0.1:8545 | grep -E "hash|parentHash"
cast block 2138 --rpc-url http://127.0.0.1:8545 | grep parentHash
# block 2138 parentHash == block 2137 hash`}</Code>
      </Card>
    </Page>
  );
}
