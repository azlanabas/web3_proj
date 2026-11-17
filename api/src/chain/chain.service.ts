import { Injectable, Logger } from "@nestjs/common";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  decodeEventLog,
  http,
  parseAbi,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

export const ESCROW_ABI = parseAbi([
  "function createEscrow(bytes32 listingId, address seller, uint256 amount) returns (uint256)",
  "function fund(uint256 escrowId)",
  "function markShipped(uint256 escrowId)",
  "function confirmDelivery(uint256 escrowId)",
  "function dispute(uint256 escrowId)",
  "function releaseByTimeout(uint256 escrowId)",
  "function refund(uint256 escrowId)",
  "function releaseToSeller(uint256 escrowId)",
  "function cancel(uint256 escrowId)",
  "function RELEASE_TIMEOUT() view returns (uint64)",
  "function nextEscrowId() view returns (uint256)",
  "function usdc() view returns (address)",
  "function arbiter() view returns (address)",
  "event EscrowCreated(uint256 indexed escrowId, bytes32 indexed listingId, address indexed buyer, address seller, uint256 amount)",
  "event Funded(uint256 indexed escrowId, uint256 amount)",
  "event Shipped(uint256 indexed escrowId, uint64 shippedAt)",
  "event Disputed(uint256 indexed escrowId, uint64 disputedAt)",
  "event Released(uint256 indexed escrowId, address indexed seller, uint256 amount)",
  "event Refunded(uint256 indexed escrowId, address indexed buyer, uint256 amount)",
  "event Cancelled(uint256 indexed escrowId, address indexed cancelledBy)",
]);

export const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
]);

type Role = "buyer" | "seller" | "arbiter";

const KEYS: Record<Role, string> = {
  buyer: process.env.BUYER_PRIVATE_KEY ?? "",
  seller: process.env.SELLER_PRIVATE_KEY ?? "",
  arbiter: process.env.ARBITER_PRIVATE_KEY ?? "",
};

@Injectable()
export class ChainService {
  private readonly logger = new Logger(ChainService.name);
  /** Any real network, local or public. Only "simulated" writes no transactions. */
  readonly mode = process.env.CHAIN_MODE ?? "simulated";
  readonly enabled = this.mode !== "simulated";
  /** Time travel is an anvil cheat code; a public chain cannot do it. */
  readonly supportsTimeTravel = this.mode === "local";
  readonly chainId = Number(process.env.CHAIN_ID ?? 0);
  readonly deployBlock = process.env.CONTRACT_DEPLOY_BLOCK ?? null;
  readonly networkName =
    process.env.CHAIN_NAME ??
    (this.mode === "local" ? "Anvil (local EVM)" : this.mode === "sepolia" ? "Ethereum Sepolia" : "Simulated");
  readonly rpcHost = (() => {
    try {
      return new URL(process.env.RPC_URL ?? "").host;
    } catch {
      return "";
    }
  })();
  readonly escrow = (process.env.CONTRACT_ADDRESS ?? "") as Address;
  readonly token = (process.env.TOKEN_ADDRESS ?? "") as Address;

  private readonly chain = defineChain({
    id: Number(process.env.CHAIN_ID ?? 31337),
    name: "web3proj-local",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [process.env.RPC_URL ?? "http://127.0.0.1:8545"] } },
  });

  readonly publicClient = createPublicClient({
    chain: this.chain,
    transport: http(process.env.RPC_URL ?? "http://127.0.0.1:8545"),
  }) as PublicClient;

  private accounts = new Map<Role, ReturnType<typeof privateKeyToAccount>>();

  private account(role: Role) {
    const cached = this.accounts.get(role);
    if (cached) return cached;
    const key = KEYS[role] as Hex;
    if (!key) throw new Error(`missing private key for role ${role}`);
    const created = privateKeyToAccount(key);
    this.accounts.set(role, created);
    return created;
  }

  private wallet(role: Role) {
    return createWalletClient({
      account: this.account(role),
      chain: this.chain,
      transport: http(process.env.RPC_URL ?? "http://127.0.0.1:8545"),
    });
  }

  async address(role: Role): Promise<Address> {
    return this.account(role).address;
  }

  /** Sends a contract write and waits for the receipt. */
  async write(role: Role, args: {
    address: Address;
    abi: readonly unknown[];
    functionName: string;
    params: readonly unknown[];
  }) {
    const client = this.wallet(role);
    const hash = await client.writeContract({
      address: args.address,
      abi: args.abi,
      functionName: args.functionName,
      args: args.params,
      account: this.account(role),
      chain: this.chain,
    });
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error(`transaction reverted: ${hash}`);
    return { hash, receipt };
  }

  async read<T>(args: {
    address: Address;
    abi: readonly unknown[];
    functionName: string;
    params?: readonly unknown[];
  }): Promise<T> {
    return (await this.publicClient.readContract({
      address: args.address,
      abi: args.abi,
      functionName: args.functionName,
      args: args.params ?? [],
    })) as T;
  }

  /** Advances chain time — only valid on the local dev chain. */
  async increaseTime(seconds: number): Promise<void> {
    await this.publicClient.request({
      method: "evm_increaseTime",
      params: [seconds],
    } as never);
    await this.publicClient.request({ method: "evm_mine", params: [] } as never);
  }

  /** Verifies a user-submitted transaction: sender, target, receipt and the expected escrow event. */
  async verifyTx(opts: {
    hash: `0x${string}`;
    from: string;
    escrowId: bigint;
    eventName: string;
  }) {
    const tx = await this.publicClient.getTransaction({ hash: opts.hash });
    if (tx.to?.toLowerCase() !== this.escrow.toLowerCase()) throw new Error("transaction did not target the escrow");
    if (tx.from.toLowerCase() !== opts.from.toLowerCase()) throw new Error("transaction was sent by a different account");
    const receipt = await this.publicClient.getTransactionReceipt({ hash: opts.hash });
    if (receipt.status !== "success") throw new Error("transaction reverted");
    const found = receipt.logs.some((log) => {
      if (log.address.toLowerCase() !== this.escrow.toLowerCase()) return false;
      try {
        const decoded = decodeEventLog({ abi: ESCROW_ABI, data: log.data, topics: log.topics });
        return decoded.eventName === opts.eventName &&
          (decoded.args as { escrowId?: bigint }).escrowId === opts.escrowId;
      } catch {
        return false;
      }
    });
    if (!found) throw new Error(`no ${opts.eventName} event for this escrow in the transaction`);
    return receipt;
  }

  async blockNumber(): Promise<bigint> {
    return this.publicClient.getBlockNumber();
  }
}
