import { Badge, Callout, Card, Code, Page, Table } from "../components/ui";
import type { Meta } from "../lib/meta";
import { kickerFor } from "../nav";

function rowsFor(meta: Meta | null): [string, string, string, string][] {
  return [
  ["Escrow contract (source)", "contracts/src/VehicleEscrow.sol", "214 lines, Solidity 0.8.28", "cat contracts/src/VehicleEscrow.sol"],
  ["Escrow tests", "contracts/test/VehicleEscrow.t.sol", "23 tests", "forge test -vv"],
  ["Compiled artifact (ABI + bytecode)", "contracts/out/VehicleEscrow.sol/VehicleEscrow.json", "produced by forge build", "jq .abi contracts/out/…json"],
  ["Deployed escrow", "api/.env → CONTRACT_ADDRESS", meta?.chain.escrow ?? "…", "cast code $CONTRACT_ADDRESS --rpc-url $RPC"],
  ["Test token (source)", "contracts/src/MockUSDC.sol", "6-decimal ERC-20", "cat contracts/src/MockUSDC.sol"],
  ["Deployed token", "api/.env → TOKEN_ADDRESS", meta?.chain.token ?? "…", "cast call $TOKEN_ADDRESS decimals()"],
  ["Contract ABIs used by the API", "api/src/chain/chain.service.ts", "ESCROW_ABI, ERC20_ABI via viem parseAbi", "grep -n parseAbi src/chain/chain.service.ts"],
  ["Chain clients + role keys", "api/src/chain/chain.service.ts", "publicClient, wallet per buyer/seller/arbiter", "—"],
  ["Event indexer", "api/src/chain/indexer.service.ts", "getLogs → ChainEvent rows", "journalctl -u web3proj-api -f"],
  ["Escrow business logic", "api/src/escrow/escrow.service.ts", "state machine + viem writes", "—"],
  ["Escrow HTTP routes", "api/src/escrow/escrow.controller.ts", "9 endpoints", "GET /api/meta"],
  ["Runtime configuration", "/srv/web3proj/api/.env (mode 600)", "CHAIN_MODE, RPC_URL, CHAIN_ID, addresses, keys", "sudo ls -l /srv/web3proj/api/.env"],
  ["Chain process", "systemd unit anvil.service", "127.0.0.1:8545, chain 31337", "systemctl status anvil"],
  ["Redeploy helper", "scripts/redeploy-local.sh", "recreates contracts if the chain restarts", "…/redeploy-local.sh"],
  ["Deployment record", "docs/03-decisions.md D-20", "address, chain, verification", "—"],
  ["Browser Web3 code", "none", "the UI has no wallet and no RPC access", "grep -r viem web/src → no results"],
  ];
}

export function SourceMap({ meta }: { meta: Meta | null }) {
  return (
    <Page
      kicker={kickerFor("sourcemap")}
      title="Where everything lives"
      lede="Two locations matter for each component: the source in the repository, and the runtime location — an address on a chain, a port, or a unit. This is that map, with the command to verify each one."
    >
      <Table
        head={["Component", "Source", "Runtime location", "Verify with"]}
        rows={rowsFor(meta).map(([name, source, runtime, verify]) => [
          name,
          <code className="font-mono text-[10px] break-all">{source}</code>,
          <span className="text-[12px]">{runtime}</span>,
          <code className="font-mono text-[10px] break-all text-muted">{verify}</code>,
        ])}
      />

      <Card title="Repository layout" tag="where to look">
        <Code>{`contracts/
├── src/VehicleEscrow.sol        the escrow
├── src/MockUSDC.sol             6-decimal test token
├── test/VehicleEscrow.t.sol     23 tests
└── out/                         ABI + bytecode (forge build)

api/src/
├── chain/chain.service.ts       viem clients, ABIs, keys
├── chain/indexer.service.ts     getLogs → events
├── escrow/escrow.service.ts     state machine → transactions
└── escrow/escrow.controller.ts  HTTP surface

web/src/                         no chain code at all`}</Code>
      </Card>

      <Callout tone="slate" title="The browser never touches the chain">
        <p>
          Signing happens in the service, not the browser: the frontend bundle contains no private
          key, no injected provider and no RPC URL. That keeps the interface simple and the keys off
          the client — and it is the piece the roadmap replaces next, so that users sign their own
          escrow actions.
        </p>
      </Callout>

      <Card title="Verify any of it in one command" tag="cast">
        <Code>{`export RPC=http://127.0.0.1:8545
export ESCROW=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
export TOKEN=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0

cast chain-id --rpc-url $RPC                     # 31337
cast code $ESCROW --rpc-url $RPC | head -c 20    # bytecode exists
cast call $TOKEN "decimals()(uint8)" --rpc-url $RPC        # 6
cast call $ESCROW "nextEscrowId()(uint256)" --rpc-url $RPC # count
cast logs --address $ESCROW --from-block 1 --rpc-url $RPC  # every event`}</Code>
      </Card>

      <Card title="Five questions, five answers" tag="walkthrough cheat sheet">
        <Table
          head={["If they ask", "Answer"]}
          rows={[
            ["Where is the contract?", "contracts/src/VehicleEscrow.sol — deployed at 0xCf7E…0Fc9 on chain 31337"],
            ["Where is the ABI?", "Generated into contracts/out/, then hand-declared in api/src/chain/chain.service.ts"],
            ["Where are the private keys?", "In /srv/web3proj/api/.env at mode 600, never in the repository"],
            ["Where does indexing happen?", "Inside the API process: src/chain/indexer.service.ts on a 4-second timer"],
            ["Where does the browser send transactions?", "Nowhere — it calls the API, which signs and submits"],
          ]}
        />
      </Card>

      <Card title="What is deliberately missing" tag="say it before they find it">
        <p className="flex flex-wrap gap-2">
          <Badge tone="slate">no wallet connect</Badge>
          <Badge tone="slate">no browser RPC</Badge>
          <Badge tone="slate">no user-held keys</Badge>
          <Badge tone="slate">no gas UX</Badge>
        </p>
        <p className="text-xs">
          Each is a real product gap, not an oversight: this build prioritises showing the escrow
          mechanics over wallet plumbing, and the server-side signing is what makes a one-click
          walkthrough possible without installing an extension.
        </p>
      </Card>
    </Page>
  );
}
