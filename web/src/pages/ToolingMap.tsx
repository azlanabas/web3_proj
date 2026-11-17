import { Badge, Card, List, Page, Table } from "../components/ui";

type Use = "Dependency" | "Reference" | "Not used" | "Deprecated";

const ROWS: [string, string, Use, string][] = [
  ["Alchemy", "RPC provider", "Dependency", "Sepolia endpoint; the key is verified and answers eth_chainId"],
  ["OpenZeppelin", "Contract library", "Dependency", "SafeERC20, ReentrancyGuard and the ERC20 base for the test token"],
  ["Etherscan", "Explorer", "Reference", "Linked for Sepolia USDC and the public explorer; no API integration"],
  ["MetaMask", "Wallet", "Not used", "No wallet connect — the browser holds no keys; the server signs demo transactions"],
  ["Infura", "RPC provider", "Not used", "Alchemy is the configured provider; one RPC is enough for this scope"],
  ["Chainlink", "Oracles / data feeds", "Not used", "The escrow prices in USDC and needs no external price feed"],
  ["Chainlink faucet", "Faucet", "Not used", "No Sepolia deployment yet, so no testnet ETH is required"],
  ["Sepolia faucet (Alchemy)", "Faucet", "Not used", "Same reason; kept as the first step when Sepolia is funded"],
  ["Google Sepolia faucet", "Faucet", "Not used", "Alternative source, same reason"],
  ["Rinkeby faucet", "Faucet", "Deprecated", "Rinkeby was shut down in 2022 — this bookmark is dead"],
  ["DeFiLlama", "DeFi analytics", "Not used", "TVL data for DeFi protocols; irrelevant to a vehicle escrow"],
  ["Chainlist", "Chain registry", "Not used", "Chain IDs are fixed in configuration: 31337 locally, 11155111 for Sepolia"],
  ["eth.converter", "Unit converter", "Not used", "Handy manually; the code converts wei/USDC in one place instead"],
  ["chainlink.docs", "Documentation", "Not used", "No oracle integration to document"],
  ["tokenization_bond", "Unrelated bookmark", "Not used", "Not part of this build"],
];

const tone = (use: Use) =>
  use === "Dependency" ? "emerald" : use === "Reference" ? "slate" : use === "Deprecated" ? "rose" : "slate";

export function ToolingMap() {
  return (
    <Page
      kicker="3 · The chain · 8 of 9"
      title="Tooling map: what is used, and what is not"
      lede="A typical Web3 bookmark bar has twenty tools. This build needs five. Here is every common one, whether it appears in this project, and the reason either way — including the one that no longer exists."
    >
      <Card title="The five things this project actually depends on" tag="the stack">
        <Table
          head={["Tool", "Role", "Where it appears"]}
          rows={[
            ["Foundry (forge, cast, anvil)", "Compile, test, deploy, local chain", "contracts/ and the anvil systemd unit"],
            ["viem", "Typed Ethereum client", "api/src/chain/chain.service.ts"],
            ["OpenZeppelin 5.7", "Audited contract primitives", "VehicleEscrow.sol, MockUSDC.sol"],
            ["Alchemy", "Hosted RPC for the public testnet path", "RPC_URL when not pointing at anvil"],
            ["siwe (EIP-4361)", "Wallet-signature authentication", "api/src/auth/auth.service.ts"],
          ]}
        />
        <p className="flex flex-wrap gap-2 pt-1">
          <Badge>Foundry</Badge>
          <Badge>viem</Badge>
          <Badge>OpenZeppelin</Badge>
          <Badge>Alchemy</Badge>
          <Badge>siwe</Badge>
        </p>
      </Card>

      <Card title="What is deliberately absent" tag="and why">
        <Table
          head={["Tool", "Why not"]}
          rows={[
            ["Hardhat", "Foundry covers compile, test and deploy with faster Solidity-native tests"],
            ["Ethers.js / web3.js", "viem is typed, tree-shakeable and already the client under wagmi"],
            ["MetaMask / WalletConnect", "No wallet connect in this MVP — the server signs; that is a known gap, not a choice to keep"],
            ["The Graph / Ponder", "One contract and one event stream: a 40-line getLogs indexer is enough"],
            ["IPFS", "Vehicle photos would use S3; no content-addressed storage is required"],
            ["Chainlink", "No price feed or oracle call exists in the escrow"],
            ["Gnosis Safe / multisig", "The arbiter is a single key today; a multisig is the obvious next hardening step"],
            ["Infura / QuickNode", "One RPC provider is configured; adding a second is only useful as a fallback"],
          ]}
        />
      </Card>

      <Card title="Every tool on the list, judged" tag="the bookmark bar">
        <Table
          head={["Tool", "Category", "Used here", "Reason"]}
          rows={ROWS.map(([name, cat, use, why]) => [
            name,
            cat,
            <Badge tone={tone(use) as "emerald" | "slate" | "rose"}>{use}</Badge>,
            why,
          ])}
        />
      </Card>

      <Card title="If asked &ldquo;why didn&rsquo;t you use X?&rdquo;" tag="answers">
        <List
          items={[
            "MetaMask — the MVP has no wallet connect; the browser never signs. That is the next milestone, not a design preference.",
            "Infura — Alchemy is configured; one provider is enough until there is traffic to split.",
            "Chainlink — nothing in the escrow needs an external feed. USDC is the unit of account.",
            "The Graph — one contract, one event stream. A hosted indexer would add a dependency for no gain at this size.",
            "DeFiLlama / Chainlist / eth.converter — reference sites, not dependencies. Chain IDs are fixed in env, unit conversion happens once in the service.",
          ]}
        />
      </Card>

      <Card title="The honest summary" tag="one line">
        <p>
          This project uses <strong>Foundry, viem, OpenZeppelin, Alchemy and siwe</strong>. Everything
          else on a typical bookmark bar is either a reference, a future step, or a tool for a
          different kind of product. A short dependency list is a feature in an MVP — each item you
          do not add is a thing you do not have to secure, upgrade or explain.
        </p>
      </Card>
    </Page>
  );
}
