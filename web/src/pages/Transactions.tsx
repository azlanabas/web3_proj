import { Callout, Card, Code, List, Page, Table } from "../components/ui";

export function Transactions() {
  return (
    <Page
      kicker="Web3 · 4 of 4"
      title="Transaction lifecycle and indexing"
      lede="A click becomes a signed transaction, a mined block, a receipt, a log, a database row and finally a state change on screen. Nothing is written to the database that the chain did not first confirm."
    >
      <Card title="The path of one action" tag="end to end">
        <Code>{`browser  POST /api/escrows/:id/fund
   │
   ▼
NestJS   EscrowService.fund()
   │      1. load escrow, check state == CREATED
   │      2. check actor is the buyer (role rule)
   │      3. read USDC allowance; approve if short
   ▼
viem     walletClient.writeContract({ functionName: "fund" })
   │      4. sign locally with the buyer key
   │      5. eth_sendRawTransaction
   ▼
anvil    mempool → block (1s) → execution
   │      6. state mutated, logs emitted
   ▼
viem     waitForTransactionReceipt(hash)
   │      7. status must be "success", else the API returns 400
   ▼
API      8. update escrow.status = FUNDED, store fundTx
         9. indexer.sync() → getLogs → decode → ChainEvent row
   ▼
browser  refetch → state bar advances, event appears`}</Code>
      </Card>

      <Card title="Where the truth lives" tag="ordering">
        <List
          items={[
            "The chain executes first. The API waits for a receipt before touching Postgres.",
            "If the transaction reverts, nothing is written and the client gets a 400 with the reason.",
            "The database mirrors chain state; it is a read model, not the authority.",
            "Every state change also produces a log, so the database can be rebuilt from the chain alone.",
          ]}
        />
        <p className="text-xs text-muted">
          This ordering is the difference between an app that uses a blockchain and an app that
          merely stores hashes. Ours refuses to advance state until the receipt confirms.
        </p>
      </Card>

      <Card title="The indexer" tag="logs, not polling">
        <Code>{`checkpoint = max(ChainEvent.blockNumber)  ?? contract deploy block
logs       = getLogs(contract, from = checkpoint + 1, to = latest)
for each log:
  decodeEventLog(abi, data, topics)        → eventName + args
  INSERT ChainEvent (txHash, logIndex)     → UNIQUE makes replay a no-op
  UPDATE escrow SET status = f(eventName)  → idempotent`}</Code>
        <Table
          head={["Property", "How"]}
          rows={[
            ["Checkpoint", "Highest indexed block number; survives restarts"],
            ["Idempotency", "Unique (txHash, logIndex) — re-processing inserts nothing"],
            ["Interval", "Every 4 seconds, plus immediately after each write"],
            ["Scope", "Only the escrow contract address"],
            ["Failure", "Logs a warning and retries on the next tick; never throws into the request"],
          ]}
        />
      </Card>

      <Card title="Failure modes handled" tag="what breaks and how">
        <Table
          head={["Failure", "Behaviour"]}
          rows={[
            ["Illegal state transition", "400 before any transaction is sent — expected FUNDED, got CREATED"],
            ["Transaction reverts", "Receipt status is reverted; API returns 400, database untouched"],
            ["Insufficient allowance", "Service sends approve first, then retries the action"],
            ["Process restart", "Indexer resumes from its checkpoint; no duplicate events"],
            ["Chain unreachable", "Requests fail fast; CHAIN_MODE=simulated keeps the demo alive"],
          ]}
        />
      </Card>

      <Card title="Verify a transaction yourself" tag="cast">
        <Code>{`cast receipt <TX_HASH> --rpc-url http://127.0.0.1:8545
cast logs --address 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9 \\
  --from-block 1 --rpc-url http://127.0.0.1:8545`}</Code>
      </Card>

      <Callout tone="slate" title="Not yet implemented: reorg handling">
        <p>
          The local chain has instant finality, so confirmations are not required. On a public
          network a terminal state should wait for a confirmation depth — otherwise a reorg could
          reverse a release after the database already recorded it. This is written down as a known
          gap rather than assumed away.
        </p>
      </Callout>
    </Page>
  );
}
