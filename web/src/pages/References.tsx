import { Card, Page, Table } from "../components/ui";

interface Row {
  name: string;
  what: string;
  url: string;
}

const SECTIONS: { title: string; tag: string; rows: Row[] }[] = [
  {
    title: "Explorers",
    tag: "see it on-chain",
    rows: [
      { name: "Sepolia Etherscan", what: "Public testnet explorer — addresses, transactions, contracts", url: "https://sepolia.etherscan.io" },
      { name: "Etherscan (mainnet)", what: "Production explorer", url: "https://etherscan.io" },
      { name: "Sepolia USDC on Etherscan", what: "The Circle testnet token this project would use", url: "https://sepolia.etherscan.io/address/0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" },
      { name: "Mainnet USDC on Etherscan", what: "Reference only — not used here", url: "https://etherscan.io/address/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
    ],
  },
  {
    title: "Standards",
    tag: "the specifications behind the code",
    rows: [
      { name: "EIP-20 (ERC-20)", what: "The token interface: transfer, approve, allowance, decimals", url: "https://eips.ethereum.org/EIPS/eip-20" },
      { name: "EIP-4361 (SIWE)", what: "Sign-In With Ethereum — the message format used for auth", url: "https://eips.ethereum.org/EIPS/eip-4361" },
      { name: "EIP-1559", what: "Fee market: base fee plus priority fee, maxFeePerGas", url: "https://eips.ethereum.org/EIPS/eip-1559" },
      { name: "EIP-721 (ERC-721)", what: "NFT standard — not used, listed because it is often confused with titles", url: "https://eips.ethereum.org/EIPS/eip-721" },
    ],
  },
  {
    title: "Ethereum itself",
    tag: "protocol reading",
    rows: [
      { name: "ethereum.org — networks", what: "Mainnet, Sepolia and testnet guidance", url: "https://ethereum.org/en/developers/docs/networks/" },
      { name: "Proof of Stake", what: "Validators, attestations, epochs", url: "https://ethereum.org/en/developers/docs/consensus-mechanisms/pos/" },
      { name: "Staking rewards and penalties", what: "What slashing is and when it applies", url: "https://ethereum.org/en/developers/docs/consensus-mechanisms/pos/rewards-and-penalties/" },
      { name: "EVM opcodes", what: "What the bytecode actually executes", url: "https://ethereum.org/en/developers/docs/evm/opcodes/" },
      { name: "Rollups", what: "L2s, sequencers and how they settle to L1", url: "https://ethereum.org/en/developers/docs/scaling/zk-rollups/" },
    ],
  },
  {
    title: "Tooling used here",
    tag: "the actual dependencies",
    rows: [
      { name: "Foundry book", what: "forge, cast, anvil — build, test, inspect, run a chain", url: "https://book.getfoundry.sh" },
      { name: "anvil reference", what: "The local chain this project runs on", url: "https://book.getfoundry.sh/anvil/" },
      { name: "Solidity docs", what: "Language reference for 0.8.x", url: "https://docs.soliditylang.org" },
      { name: "OpenZeppelin Contracts 5.x", what: "SafeERC20, ReentrancyGuard, ERC20 base", url: "https://docs.openzeppelin.com/contracts/5.x/" },
      { name: "viem", what: "Typed Ethereum client — every chain call in the API", url: "https://viem.sh" },
      { name: "siwe", what: "The npm package implementing EIP-4361", url: "https://github.com/spruceid/siwe" },
    ],
  },
  {
    title: "Infrastructure",
    tag: "nodes and funding",
    rows: [
      { name: "Alchemy", what: "RPC provider; the Sepolia key is verified against this endpoint", url: "https://www.alchemy.com" },
      { name: "Alchemy Sepolia faucet", what: "Testnet ETH for gas", url: "https://www.alchemy.com/faucets/ethereum-sepolia" },
      { name: "Google Cloud Web3 faucet", what: "Alternative Sepolia ETH source", url: "https://cloud.google.com/application/web3/faucet/ethereum/sepolia" },
      { name: "Circle USDC docs", what: "Official token addresses per network and testnet guidance", url: "https://developers.circle.com/stablecoins/docs/usdc-on-test-networks" },
    ],
  },
];

export function References() {
  return (
    <Page
      kicker="Web3 · 10 of 11"
      title="External references"
      lede="Every third-party component this project depends on, with the primary source. Local contracts have no public explorer — they exist only on the anvil chain on this host — so those rows point at the standards and tools rather than an address page."
    >
      {SECTIONS.map((section) => (
        <Card key={section.title} title={section.title} tag={section.tag}>
          <Table
            head={["Component", "What it is", "Link"]}
            rows={section.rows.map((r) => [
              r.name,
              r.what,
              <a
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[10px] text-accent underline-offset-4 hover:underline"
              >
                {new URL(r.url).host} ↗
              </a>,
            ])}
          />
        </Card>
      ))}

      <Card title="What has no external link, and why" tag="honest">
        <p>
          The escrow contract at <code className="font-mono text-[11px]">0xCf7E…0Fc9</code> and the
          test USDC at <code className="font-mono text-[11px]">0x9fE4…a6e0</code> are deployed to a
          private anvil chain on the demo host. There is no explorer to link to — they are only
          inspectable from that machine with <code className="font-mono text-[11px]">cast</code>.
        </p>
        <p className="text-xs">
          On Sepolia, the same contract would get an Etherscan page automatically, which is one of
          the practical reasons to move to a public testnet.
        </p>
      </Card>
    </Page>
  );
}
