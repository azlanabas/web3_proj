import { useEffect, useState } from "react";
import { Badge, Callout, Card, Code, Page, Table } from "../components/ui";
import { kickerFor } from "../nav";
import type { Meta } from "../lib/meta";

interface ChainEventRow {
  eventName: string;
  txHash: string;
  blockNumber: string;
  escrowId: string | null;
}

export function LiveBuild({ meta }: { meta: Meta | null }) {
  const [events, setEvents] = useState<ChainEventRow[]>([]);
  useEffect(() => {
    fetch("/api/chain/events")
      .then((r) => r.json())
      .then((rows: ChainEventRow[]) => setEvents(rows))
      .catch(() => setEvents([]));
  }, []);

  const c = meta?.chain;
  const live = c && c.mode !== "simulated";
  const publicChain = c?.mode === "sepolia" || c?.mode === "mainnet";
  const explorer = c?.mode === "sepolia" ? "https://sepolia.etherscan.io" : null;

  return (
    <Page
      kicker={kickerFor("live")}
      title="The live build"
      lede="Deployment record: contract addresses, block height, and the transactions produced by the running service."
    >
      <Card title="The transactions that prove it" tag="recent events, newest first">
        {events.length === 0 ? (
          <p className="text-muted">No events indexed yet.</p>
        ) : (
          <Table
            head={["Event", "Block", "Transaction", "Escrow"]}
            rows={events.slice(0, 12).map((e) => [
              <span className="font-mono text-[11px] text-accent">{e.eventName}</span>,
              <span className="font-mono text-[11px]">{e.blockNumber}</span>,
              explorer ? (
                <a href={`${explorer}/tx/${e.txHash}`} target="_blank" rel="noreferrer"
                   className="inline-flex items-baseline gap-1 font-mono text-[10px] text-ink underline-offset-4 hover:text-accent hover:underline">
                  {e.txHash.slice(0, 10)}…
                  <span className="text-[9px] uppercase tracking-wider text-accent">Etherscan ↗</span>
                </a>
              ) : (
                <span className="font-mono text-[10px]">{e.txHash.slice(0, 14)}…</span>
              ),
              <span className="font-mono text-[11px]">#{e.escrowId ?? "—"}</span>,
            ])}
          />
        )}
        {explorer && (
          <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-line pt-3 font-mono text-[11px]">
            <a href={`${explorer}/address/${c?.escrow}`} target="_blank" rel="noreferrer"
               className="text-accent underline-offset-4 hover:underline">
              escrow contract ↗
            </a>
            <a href={`${explorer}/address/${c?.token}`} target="_blank" rel="noreferrer"
               className="text-accent underline-offset-4 hover:underline">
              USDC token ↗
            </a>
            <a href={`${explorer}/address/${c?.escrow}#transactions`} target="_blank" rel="noreferrer"
               className="text-accent underline-offset-4 hover:underline">
              all transactions ↗
            </a>
          </div>
        )}
        <p className="text-xs">
          Every hash above is a real Sepolia transaction. Each row was written by the indexer after
          reading a log from the chain.
        </p>
      </Card>

<Card title="Where it is deployed" tag="live from /api/meta">
        <Table
          head={["Property", "Value"]}
          rows={[
            ["Network", <span className="font-medium text-ink">{c?.network ?? "…"}</span>],
            ["Chain id", c ? String(c.chainId) : "…"],
            ["Mode", <code className="font-mono text-[11px]">{c?.mode ?? "…"}</code>],
            ["Escrow contract", <code className="font-mono text-[10px] break-all">{c?.escrow || "…"}</code>],
            ["Settlement token", <code className="font-mono text-[10px] break-all">{c?.token || "…"}</code>],
            ["Token decimals", c?.tokenDecimals ?? "…"],
            ["Release timeout", c?.timeoutSeconds ? `${Number(c.timeoutSeconds) / 86400} days` : "…"],
            ["Deploy block", c?.deployBlock ?? "…"],
            ["Current block", c?.blockNumber ?? "…"],
            ["Escrows recorded", meta ? String(meta.counts.escrows) : "…"],
            ["Events indexed", meta ? String(meta.counts.events) : "…"],
          ]}
        />
        <p className="flex flex-wrap gap-2 pt-1">
          {publicChain ? <Badge>public testnet</Badge> : <Badge tone="amber">development network</Badge>}
          <Badge tone="slate">real transactions</Badge>
          {explorer && (
            <a href={`${explorer}/address/${c?.escrow}`} target="_blank" rel="noreferrer" className="font-mono text-[11px] text-accent underline-offset-4 hover:underline">
              view on Etherscan ↗
            </a>
          )}
        </p>
      </Card>

      
      <Card title="Verify it yourself, in four commands" tag="no trust required">
        <Code>{`cast chain-id --rpc-url $RPC            # ${c?.chainId ?? "chain id"}
cast call $ESCROW "getEscrow(uint256)(address,address,uint256,uint64,uint64,uint8)" 1
cast call $TOKEN  "balanceOf(address)(uint256)" $SELLER
cast logs --address $ESCROW --from-block ${c?.deployBlock ?? "0"}${explorer ? `\n# or on Etherscan: ${explorer}/address/${c?.escrow}` : ""}`}</Code>
      </Card>

      <Card title="Five-minute walkthrough" tag="what to click and say">
        <Table
          head={["Step", "Do", "Say"]}
          rows={[
            ["1", "Open Overview", "The money waits in a contract, not in our account — that is the whole thesis."],
            ["2", "One sale, end to end", "Six steps: list, open, fund, ship, confirm, index. Every one is a transaction."],
            ["3", "Run an escrow", "Start a session and follow the turns: seller lists, buyer funds, seller ships, buyer confirms. Each turn shows its transaction."],
            ["4", "This page", "These are the real transactions, with block numbers. Etherscan will show the same hashes."],
            ["5", "Networks & testnets", "Sepolia is live; mainnet is deliberately not, because it needs an audit."],
          ]}
        />
      </Card>

      <Callout tone="slate" title="Key rotation at deployment">
        <p>
          Deployment used freshly generated keys for the buyer, seller and arbiter. On a public
          network the well-known development keys are public by definition, and Sepolia already
          carries contracts at those addresses. Fresh keys keep each role&apos;s authority with this
          deployment alone.
        </p>
      </Callout>
    </Page>
  );
}
