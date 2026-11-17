import { Badge, Callout, Card, Code, Page, Table } from "../components/ui";
import { kickerFor } from "../nav";
import type { Meta } from "../lib/meta";

type Status = "Active" | "Ready" | "Reference" | "Retired" | "Alternative";

const tone = (s: Status) =>
  s === "Active" ? "emerald" : s === "Ready" ? "amber" : s === "Retired" ? "rose" : "slate";

export function Networks({ meta }: { meta: Meta | null }) {
  const mode = meta?.web3.chainMode ?? "local";
  const chain = meta?.web3.chain ?? "Anvil (local EVM)";
  const chainId = meta?.web3.chainId ?? 31337;
  const contract = meta?.web3.escrowContract ?? "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
  const token = meta?.web3.tokenAddress ?? "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

  return (
    <Page
      kicker={kickerFor("networks")}
      title="Networks and testnets"
      lede="Every network this project has touched, what runs on it, and its status. The badge in the header reads directly from /api/meta, so it can only ever show the network the API is actually pointed at."
    >
      <Card title="Right now" tag="live from /api/meta">
        <Table
          head={["Property", "Value"]}
          rows={[
            ["Active network", <span className="font-medium text-ink">{chain}</span>],
            ["Chain id", String(chainId)],
            ["Mode", <code className="font-mono text-[11px]">{mode}</code>],
            ["Escrow contract", <code className="font-mono text-[10px]">{contract}</code>],
            ["Settlement token", <code className="font-mono text-[10px]">{token}</code>],
            ["Settlement", meta?.web3.settlement ?? "on-chain"],
          ]}
        />
        <p className="text-xs">
          A header badge reading &ldquo;anvil&rdquo; is a statement of fact about this deployment, not a
          typo. It changes to &ldquo;sepolia&rdquo; the moment the deployment script repoints the API.
        </p>
      </Card>

      <Card title="Every network touched" tag="status and evidence">
        <Table
          head={["Network", "Chain id", "Status", "What is there", "Explorer"]}
          rows={[
            [
              "Anvil (local EVM)",
              "31337",
              <Badge tone={tone("Active") as "emerald"}>Active</Badge>,
              <span>
                Escrow <code className="font-mono text-[10px]">0xCf7E…0Fc9</code>, test USDC{" "}
                <code className="font-mono text-[10px]">0x9fE4…a6e0</code>. Every escrow in the app
                lives here.
              </span>,
              <span className="text-[11px] text-faint">none — local process</span>,
            ],
            [
              "Ethereum Sepolia",
              "11155111",
              <Badge tone={tone("Ready") as "amber"}>Ready</Badge>,
              <span>
                Deployer <code className="font-mono text-[10px]">0x8f45…63a3</code> generated and
                funded path scripted; Circle USDC address verified on-chain; Alchemy RPC verified.
                Awaiting 0.01 test ETH.
              </span>,
              <a href="https://sepolia.etherscan.io" target="_blank" rel="noreferrer" className="font-mono text-[10px] text-accent underline-offset-4 hover:underline">
                sepolia.etherscan.io ↗
              </a>,
            ],
            [
              "Ethereum mainnet",
              "1",
              <Badge tone={tone("Reference") as "slate"}>Reference</Badge>,
              <span>Listed for the USDC contract address only. Not used — requires an independent audit and real ETH.</span>,
              <a href="https://etherscan.io" target="_blank" rel="noreferrer" className="font-mono text-[10px] text-accent underline-offset-4 hover:underline">
                etherscan.io ↗
              </a>,
            ],
            [
              "Rinkeby",
              "4",
              <Badge tone={tone("Retired") as "rose"}>Retired</Badge>,
              <span>Never used here. The testnet was shut down in 2022; the bookmark in the tooling list is dead.</span>,
              <span className="text-[11px] text-faint">gone</span>,
            ],
            [
              "Goerli",
              "5",
              <Badge tone={tone("Retired") as "rose"}>Retired</Badge>,
              <span>Never used. Deprecated in favour of Sepolia; clients withdrew support in 2024.</span>,
              <span className="text-[11px] text-faint">gone</span>,
            ],
            [
              "Base Sepolia / Arbitrum Sepolia",
              "84532 / 421614",
              <Badge tone={tone("Alternative") as "slate"}>Alternative</Badge>,
              <span>
                Considered as cheaper L2 targets. Not used: an L2 adds a sequencer and a bridge to
                reason about, which is a second system to explain.
              </span>,
              <span className="text-[11px] text-faint">not deployed</span>,
            ],
          ]}
        />
      </Card>

      <Card title="Why anvil is still the active one" tag="the honest reason">
        <p>
          Not architecture — funding. Every faucet for a public testnet requires a browser session, a
          social login, or a mainnet balance. The deployment is written and refuses to run unfunded,
          which is why the header says <code className="font-mono text-[11px]">anvil</code>.
        </p>
        <Code>{`scripts/deploy-sepolia.sh
  → checks deployer balance, exits with an address if unfunded
  → tops up buyer and seller for gas
  → deploys ERC-20 + escrow on Sepolia
  → mints test USDC to the buyer
  → rewrites CHAIN_MODE/RPC_URL/CHAIN_ID/addresses
  → restarts the API and reindexes from the deploy block`}</Code>
        <p className="text-xs">
          The same script is the mainnet path, with one difference: mainnet needs a funded account and
          an audit first.
        </p>
      </Card>

      <Callout tone="slate" title="What the header badge proves">
        <p>
          It is rendered from <code className="font-mono text-[11px]">/api/meta</code>, which is
          generated by the running API from its own environment. Nobody types it, so it cannot claim a
          network the service is not on.
        </p>
      </Callout>
    </Page>
  );
}
