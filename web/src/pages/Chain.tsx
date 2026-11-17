import { Callout, Card, Code, List, Page, Stats, Table } from "../components/ui";
import { kickerFor } from "../nav";
import type { Meta } from "../lib/meta";

export function Chain({ meta }: { meta: Meta | null }) {
  return (
    <Page
      kicker={kickerFor("chain")}
      title="Chains and networks"
      lede="Ethereum is a state machine: accounts hold balances, transactions mutate state, and every mutation produces a receipt with logs. This escrow uses that machine for exactly one thing — deciding when money moves."
    >
      <Stats
        items={[
          { value: "31337", label: "active chain id (local anvil)" },
          { value: "11155111", label: "Sepolia, the public target" },
          { value: "~12 s", label: "block time on Sepolia" },
          { value: "23/23", label: "contract tests before deployment" },
        ]}
      />

      <Card title="Networks" tag="three targets, one code path">
        <Table
          head={["Network", "Chain id", "RPC", "Status", "Purpose"]}
          rows={[
            ["Ethereum Sepolia", "11155111", <code className="font-mono text-[10px]">public RPC</code>, "Active", "Live settlement network; real transactions and gas"],
            ["Ethereum mainnet", "1", <code className="font-mono text-[10px]">—</code>, "Not used", "Real money; requires an audit first"],
          ]}
        />
        <p className="flex flex-wrap gap-3">
          <a href="https://sepolia.etherscan.io" target="_blank" rel="noreferrer" className="font-mono text-[11px] text-accent underline-offset-4 hover:underline">sepolia.etherscan.io ↗</a>
          <a href="https://etherscan.io" target="_blank" rel="noreferrer" className="font-mono text-[11px] text-accent underline-offset-4 hover:underline">etherscan.io ↗</a>
          <a href="https://book.getfoundry.sh/anvil/" target="_blank" rel="noreferrer" className="font-mono text-[11px] text-accent underline-offset-4 hover:underline">anvil docs ↗</a>
        </p>
        <p>
          The application code does not know which one it is talking to. Switching networks is
          four environment values: <code className="font-mono text-[11px]">RPC_URL</code>,{" "}
          <code className="font-mono text-[11px]">CHAIN_ID</code>,{" "}
          <code className="font-mono text-[11px]">CONTRACT_ADDRESS</code> and{" "}
          <code className="font-mono text-[11px]">TOKEN_ADDRESS</code>.
        </p>
      </Card>


      <Card title="Anvil today, Sepolia next: what actually changes" tag="be precise">
        <Table
          head={["Property", "anvil (today)", "Sepolia", "mainnet"]}
          rows={[
            ["Consensus", "None — a block timer", "Proof of Stake, real validators", "Proof of Stake, real money"],
            ["Block time", "1 second", "~12 seconds", "~12 seconds"],
            ["Finality", "Immediate", "~12.8 minutes", "~12.8 minutes"],
            ["Reorg risk", "Zero", "Real until finality", "Real until finality"],
            ["Cost to run", "Free", "Free test ETH, real gas mechanics", "Real ETH"],
            ["Who can verify", "Anyone with access to this host", "Anyone — public explorer", "Anyone"],
            ["Contract verification", "Not possible", "Etherscan source verification", "Etherscan source verification"],
            ["Data availability", "One process, in memory", "Replicated across nodes", "Replicated across nodes"],
          ]}
        />
        <p>
          The application code is identical in all three. What changes is four environment values
          (<code className="font-mono text-[11px]">RPC_URL</code>,{" "}
          <code className="font-mono text-[11px]">CHAIN_ID</code>,{" "}
          <code className="font-mono text-[11px]">CONTRACT_ADDRESS</code>,{" "}
          <code className="font-mono text-[11px]">TOKEN_ADDRESS</code>) and the presence of a funded
          key. The deployment script in <code className="font-mono text-[11px]">scripts/deploy-sepolia.sh</code>{" "}
          does exactly that swap.
        </p>
        <p className="text-xs">
          Mainnet is the same switch again, but it requires an independent audit first — that is the
          gating item, not the configuration.
        </p>
      </Card>

      <Card title="Why the build started on a local chain" tag="history">
        <List
          items={[
            "Sepolia requires testnet ETH for gas; every faucet needs a browser session or a mainnet balance.",
            "A local chain gives deterministic accounts, so the flow runs without a wallet extension.",
            "Blocks are mined on demand, so the 14-day timeout can be exercised with evm_increaseTime instead of waiting.",
            "The transaction path is identical: real signing, real broadcast, real receipts, real logs.",
          ]}
        />
        <p className="text-xs text-muted">
          What it does not prove: mempool contention, reorgs, or gas-price spikes on a public
          network. Those are the reasons Sepolia comes next.
        </p>
      </Card>

      <Card title="Accounts on the network" tag="roles">
        <Table
          head={["Role", "Address", "Holds key", "Power"]}
          rows={[
            ["Arbiter / deployer", <code className="font-mono text-[10px]">{meta?.chain.accounts.arbiter ?? "…"}</code>, "API env (mode 600)", "Refund, and release only inside a dispute"],
            ["Seller", <code className="font-mono text-[10px]">{meta?.chain.accounts.seller ?? "…"}</code>, "API env (mode 600)", "Marks shipped, receives funds"],
            ["Buyer", <code className="font-mono text-[10px]">{meta?.chain.accounts.buyer ?? "…"}</code>, "API env (mode 600)", "Funds, confirms, disputes"],
            ["Escrow contract", <code className="font-mono text-[10px]">{meta?.chain.escrow ?? "…"}</code>, "—", "Holds funds, enforces rules"],
          ]}
        />
        <p className="text-xs text-muted">
          On a public network the buyer and seller keys belong to users&apos; wallets, not the
          server. Only the arbiter key stays server-side.
        </p>
      </Card>

      <Card title="Inspect it yourself" tag="cast">
        <Code>{`# chain is alive
cast chain-id --rpc-url http://127.0.0.1:8545        # 31337
cast block-number --rpc-url http://127.0.0.1:8545

# escrow state for escrow #1
cast call $ESCROW \\
  "getEscrow(uint256)(address,address,uint256,uint64,uint64,uint8)" 1 \\
  --rpc-url http://127.0.0.1:8545`}</Code>
      </Card>

      <Callout tone="slate" title="EVM concepts this project actually relies on">
        <p>
          Externally owned accounts sign transactions with a private key; contracts hold code and
          storage and cannot initiate. A transaction has a nonce, consumes gas, and returns a
          receipt containing logs. Logs are how the indexer learns what happened without polling
          contract state — which is why the database can be rebuilt from them.
        </p>
      </Callout>

      <Card title="Concepts that apply here" tag="and ones that do not">
        <Table
          head={["Concept", "Status on this deployment"]}
          rows={[
            ["ETH", "Used for gas only; the escrow holds USDC, never ETH"],
            ["Gas", "Real testnet gas, paid in worthless Sepolia ETH"],
            ["Accounts / EOA", "Three signer accounts, keys held by the service"],
            ["Transactions and receipts", "Every action is signed; the API waits for the receipt"],
            ["Event logs", "Read back by the indexer into an append-only table"],
            ["Proof of Stake", "Secures Sepolia; validators stake and attest"],
            ["Finality", "~12.8 minutes on Sepolia after two epochs"],
            ["Sequencer", "Ethereum validators order transactions; no single operator"],
            ["Rollups / L2", "Not used — this is an L1 testnet deployment"],
            ["ZK / fraud proofs", "Not used — not a rollup"],
          ]}
        />
      </Card>
    </Page>
  );
}
