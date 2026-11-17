import { Callout, Card, Code, List, Page, Table } from "../components/ui";

export function Web3() {
  return (
    <Page
      kicker="Components · 04"
      title="Web3 layer"
      lede="Solidity escrow holding USDC, with the platform able to refund but not to pay itself. The contract is immutable and non-upgradeable: an escrow users are asked to trust should not be silently replaceable."
    >
      <Card title="Chain and token" tag="verified on-chain">
        <Table
          head={["Item", "Value"]}
          rows={[
            ["Network", "Ethereum Sepolia (chain id 11155111)"],
            ["Settlement token", "USDC"],
            ["Token address", <code className="font-mono text-[10px]">0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238</code>],
            ["Decimals", "6 — confirmed by calling decimals() on the contract"],
            ["Symbol / name", "USDC / USDC — read on-chain, 1,798 bytes of code"],
            ["RPC", "Alchemy, with a public node as fallback"],
          ]}
        />
      </Card>

      <Card title="Contract shape" tag="Solidity 0.8.28">
        <Code>{`enum State { NONE, CREATED, FUNDED, SHIPPED, DISPUTED, RELEASED, REFUNDED, CANCELLED }

struct Escrow {
    address buyer;
    address seller;
    uint256 amount;
    uint64  shippedAt;
    uint64  disputedAt;
    State   state;
}

uint64 public constant RELEASE_TIMEOUT = 14 days;`}</Code>
        <p>
          One deployment holds many escrows keyed by id — not one contract per sale. The arbiter
          is a single immutable address set at construction, because a per-escrow arbiter would let
          a buyer nominate themselves.
        </p>
      </Card>

      <Card title="Functions and events" tag="interface">
        <Table
          head={["Function", "Caller", "Effect"]}
          rows={[
            ["createEscrow", "buyer", "Opens an escrow in CREATED"],
            ["fund", "buyer", "Pulls USDC into the contract, state FUNDED"],
            ["markShipped", "seller", "SHIPPED, starts the 14-day timer"],
            ["confirmDelivery", "buyer", "Pays the seller, RELEASED"],
            ["dispute", "buyer", "Freezes the timer, DISPUTED"],
            ["releaseByTimeout", "anyone", "Pays the seller after 14 days undisputed"],
            ["refund", "arbiter", "Returns funds to the buyer"],
            ["releaseToSeller", "arbiter", "Pays the seller, only from DISPUTED"],
            ["cancel", "buyer or seller", "Before funding only"],
          ]}
        />
        <p className="font-mono text-[11px] text-slate-500">
          EscrowCreated · Funded · Shipped · Disputed · Released · Refunded · Cancelled
        </p>
      </Card>

      <Card title="Invariants enforced in Solidity" tag="safety">
        <List
          items={[
            "Funds move only to the recorded buyer or seller — never to an arbitrary address.",
            "The arbiter can pay the seller only inside a raised dispute, and can never pay itself.",
            "Terminal states are terminal: a released escrow cannot be refunded.",
            "releaseByTimeout reverts while a dispute is open.",
            "Cancel is impossible once funded.",
            "Every state transition is behind a reentrancy guard.",
          ]}
        />
      </Card>

      <Card title="Measured gas" tag="forge test">
        <Table
          head={["Path", "Gas"]}
          rows={[
            ["create → fund → ship → confirm", "332,310"],
            ["refund", "290,403"],
            ["timeout release", "323,396"],
          ]}
        />
      </Card>

      <Card title="Test coverage" tag="23/23 passing">
        <p>
          The suite includes the happy path, arbiter asymmetry, dispute gating, the exact
          14-day boundary via time travel, double funding, cancellation, unknown escrow,
          unauthorised callers, and a live reentrancy attack through a malicious ERC-20 that
          attempts to re-enter the permissionless release path during payout.
        </p>
      </Card>

      <Callout tone="amber" title="Deployment status">
        The contract is written, tested and mirrored in the repository, but it is <strong>not
        deployed</strong>. The API simulates the transitions and records events with the same
        shape a real deployment would produce. Swapping simulation for a real chain changes one
        service, not the product.
      </Callout>
    </Page>
  );
}
