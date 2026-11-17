import { Callout, Card, Code, List, Page, Table } from "../components/ui";
import { kickerFor } from "../nav";

export function Contract() {
  return (
    <Page
      kicker={kickerFor("contract")}
      title="Escrow contract"
      lede="Two hundred and fourteen lines of Solidity that hold other people's money. Immutable, non-upgradeable, and designed so the platform can never pay itself."
    >
      <Table
        head={["Property", "Value"]}
        rows={[
          ["Source", "contracts/src/VehicleEscrow.sol — 214 lines"],
          ["Compiler", "Solidity 0.8.28, optimizer on, 200 runs"],
          ["Libraries", "OpenZeppelin 5.7.0 — SafeERC20, ReentrancyGuard"],
          ["Deployed (local)", <code className="font-mono text-[10px]">0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9</code>],
          ["Pattern", "Single contract, many escrows keyed by id — not one contract per sale"],
          ["Upgradeability", "None. No proxy, no delegatecall, no selfdestruct."],
        ]}
      />

      <Card title="State" tag="storage">
        <Code>{`enum State { NONE, CREATED, FUNDED, SHIPPED, DISPUTED, RELEASED, REFUNDED, CANCELLED }

struct Escrow {
    address buyer;      // who pays
    address seller;     // who receives
    uint256 amount;     // USDC base units (6 decimals)
    uint64  shippedAt;  // starts the 14-day timer
    uint64  disputedAt; // freezes it
    State   state;
}

uint64 public constant RELEASE_TIMEOUT = 14 days;

IERC20  public immutable usdc;
address public immutable arbiter;      // one address, fixed at construction`}</Code>
        <p className="text-xs text-muted">
          The arbiter is immutable and global rather than passed per escrow. A per-escrow arbiter
          would let the buyer — who calls <code className="font-mono text-[11px]">createEscrow</code>{" "}
          — nominate themselves and refund their own escrow after the seller ships.
        </p>
      </Card>

      <Card title="Functions" tag="access control">
        <Table
          head={["Function", "Visibility", "Modifier", "Caller", "Transition"]}
          rows={[
            ["createEscrow", "external", "—", "anyone (becomes buyer)", "→ CREATED"],
            ["fund", "external", "nonReentrant", "buyer", "CREATED → FUNDED"],
            ["markShipped", "external", "—", "seller", "FUNDED → SHIPPED"],
            ["confirmDelivery", "external", "nonReentrant", "buyer", "SHIPPED → RELEASED"],
            ["dispute", "external", "—", "buyer", "SHIPPED → DISPUTED"],
            ["releaseByTimeout", "external", "nonReentrant", "anyone", "SHIPPED → RELEASED"],
            ["refund", "external", "nonReentrant + onlyArbiter", "arbiter", "FUNDED/SHIPPED/DISPUTED → REFUNDED"],
            ["releaseToSeller", "external", "nonReentrant + onlyArbiter", "arbiter", "DISPUTED → RELEASED"],
            ["cancel", "external", "—", "buyer or seller", "CREATED → CANCELLED"],
            ["getEscrow / releaseDeadline", "external view", "—", "anyone", "reads"],
          ]}
        />
      </Card>

      <Card title="Events" tag="what the indexer reads">
        <Table
          head={["Event", "Indexed fields", "Meaning"]}
          rows={[
            ["EscrowCreated", "escrowId, listingId, buyer", "An escrow exists; seller and amount in data"],
            ["Funded", "escrowId", "USDC is now inside the contract"],
            ["Shipped", "escrowId", "Timer started at shippedAt"],
            ["Disputed", "escrowId", "Timer frozen at disputedAt"],
            ["Released", "escrowId, seller", "Money left, to the seller"],
            ["Refunded", "escrowId, buyer", "Money left, back to the buyer"],
            ["Cancelled", "escrowId, cancelledBy", "Terminated before funding"],
          ]}
        />
      </Card>

      <Card title="Invariants" tag="what must always hold">
        <List
          items={[
            "Funds can only go to the recorded buyer or the recorded seller — never an arbitrary address.",
            "The arbiter can pay the seller only inside a raised dispute, and can never pay itself.",
            "Terminal states are terminal; a released escrow cannot be refunded.",
            "releaseByTimeout reverts while a dispute is open.",
            "Cancel is impossible once funded.",
            "Each state transition is behind a reentrancy guard.",
            "The 14-day constant is immutable after deployment.",
          ]}
        />
      </Card>

      <Card title="Security properties" tag="how">
        <Table
          head={["Property", "Mechanism"]}
          rows={[
            ["Reentrancy", "ReentrancyGuard on every value-moving path; state written before transfer (CEI)"],
            ["Token safety", "SafeERC20 for transfer and transferFrom"],
            ["Access control", "onlyArbiter for arbitration; buyer/seller checked against storage"],
            ["Arithmetic", "Solidity 0.8 checked math; no unchecked blocks"],
            ["Upgrade risk", "none — immutable bytecode, no proxy"],
            ["External calls", "exactly one: the USDC token, at a fixed address"],
          ]}
        />
      </Card>

      <Card title="Measured gas" tag="forge test">
        <Table
          head={["Path", "Gas", "At 20 gwei"]}
          rows={[
            ["create → fund → ship → confirm", "332,310", "≈ $0.006 on an L2, ≈ $0.20 on L1"],
            ["refund", "290,403", "—"],
            ["timeout release", "323,396", "—"],
          ]}
        />
        <p className="text-xs text-muted">
          Gas is not the economic constraint here: a vehicle sale dwarfs it. The constraint is the
          number of signatures a user tolerates, which is why the happy path is four.
        </p>
      </Card>

      <Card title="Test coverage" tag="23 passing">
        <p>
          Happy path; arbiter asymmetry; dispute gating; exact 14-day boundary via time travel;
          double funding; cancellation; unknown escrow; non-buyer and non-seller callers; and a live
          reentrancy attack using a malicious ERC-20 that attempts to re-enter the permissionless
          release path during payout.
        </p>
        <Code>{`forge test -vv
Ran 23 tests for test/VehicleEscrow.t.sol
Suite result: ok. 23 passed; 0 failed; 0 skipped`}</Code>
      </Card>

      <Callout tone="slate" title="Not audited">
        <p>
          This contract has extensive unit tests but no independent audit. That is the gating item
          before any mainnet deployment, and it is listed as post-MVP scope rather than pretended
          otherwise.
        </p>
      </Callout>
    </Page>
  );
}
