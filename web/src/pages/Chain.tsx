import { Callout, Card, Code, List, Page, Stats, Table } from "../components/ui";

export function Chain() {
  return (
    <Page
      kicker="Web3 · 3 of 11"
      title="Chain and networks"
      lede="Ethereum is a state machine: accounts hold balances, transactions mutate state, and every mutation produces a receipt with logs. This escrow uses that machine for exactly one thing — deciding when money moves."
    >
      <Stats
        items={[
          { value: "31337", label: "active chain id (local anvil)" },
          { value: "11155111", label: "Sepolia, the public target" },
          { value: "1 s", label: "block time on the demo chain" },
          { value: "23/23", label: "contract tests before deployment" },
        ]}
      />

      <Card title="Networks" tag="three targets, one code path">
        <Table
          head={["Network", "Chain id", "RPC", "Status", "Purpose"]}
          rows={[
            ["Anvil (local EVM)", "31337", <code className="font-mono text-[10px]">127.0.0.1:8545</code>, "Active", "Runs the live demo; deterministic accounts, instant blocks"],
            ["Ethereum Sepolia", "11155111", <code className="font-mono text-[10px]">Alchemy</code>, "Configured", "Public testnet; needs a funded key, same contracts"],
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

      <Card title="Why start on a local chain" tag="deliberate">
        <List
          items={[
            "Sepolia requires testnet ETH for gas; every faucet needs a browser session or a mainnet balance.",
            "A local chain gives deterministic accounts, so the demo works without a wallet extension.",
            "Blocks are mined on demand, so the 14-day timeout can be exercised with evm_increaseTime instead of waiting.",
            "The transaction path is identical: real signing, real broadcast, real receipts, real logs.",
          ]}
        />
        <p className="text-xs text-muted">
          What it does not prove: mempool contention, reorgs, or gas-price spikes on a public
          network. Those are the reasons Sepolia comes next.
        </p>
      </Card>

      <Card title="Accounts on the demo chain" tag="roles">
        <Table
          head={["Role", "Address", "Holds key", "Power"]}
          rows={[
            ["Arbiter / deployer", <code className="font-mono text-[10px]">0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266</code>, "API env (mode 600)", "Refund, and release only inside a dispute"],
            ["Seller", <code className="font-mono text-[10px]">0x70997970C51812dc3A010C7d01b50e0d17dc79C8</code>, "API env (mode 600)", "Marks shipped, receives funds"],
            ["Buyer", <code className="font-mono text-[10px]">0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC</code>, "API env (mode 600)", "Funds, confirms, disputes"],
            ["Escrow contract", <code className="font-mono text-[10px]">0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9</code>, "—", "Holds funds, enforces rules"],
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
cast call 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9 \\
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
    </Page>
  );
}
