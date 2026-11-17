import { Badge, Card, Code, List, Page, Table } from "../components/ui";
import { kickerFor } from "../nav";

const TRANSITIONS: [string, string, string, string][] = [
  ["CREATED", "FUNDED", "buyer", "Deposits USDC; records fundTx"],
  ["FUNDED", "SHIPPED", "seller", "Starts the 14-day release timer"],
  ["SHIPPED", "RELEASED", "buyer", "Confirm delivery; pays the seller"],
  ["SHIPPED", "DISPUTED", "buyer", "Before the deadline; freezes the timer"],
  ["SHIPPED", "RELEASED", "anyone", "After 14 days with no dispute"],
  ["DISPUTED", "REFUNDED", "arbiter", "Returns funds to the buyer"],
  ["DISPUTED", "RELEASED", "arbiter", "Pays the seller"],
  ["FUNDED", "REFUNDED", "arbiter", "Shipment not recorded"],
  ["CREATED", "CANCELLED", "buyer or seller", "Before funding only"],
];

export function Lifecycle() {
  return (
    <Page
      kicker={kickerFor("lifecycle")}
      title="Escrow lifecycle"
      lede="Seven states, one terminal outcome per path, and no transition that can be skipped. This is the part a buyer has to trust, so it is also the part that is most tightly specified."
    >
      <Card title="State machine" tag="canonical">
        <Code>{`                 fund           ship            confirm
CREATED ───────────▶ FUNDED ─────────▶ SHIPPED ─────────▶ RELEASED
   │                    │                 │  │
   │ cancel             │ refund          │  │ timeout 14d, undisputed
   ▼                    ▼                 │  └──────────────▶ RELEASED
CANCELLED           REFUNDED              │
                                          │ dispute (buyer, before deadline)
                                          ▼
                                      DISPUTED
                                          │
                            ┌─────────────┴─────────────┐
                     refund │                           │ releaseToSeller
                            ▼                           ▼
                        REFUNDED                     RELEASED`}</Code>
        <p className="flex flex-wrap gap-2">
          <Badge>RELEASED</Badge>
          <Badge>REFUNDED</Badge>
          <Badge>CANCELLED</Badge>
          <span className="text-xs text-muted">— terminal, no transition out</span>
        </p>
      </Card>

      <Card title="Transition table" tag="guards">
        <Table
          head={["From", "To", "Actor", "Rule and effect"]}
          rows={TRANSITIONS.map(([from, to, actor, rule]) => [
            <code className="font-mono text-[10px] text-muted">{from}</code>,
            <code className="font-mono text-[10px] text-accent">{to}</code>,
            actor,
            rule,
          ])}
        />
      </Card>

      <Card title="The deadlock this design avoids" tag="why the timeout exists">
        <p>
          Without a timeout, a buyer who simply stops responding after delivery locks the seller's
          money forever: the arbiter can refund but deliberately cannot release, and the buyer has
          no incentive to act.
        </p>
        <p>
          The fix is asymmetric on purpose. After fourteen days in SHIPPED with no dispute, anyone
          may call the release path and the seller is paid. The buyer keeps protection by disputing
          before the deadline, which freezes the clock and hands the decision to the arbiter.
        </p>
        <p>
          The consequence is recorded rather than hidden: the arbiter does hold release power, but
          only inside a raised dispute. Residual risk accepted — a buyer can grief a seller by
          disputing at day 13.99.
        </p>
      </Card>

      <Card title="Role matrix" tag="who can do what">
        <Table
          head={["Action", "Buyer", "Seller", "Arbiter"]}
          rows={[
            ["Create escrow", "yes", "no", "no"],
            ["Fund", "yes", "no", "no"],
            ["Ship", "no", "yes", "no"],
            ["Confirm / release", "yes", "no", "no"],
            ["Dispute", "yes", "no", "no"],
            ["Refund", "no", "no", "yes"],
            ["Release to seller", "no", "no", "yes, only if disputed"],
          ]}
        />
      </Card>

      <Card title="What the contract enforces" tag="Solidity 0.8.28">
        <Table
          head={["Function", "Caller", "Effect"]}
          rows={[
            ["createEscrow", "buyer", "Opens an escrow in CREATED"],
            ["fund", "buyer", "Pulls USDC into the contract"],
            ["markShipped", "seller", "Starts the 14-day timer"],
            ["confirmDelivery", "buyer", "Pays the seller, RELEASED"],
            ["dispute", "buyer", "Freezes the timer"],
            ["releaseByTimeout", "anyone", "Pays the seller after 14 days undisputed"],
            ["refund", "arbiter", "Returns funds to the buyer"],
            ["releaseToSeller", "arbiter", "Pays the seller, only from DISPUTED"],
            ["cancel", "buyer or seller", "Before funding only"],
          ]}
        />
        <List
          items={[
            "Funds move only to the recorded buyer or seller.",
            "The arbiter directs funds only inside a raised dispute, and only to the buyer or seller.",
            "Terminal states are final.",
            "Every value-moving path is behind a reentrancy guard.",
            "No proxy, no delegatecall, no selfdestruct — the bytecode is immutable.",
          ]}
        />
        <p className="font-mono text-[11px] text-faint">
          measured gas · create→fund→ship→confirm 332,310 · refund 290,403 · timeout release 323,396
        </p>
      </Card>

      <Card title="What each side can do" tag="by state">
        <Table
          head={["State", "Buyer", "Seller", "Arbiter", "Where the money is"]}
          rows={[
            ["CREATED", "fund, cancel", "cancel", "—", "still in the buyer's wallet"],
            ["FUNDED", "confirm, dispute", "mark shipped", "—", "held by the contract"],
            ["SHIPPED", "confirm, dispute", "—", "—", "held by the contract"],
            ["DISPUTED", "—", "—", "release to seller, refund", "held by the contract, frozen"],
            ["RELEASED", "—", "—", "—", "in the seller's wallet"],
            ["REFUNDED", "—", "—", "—", "back in the buyer's wallet"],
            ["CANCELLED", "—", "—", "—", "still in the buyer's wallet"],
          ]}
        />
        <p>
          The buyer releases by confirming delivery. The seller ships while the escrow is funded. The
          arbiter acts once a dispute is raised.
        </p>
      </Card>
    </Page>
  );
}
