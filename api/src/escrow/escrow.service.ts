import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { EscrowStatus } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import { decodeEventLog, encodeFunctionData, keccak256, toHex, type Address } from "viem";
import { ChainService, ERC20_ABI, ESCROW_ABI } from "../chain/chain.service";
import { IndexerService } from "../chain/indexer.service";
import { PrismaService } from "../prisma/prisma.service";

const RELEASE_TIMEOUT_MS = 14 * 24 * 60 * 60 * 1000;
const SIMULATED_CONTRACT = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

function fakeTxHash(label: string): string {
  return (
    "0x" +
    createHash("sha256")
      .update(`${label}:${Date.now()}:${randomBytes(8).toString("hex")}`)
      .digest("hex")
  );
}

@Injectable()
export class EscrowService {
  private eventSeq = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly chain: ChainService,
    private readonly indexer: IndexerService,
  ) {}

  private get operatorMode(): boolean {
    return process.env.OPERATOR_MODE === "true";
  }

  private usdcUnits(amount: string): bigint {
    return BigInt(Math.round(Number(amount) * 1_000_000));
  }

  async list() {
    return this.prisma.escrow.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { listing: true, buyer: true, seller: true },
    });
  }

  async get(id: string) {
    const escrow = await this.prisma.escrow.findUnique({
      where: { id },
      include: { listing: true, buyer: true, seller: true },
    });
    if (!escrow) throw new NotFoundException("escrow not found");

    const events = await this.prisma.chainEvent.findMany({
      where: { payload: { path: ["escrowId"], equals: escrow.onchainId } },
      orderBy: { id: "asc" },
    });
    return { escrow, events };
  }

  async create(buyerId: string, listingId: string) {
    const listing = await this.prisma.listing.findFirst({
      where: { id: listingId, deletedAt: null },
    });
    if (!listing) throw new NotFoundException("listing not found");
    if (listing.sellerId === buyerId) {
      throw new BadRequestException("you cannot buy your own listing");
    }

    const count = await this.prisma.escrow.count();

    if (this.chain.enabled) {
      const seller = await this.prisma.user.findUniqueOrThrow({
        where: { id: listing.sellerId },
      });

      const { receipt } = await this.chain.write("buyer", {
        address: this.chain.escrow,
        abi: ESCROW_ABI,
        functionName: "createEscrow",
        params: [
          keccak256(toHex(listing.id)),
          seller.walletAddress as Address,
          this.usdcUnits(listing.priceUsdc.toString()),
        ],
      });

      let onchainId = String(count + 1);
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: ESCROW_ABI,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === "EscrowCreated") {
            onchainId = (decoded.args as unknown as { escrowId: bigint }).escrowId.toString();
          }
        } catch {
          continue;
        }
      }

      const created = await this.prisma.escrow.create({
        data: {
          listingId,
          buyerId,
          sellerId: listing.sellerId,
          chainId: Number(process.env.CHAIN_ID ?? 31337),
          contractAddress: this.chain.escrow,
          onchainId,
          amountUsdc: listing.priceUsdc,
          status: EscrowStatus.CREATED,
          simulated: false,
        },
        include: { listing: true },
      });
      await this.indexer.sync();
      return created;
    }

    const escrow = await this.prisma.escrow.create({
      data: {
        listingId,
        buyerId,
        sellerId: listing.sellerId,
        chainId: Number(process.env.CHAIN_ID ?? 11155111),
        contractAddress: SIMULATED_CONTRACT,
        onchainId: String(count + 1),
        amountUsdc: listing.priceUsdc,
        status: EscrowStatus.CREATED,
        simulated: true,
      },
      include: { listing: true },
    });
    await this.log(escrow.id, escrow.onchainId, "EscrowCreated", fakeTxHash("create"));
    return escrow;
  }

  async fund(id: string, actorId: string) {
    const e = await this.load(id);
    this.assertState(e.status, EscrowStatus.CREATED);
    this.assertActor(e.buyerId, actorId, "only the buyer can fund");

    if (this.chain.enabled) {
      const buyer = await this.prisma.user.findUniqueOrThrow({ where: { id: e.buyerId } });
      const amount = this.usdcUnits(e.amountUsdc.toString());

      const allowance = await this.chain.read<bigint>({
        address: this.chain.token,
        abi: ERC20_ABI,
        functionName: "allowance",
        params: [buyer.walletAddress as Address, this.chain.escrow],
      });
      if (allowance < amount) {
        await this.chain.write("buyer", {
          address: this.chain.token,
          abi: ERC20_ABI,
          functionName: "approve",
          params: [this.chain.escrow, amount * 10n],
        });
      }

      const { hash } = await this.chain.write("buyer", {
        address: this.chain.escrow,
        abi: ESCROW_ABI,
        functionName: "fund",
        params: [BigInt(e.onchainId)],
      });

      const updated = await this.prisma.escrow.update({
        where: { id },
        data: { status: EscrowStatus.FUNDED, fundTx: hash },
      });
      await this.indexer.sync();
      return updated;
    }

    const tx = fakeTxHash("fund");
    const updated = await this.prisma.escrow.update({
      where: { id },
      data: { status: EscrowStatus.FUNDED, fundTx: tx },
    });
    await this.log(id, e.onchainId, "Funded", tx);
    return updated;
  }

  async ship(id: string, actorId: string) {
    const e = await this.load(id);
    this.assertState(e.status, EscrowStatus.FUNDED);
    this.assertActor(e.sellerId, actorId, "only the seller can ship");

    if (this.chain.enabled) {
      await this.chain.write("seller", {
        address: this.chain.escrow,
        abi: ESCROW_ABI,
        functionName: "markShipped",
        params: [BigInt(e.onchainId)],
      });
      const updated = await this.prisma.escrow.update({
        where: { id },
        data: { status: EscrowStatus.SHIPPED, shippedAt: new Date() },
      });
      await this.indexer.sync();
      return updated;
    }

    const tx = fakeTxHash("ship");
    const updated = await this.prisma.escrow.update({
      where: { id },
      data: { status: EscrowStatus.SHIPPED, shippedAt: new Date() },
    });
    await this.log(id, e.onchainId, "Shipped", tx);
    return updated;
  }

  async confirm(id: string, actorId: string) {
    const e = await this.load(id);
    this.assertState(e.status, EscrowStatus.SHIPPED);
    this.assertActor(e.buyerId, actorId, "only the buyer can confirm");

    if (this.chain.enabled) {
      const { hash } = await this.chain.write("buyer", {
        address: this.chain.escrow,
        abi: ESCROW_ABI,
        functionName: "confirmDelivery",
        params: [BigInt(e.onchainId)],
      });
      const updated = await this.prisma.escrow.update({
        where: { id },
        data: { status: EscrowStatus.RELEASED, releaseTx: hash },
      });
      await this.indexer.sync();
      return updated;
    }

    const tx = fakeTxHash("release");
    const updated = await this.prisma.escrow.update({
      where: { id },
      data: { status: EscrowStatus.RELEASED, releaseTx: tx },
    });
    await this.log(id, e.onchainId, "Released", tx);
    return updated;
  }

  async dispute(id: string, actorId: string) {
    const e = await this.load(id);
    this.assertState(e.status, EscrowStatus.SHIPPED);
    this.assertActor(e.buyerId, actorId, "only the buyer can dispute");
    if (e.shippedAt && Date.now() >= e.shippedAt.getTime() + RELEASE_TIMEOUT_MS) {
      throw new BadRequestException("the release deadline has already passed");
    }

    if (this.chain.enabled) {
      await this.chain.write("buyer", {
        address: this.chain.escrow,
        abi: ESCROW_ABI,
        functionName: "dispute",
        params: [BigInt(e.onchainId)],
      });
      const updated = await this.prisma.escrow.update({
        where: { id },
        data: { status: EscrowStatus.DISPUTED, disputedAt: new Date() },
      });
      await this.indexer.sync();
      return updated;
    }

    const tx = fakeTxHash("dispute");
    const updated = await this.prisma.escrow.update({
      where: { id },
      data: { status: EscrowStatus.DISPUTED, disputedAt: new Date() },
    });
    await this.log(id, e.onchainId, "Disputed", tx);
    return updated;
  }

  async refund(id: string, actorId: string) {
    const e = await this.load(id);
    if (
      e.status !== EscrowStatus.FUNDED &&
      e.status !== EscrowStatus.SHIPPED &&
      e.status !== EscrowStatus.DISPUTED
    ) {
      throw new BadRequestException(`cannot refund an escrow in ${e.status}`);
    }
    this.assertArbiter(actorId);

    if (this.chain.enabled) {
      const { hash } = await this.chain.write("arbiter", {
        address: this.chain.escrow,
        abi: ESCROW_ABI,
        functionName: "refund",
        params: [BigInt(e.onchainId)],
      });
      const updated = await this.prisma.escrow.update({
        where: { id },
        data: { status: EscrowStatus.REFUNDED, refundTx: hash },
      });
      await this.indexer.sync();
      return updated;
    }

    const tx = fakeTxHash("refund");
    const updated = await this.prisma.escrow.update({
      where: { id },
      data: { status: EscrowStatus.REFUNDED, refundTx: tx },
    });
    await this.log(id, e.onchainId, "Refunded", tx);
    return updated;
  }

  async releaseToSeller(id: string, actorId: string) {
    const e = await this.load(id);
    this.assertState(e.status, EscrowStatus.DISPUTED);
    this.assertArbiter(actorId);

    if (this.chain.enabled) {
      const { hash } = await this.chain.write("arbiter", {
        address: this.chain.escrow,
        abi: ESCROW_ABI,
        functionName: "releaseToSeller",
        params: [BigInt(e.onchainId)],
      });
      const updated = await this.prisma.escrow.update({
        where: { id },
        data: { status: EscrowStatus.RELEASED, releaseTx: hash },
      });
      await this.indexer.sync();
      return updated;
    }

    const tx = fakeTxHash("arbiter-release");
    const updated = await this.prisma.escrow.update({
      where: { id },
      data: { status: EscrowStatus.RELEASED, releaseTx: tx },
    });
    await this.log(id, e.onchainId, "Released", tx);
    return updated;
  }

  async timeoutRelease(id: string, actorId: string) {
    const e = await this.load(id);
    this.assertState(e.status, EscrowStatus.SHIPPED);
    if (!e.shippedAt) throw new BadRequestException("escrow was never shipped");
    if (Date.now() < e.shippedAt.getTime() + RELEASE_TIMEOUT_MS) {
      throw new BadRequestException("the 14-day release window has not elapsed");
    }

    if (this.chain.enabled) {
      const { hash } = await this.chain.write("arbiter", {
        address: this.chain.escrow,
        abi: ESCROW_ABI,
        functionName: "releaseByTimeout",
        params: [BigInt(e.onchainId)],
      });
      const updated = await this.prisma.escrow.update({
        where: { id },
        data: { status: EscrowStatus.RELEASED, releaseTx: hash },
      });
      await this.indexer.sync();
      return updated;
    }

    const tx = fakeTxHash("timeout-release");
    const updated = await this.prisma.escrow.update({
      where: { id },
      data: { status: EscrowStatus.RELEASED, releaseTx: tx },
    });
    await this.log(id, e.onchainId, "Released", tx);
    return updated;
  }

  /** Advances chain time — only possible on the local development chain. */
  async simulateTimeout(id: string) {
    if (!this.chain.supportsTimeTravel) {
      throw new BadRequestException(
        "time travel is only available on the local chain; on a public network the 14-day window must elapse",
      );
    }
    const e = await this.load(id);
    this.assertState(e.status, EscrowStatus.SHIPPED);

    const backdated = new Date(Date.now() - RELEASE_TIMEOUT_MS - 1000);
    if (this.chain.supportsTimeTravel) {
      await this.chain.increaseTime(14 * 24 * 60 * 60 + 60);
    }
    return this.prisma.escrow.update({
      where: { id },
      data: { shippedAt: backdated },
    });
  }

  /** The most recent on-chain transaction for this escrow, plus live balances. */
  async receipt(id: string) {
    const e = await this.prisma.escrow.findUnique({
      where: { id },
      include: { buyer: true, seller: true },
    });
    if (!e) throw new NotFoundException("escrow not found");

    const events = await this.prisma.chainEvent.findMany({ orderBy: { id: "desc" }, take: 50 });
    const last = events.find((ev) => String((ev.payload as { escrowId?: string } | null)?.escrowId) === e.onchainId);

    const balance = async (addr: string) =>
      this.chain.enabled
        ? (await this.chain.read<bigint>({ address: this.chain.token, abi: ERC20_ABI, functionName: "balanceOf", params: [addr as `0x${string}`] })).toString()
        : "0";

    let tx: { from: string; to: string; gasUsed: string; status: string; block: string } | null = null;
    if (last && this.chain.enabled) {
      try {
        const [transaction, rc] = await Promise.all([
          this.chain.publicClient.getTransaction({ hash: last.txHash as `0x${string}` }),
          this.chain.publicClient.getTransactionReceipt({ hash: last.txHash as `0x${string}` }),
        ]);
        tx = {
          from: transaction.from,
          to: transaction.to ?? "",
          gasUsed: rc.gasUsed.toString(),
          status: rc.status,
          block: rc.blockNumber.toString(),
        };
      } catch {
        tx = null;
      }
    }

    return {
      event: last?.eventName ?? null,
      txHash: last?.txHash ?? null,
      block: last?.blockNumber?.toString() ?? null,
      tx,
      amountUsdc: e.amountUsdc.toString(),
      balances: {
        buyer: await balance(e.buyer.walletAddress),
        seller: await balance(e.seller.walletAddress),
        escrow: await balance(this.chain.escrow),
      },
    };
  }

  // -------------------------------------------------- wallet-signed actions

  private static readonly SPEC = {
    fund:    { fn: "fund",            event: "Funded",    role: "buyer"   },
    ship:    { fn: "markShipped",     event: "Shipped",   role: "seller"  },
    confirm: { fn: "confirmDelivery", event: "Released",  role: "buyer"   },
    dispute: { fn: "dispute",         event: "Disputed",  role: "buyer"   },
    refund:  { fn: "refund",          event: "Refunded",  role: "arbiter" },
    release: { fn: "releaseToSeller", event: "Released",  role: "arbiter" },
    cancel:  { fn: "cancel",          event: "Cancelled", role: "buyer"   },
  } as const;

  /** Returns the calldata a wallet must sign for this action. */
  async prepareAction(id: string, action: keyof typeof EscrowService.SPEC, actorId: string) {
    const spec = EscrowService.SPEC[action];
    if (!spec) throw new BadRequestException("unknown action");
    const e = await this.prisma.escrow.findUnique({
      where: { id },
      include: { buyer: true, seller: true },
    });
    if (!e) throw new NotFoundException("escrow not found");
    this.assertActor(this.actorIdFor(spec.role, e), actorId, `only the ${spec.role} can ${action}`);

    const to = this.chain.escrow as `0x${string}`;
    const data = encodeFunctionData({
      abi: ESCROW_ABI,
      functionName: spec.fn,
      args: [BigInt(e.onchainId)],
    });
    return { to, data, chainId: this.chain.chainId, from: await this.addressFor(spec.role, e) };
  }

  /** Verifies a wallet-submitted transaction and only then advances the database. */
  async settleAction(id: string, action: keyof typeof EscrowService.SPEC, txHash: `0x${string}`, actorId: string) {
    const spec = EscrowService.SPEC[action];
    if (!spec) throw new BadRequestException("unknown action");
    const e = await this.prisma.escrow.findUnique({
      where: { id },
      include: { buyer: true, seller: true },
    });
    if (!e) throw new NotFoundException("escrow not found");
    this.assertActor(this.actorIdFor(spec.role, e), actorId, `only the ${spec.role} can ${action}`);

    await this.chain.verifyTx({
      hash: txHash,
      from: await this.addressFor(spec.role, e),
      escrowId: BigInt(e.onchainId),
      eventName: spec.event,
    });

    const now = new Date();
    const data: Record<string, unknown> = { status: undefined as unknown };
    if (action === "fund") Object.assign(data, { status: EscrowStatus.FUNDED, fundTx: txHash });
    if (action === "ship") Object.assign(data, { status: EscrowStatus.SHIPPED, shippedAt: now });
    if (action === "confirm") Object.assign(data, { status: EscrowStatus.RELEASED, releaseTx: txHash });
    if (action === "dispute") Object.assign(data, { status: EscrowStatus.DISPUTED, disputedAt: now });
    if (action === "refund") Object.assign(data, { status: EscrowStatus.REFUNDED, refundTx: txHash });
    if (action === "release") Object.assign(data, { status: EscrowStatus.RELEASED, releaseTx: txHash });
    if (action === "cancel") Object.assign(data, { status: EscrowStatus.CANCELLED });

    const updated = await this.prisma.escrow.update({ where: { id }, data });
    await this.indexer.sync();
    return updated;
  }

  private actorIdFor(role: string, e: { buyerId: string; sellerId: string }): string {
    return role === "seller" ? e.sellerId : role === "buyer" ? e.buyerId : "arbiter";
  }

  private async addressFor(role: string, e: { buyer: { walletAddress: string }; seller: { walletAddress: string } }): Promise<string> {
    if (role === "buyer") return e.buyer.walletAddress;
    if (role === "seller") return e.seller.walletAddress;
    return this.chain.address("arbiter");
  }

  // -------------------------------------------------------------- helpers

  private async load(id: string) {
    const escrow = await this.prisma.escrow.findUnique({ where: { id } });
    if (!escrow) throw new NotFoundException("escrow not found");
    return escrow;
  }

  private assertState(current: EscrowStatus, expected: EscrowStatus): void {
    if (current !== expected) {
      throw new BadRequestException(`expected ${expected}, escrow is ${current}`);
    }
  }

  private assertActor(expected: string, actorId: string, message: string): void {
    if (!this.operatorMode && expected !== actorId) throw new ForbiddenException(message);
  }

  private assertArbiter(actorId: string): void {
    if (!this.operatorMode) {
      throw new ForbiddenException("only the arbiter can arbitrate");
    }
  }

  private async log(
    escrowId: string,
    onchainId: string,
    eventName: string,
    txHash: string,
  ): Promise<void> {
    await this.prisma.chainEvent.create({
      data: {
        txHash,
        logIndex: 0,
        blockNumber: BigInt(
          8_000_000 + Math.floor((Date.now() - 1_760_000_000_000) / 12_000) + this.eventSeq++,
        ),
        eventName,
        payload: { escrowId: onchainId, simulated: true },
      },
    });
  }
}
