import { Callout, Card, Code, List, Page, Table } from "../components/ui";

export function Blockchain() {
  return (
    <Page
      kicker="Web3 · 4 of 10"
      title="Blockchain and the ledger"
      lede="What a block actually contains here, how blocks are chained, what the ledger is made of, and the honest answer to 'where is the distributed part?'"
    >
      <Card title="A real block from this chain" tag="measured">
        <Table
          head={["Field", "Value", "What it is"]}
          rows={[
            ["number", "2138", "Its position in the chain"],
            ["hash", <code className="font-mono text-[10px]">0xc00fc2c15f69…</code>, "keccak-256 of the header"],
            ["parentHash", <code className="font-mono text-[10px]">0xe1458166da0e…</code>, "The hash of block 2137 — this is the link"],
            ["stateRoot", <code className="font-mono text-[10px]">0x2d73596160b3…</code>, "Root of the world state after execution"],
            ["timestamp", "1796143973", "Unix seconds; drives the 14-day timeout"],
            ["gasUsed", "0", "This one is empty — anvil mines on a 1s timer regardless"],
            ["transactions", "0", "Blocks can be empty; ours often are"],
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
