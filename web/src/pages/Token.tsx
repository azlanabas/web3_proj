import { Callout, Card, Code, List, Page, Table } from "../components/ui";

export function Token() {
  return (
    <Page
      kicker="Web3 · 6 of 11"
      title="USDC and the ERC-20 transfer model"
      lede="Money is a token contract, not a column in a database. That single fact drives decimals handling, the two-step approval flow, and why escrow arithmetic is done in integers."
    >
      <Card title="Token addresses" tag="per network">
        <Table
          head={["Network", "USDC contract", "Decimals", "Used here"]}
          rows={[
            ["Anvil (local)", <code className="font-mono text-[10px]">0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0</code>, "6", "Yes — mock ERC-20 minted for the demo"],
            ["Sepolia", <a href="https://sepolia.etherscan.io/address/0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" target="_blank" rel="noreferrer" className="font-mono text-[10px] text-accent underline-offset-4 hover:underline">0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238</a>, "6", "Configured, not yet deployed to"],
            ["Mainnet", <a href="https://etherscan.io/address/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" target="_blank" rel="noreferrer" className="font-mono text-[10px] text-accent underline-offset-4 hover:underline">0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48</a>, "6", "No"],
          ]}
        />
        <p className="text-xs text-muted">
          The Sepolia row was verified by calling <code className="font-mono text-[11px]">symbol()</code>{" "}
          and <code className="font-mono text-[11px]">decimals()</code> on the contract, not from
          documentation. The local token is ours: a 6-decimal ERC-20, because Circle&apos;s token
          only exists on public networks.
        </p>
      </Card>

      <Card title="Decimals are the classic bug" tag="integer money">
        <Code>{`1 USDC      = 1_000_000        base units   (6 decimals)
21,750 USDC = 21_750_000_000   base units

// every amount crossing the chain boundary is an integer:
const amount = BigInt(Math.round(Number(priceUsdc) * 1_000_000));`}</Code>
        <p>
          The database stores <code className="font-mono text-[11px]">numeric(20,6)</code> and the
          chain stores <code className="font-mono text-[11px]">uint256</code> base units. Conversion
          happens in exactly one place — the escrow service — so rounding cannot drift between
          layers. A float in that path would silently be a bug every accountant would find later.
        </p>
      </Card>

      <Card title="Two-step approval" tag="ERC-20 mechanics">
        <Code>{`buyer ──approve(escrow, amount)──▶ USDC contract
                                      │ allowance[buyer][escrow] = amount
                                      ▼
buyer ──fund(escrowId)──▶ Escrow ──transferFrom(buyer, escrow, amount)──▶ USDC`}</Code>
        <List
          items={[
            "An ERC-20 cannot pull funds on its own initiative; the holder must approve a spender first.",
            "The service checks the existing allowance and only sends approve when it is insufficient.",
            "Approval is set to ten times the amount rather than unlimited, to bound the blast radius.",
            "SafeERC20 is used so a token returning false instead of reverting cannot silently succeed.",
          ]}
        />
      </Card>

      <Card title="Why settle in USDC and not ETH" tag="risk">
        <p>
          The escrow can sit in SHIPPED for up to fourteen days. Priced in ETH, a seller could
          receive materially less than agreed purely from volatility, and the contract has no way
          to hedge. A stablecoin makes the amount that was agreed the amount that is paid.
        </p>
        <p className="text-xs text-muted">
          Tradeoff accepted: a stablecoin introduces issuer and depeg risk. For a vehicle sale with
          a two-week settlement window, that is the smaller of the two risks.
        </p>
      </Card>

      <Callout tone="slate" title="What the contract does not assume">
        <p>
          No fee-on-transfer tokens, no rebasing balances, no ERC-777 hooks. The escrow records the
          amount at funding time and pays exactly that amount. Supporting exotic tokens would
          require balance-delta accounting, which is deliberately out of scope.
        </p>
      </Callout>
    </Page>
  );
}
