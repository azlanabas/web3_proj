import { Badge, Card, Code, List, Page, Stats, Table } from "../components/ui";
import { kickerFor } from "../nav";

export function Fundamentals() {
  return (
    <Page
      kicker={kickerFor("fundamentals")}
      title="Ethereum basics"
      lede="Every term in a Web3 conversation, placed somewhere real: what it is, whether this project uses it, and where you can see it on this chain. If a concept is not used here, it says so."
    >
      <Stats
        items={[
          { value: "Sepolia", label: "live public testnet" },
          { value: "testnet", label: "gas, paid in worthless ETH" },
          { value: "~50k", label: "gas for one escrow action" },
          { value: "0 ETH", label: "held by the escrow contract" },
        ]}
      />

      <Card title="Where the ETH is" tag="the question that always comes first">
        <p>
          ETH is Ethereum&apos;s native currency and it exists here only to pay for computation.
          On Sepolia the three signers were funded with a fraction of testnet ETH each, which is
          enough for thousands of transactions at current gas prices. The escrow contract holds{" "}
          <strong>0 ETH</strong> — because it holds USDC, not ETH.
        </p>
        <Code>{`one escrow action: ~50,000 gas × testnet gas price, paid in worthless testnet ETH
the vehicle price:     21,750 USDC — moved as a token, never as ETH`}</Code>
        <p className="text-xs">
          This separation matters. ETH is the fuel; USDC is the money. The escrow contract has no
          payable functions and no receive function — it cannot accept ETH even by accident.
        </p>
      </Card>

      <Card title="Concept map" tag="term → what it is here">
        <Table
          head={["Term", "What it means", "In this project"]}
          rows={[
            ["EVM", "The virtual machine that executes contract bytecode", <span className="text-good">Used</span>],
            ["Account", "An address holding a balance; either a key-holder or a contract", <span className="text-good">Used</span>],
            ["EOA", "Externally owned account — controlled by a private key", <span className="text-good">Used (3 signer accounts)</span>],
            ["Transaction", "A signed instruction to change state", <span className="text-good">Used</span>],
            ["Gas", "Units of computation, paid in ETH", <span className="text-good">Used</span>],
            ["Mempool", "Holding area for unconfirmed transactions", <span className="text-good">Used (anvil)</span>],
            ["Block", "An ordered batch of transactions", <span className="text-good">Used (1s blocks)</span>],
            ["Receipt", "Proof a transaction executed, with logs", <span className="text-good">Used before any DB write</span>],
            ["Event log", "Structured data emitted during execution", <span className="text-good">Used by the indexer</span>],
            ["Proof of Stake", "Consensus where validators stake ETH to propose blocks", <span className="text-muted">Not used — local chain has no consensus</span>],
            ["Staking", "Locking 32 ETH per validator to earn rewards and risk slashing", <span className="text-muted">Not used</span>],
            ["Finality", "A block that cannot be reverted", <span className="text-muted">Not modelled — local chain is instant</span>],
            ["Sequencer", "The actor that orders transactions into blocks", <span className="text-good">anvil is the single sequencer</span>],
            ["Rollup / L2", "A chain that posts its data and proofs to Ethereum", <span className="text-muted">Not used — we run L1-style</span>],
            ["ZK / fraud proof", "Cryptographic or challenge-based proof of correct execution", <span className="text-muted">Not used</span>],
            ["Validator node", "Software participating in consensus", <span className="text-muted">Not run</span>],
            ["RPC", "The JSON interface to a node", <span className="text-good">Used: anvil, Alchemy</span>],
          ]}
        />
      </Card>

      <Card title="A transaction, field by field" tag="anatomy">
        <Table
          head={["Field", "Meaning", "Example here"]}
          rows={[
            ["from", "Sender address, recovered from the signature", "buyer 0x3C44…93BC"],
            ["to", "Contract being called", "escrow 0xCf7E…0Fc9"],
            ["nonce", "Per-account counter preventing replay", "increments every write"],
            ["data", "Encoded function selector + arguments", "fund(uint256)"],
            ["gasLimit", "Maximum gas the sender will spend", "set by viem estimate"],
            ["maxFeePerGas", "Price ceiling per gas unit", "1 gwei on this chain"],
            ["signature", "secp256k1 signature over the payload", "made by the service-held key"],
          ]}
        />
      </Card>

      <Card title="Consensus, staking and finality" tag="how Ethereum actually agrees">
        <p>
          On Ethereum mainnet and Sepolia, blocks are produced by <strong>validators</strong> under
          Proof of Stake. A validator locks <strong>32 ETH</strong> as a bond, is assigned slots in
          which to propose blocks, and attests to blocks proposed by others. An epoch is 32 slots
          (about 6.4 minutes); a checkpoint reached by two-thirds of attesting stake is{" "}
          <strong>finalised</strong>, roughly 12.8 minutes after the fact.
        </p>
        <p>
          The bond is what replaces mining. Misbehaviour that is provable — double-signing, or
          contradicting an attestation — results in <strong>slashing</strong>: part of the stake is
          destroyed and the validator is ejected.
        </p>
        <p className="text-xs">
          None of that runs here. Anvil is a development chain: no validators, no stake, no
          attestations, no finality risk. That is why the application does not wait for
          confirmations and why a public deployment would need to add them.
        </p>
      </Card>

      <Card title="What a &ldquo;proof&rdquo; is" tag="three different words, one confusion">
        <Table
          head={["Proof", "What it proves", "Used here?"]}
          rows={[
            ["PoS attestation", "A validator agrees a block is valid, backed by stake", "No — no consensus locally"],
            ["Fraud proof", "An optimistic rollup assertion is wrong; challenge window opens", "No — not a rollup"],
            ["Validity (ZK) proof", "The state transition is mathematically correct", "No"],
            ["Transaction receipt", "This specific transaction executed and produced these logs", <span className="text-good">Yes — every state change</span>],
            ["Signature", "This key authorised this exact payload", <span className="text-good">Yes — secp256k1</span>],
          ]}
        />
        <p className="text-xs">
          When this project says &ldquo;proof&rdquo;, it means a receipt and a signature — not a
          consensus or cryptographic proof of execution. Worth saying precisely in a review.
        </p>
      </Card>

      <Card title="Sequencers, L1 and L2" tag="where blocks come from">
        <p>
          A <strong>sequencer</strong> is whoever decides the order of transactions. On an L2
          rollup it is usually a single operator that batches transactions and posts the batch to
          Ethereum, with proofs (or a challenge window) securing correctness. On Ethereum L1 there
          is no single sequencer: validators propose blocks in randomly assigned slots.
        </p>
        <p>
          Here, <strong>anvil is the sequencer</strong> — one process, one machine, 1-second blocks.
          That is the honest description: this chain has a single trusted operator, which is fine
          for a development chain and would be unacceptable for real money.
        </p>
        <List
          items={[
            "L1 = Ethereum mainnet. Settlement and security for everything above it.",
            "Sepolia = an L1 testnet with the same consensus rules, worthless ETH.",
            "L2 = rollups (Arbitrum, Base, Optimism) that settle to L1. Not used here.",
            "Anvil = a local development chain. No consensus, no proofs, instant finality.",
          ]}
        />
      </Card>

      <Card title="JSON-RPC methods this app actually calls" tag="the interface">
        <Table
          head={["Method", "Used for"]}
          rows={[
            ["eth_chainId", "Confirm which chain is configured"],
            ["eth_call", "Read escrow state and token allowance (no gas)"],
            ["eth_sendRawTransaction", "Submit a signed escrow action"],
            ["eth_getTransactionReceipt", "Wait for success and read logs"],
            ["eth_getLogs", "Index events since the last checkpoint"],
            ["evm_increaseTime / evm_mine", "Local chain only: fast-forward 14 days"],
          ]}
        />
        <p className="flex flex-wrap gap-2 pt-1">
          <Badge tone="slate">no wallet in the browser</Badge>
          <Badge tone="slate">no gas estimation UI</Badge>
          <Badge tone="slate">no account abstraction</Badge>
        </p>
      </Card>
    </Page>
  );
}
