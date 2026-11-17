import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { EscrowStatus } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
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

  constructor(private readonly prisma: PrismaService) {}

  /** In demo mode the acting user may drive every step, like a walkthrough. */
  private get demoMode(): boolean {
    return process.env.DEMO_MODE === "true";
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
      where: { payload: { path: ["escrowId"], equals: id } },
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
    await this.log(escrow.id, "EscrowCreated", fakeTxHash("create"));
    return escrow;
  }

  async fund(id: string, actorId: string) {
    const e = await this.load(id);
    this.assertState(e.status, EscrowStatus.CREATED);
    this.assertActor(e.buyerId, actorId, "only the buyer can fund");

    const tx = fakeTxHash("fund");
    const updated = await this.prisma.escrow.update({
      where: { id },
      data: { status: EscrowStatus.FUNDED, fundTx: tx },
    });
    await this.log(id, "Funded", tx);
    return updated;
  }

  async ship(id: string, actorId: string) {
    const e = await this.load(id);
    this.assertState(e.status, EscrowStatus.FUNDED);
    this.assertActor(e.sellerId, actorId, "only the seller can ship");

    const tx = fakeTxHash("ship");
    const updated = await this.prisma.escrow.update({
      where: { id },
      data: { status: EscrowStatus.SHIPPED, shippedAt: new Date() },
    });
    await this.log(id, "Shipped", tx);
    return updated;
  }

  async confirm(id: string, actorId: string) {
    const e = await this.load(id);
    this.assertState(e.status, EscrowStatus.SHIPPED);
    this.assertActor(e.buyerId, actorId, "only the buyer can confirm");

    const tx = fakeTxHash("release");
    const updated = await this.prisma.escrow.update({
      where: { id },
      data: { status: EscrowStatus.RELEASED, releaseTx: tx },
    });
    await this.log(id, "Released", tx);
    return updated;
  }

  async dispute(id: string, actorId: string) {
    const e = await this.load(id);
    this.assertState(e.status, EscrowStatus.SHIPPED);
    this.assertActor(e.buyerId, actorId, "only the buyer can dispute");
    if (e.shippedAt && Date.now() >= e.shippedAt.getTime() + RELEASE_TIMEOUT_MS) {
      throw new BadRequestException("the release deadline has already passed");
    }

    const tx = fakeTxHash("dispute");
    const updated = await this.prisma.escrow.update({
      where: { id },
      data: { status: EscrowStatus.DISPUTED, disputedAt: new Date() },
    });
    await this.log(id, "Disputed", tx);
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

    const tx = fakeTxHash("refund");
    const updated = await this.prisma.escrow.update({
      where: { id },
      data: { status: EscrowStatus.REFUNDED, refundTx: tx },
    });
    await this.log(id, "Refunded", tx);
    return updated;
  }

  async releaseToSeller(id: string, actorId: string) {
    const e = await this.load(id);
    this.assertState(e.status, EscrowStatus.DISPUTED);
    this.assertArbiter(actorId);

    const tx = fakeTxHash("arbiter-release");
    const updated = await this.prisma.escrow.update({
      where: { id },
      data: { status: EscrowStatus.RELEASED, releaseTx: tx },
    });
    await this.log(id, "Released", tx);
    return updated;
  }

  async timeoutRelease(id: string, actorId: string) {
    const e = await this.load(id);
    this.assertState(e.status, EscrowStatus.SHIPPED);
    if (!e.shippedAt) throw new BadRequestException("escrow was never shipped");
    if (Date.now() < e.shippedAt.getTime() + RELEASE_TIMEOUT_MS) {
      throw new BadRequestException("the 14-day release window has not elapsed");
    }

    const tx = fakeTxHash("timeout-release");
    const updated = await this.prisma.escrow.update({
      where: { id },
      data: { status: EscrowStatus.RELEASED, releaseTx: tx },
    });
    await this.log(id, "Released", tx);
    return updated;
  }

  /** Demo affordance: moves the shipment timestamp back 14 days. */
  async simulateTimeout(id: string) {
    const e = await this.load(id);
    this.assertState(e.status, EscrowStatus.SHIPPED);
    const backdated = new Date(Date.now() - RELEASE_TIMEOUT_MS - 1000);
    const updated = await this.prisma.escrow.update({
      where: { id },
      data: { shippedAt: backdated },
    });
    await this.log(id, "TimeoutSimulated", fakeTxHash("simulate"));
    return updated;
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
    if (!this.demoMode && expected !== actorId) throw new ForbiddenException(message);
  }

  private assertArbiter(actorId: string): void {
    if (!this.demoMode) {
      throw new ForbiddenException("only the arbiter can arbitrate");
    }
  }

  private async log(escrowId: string, eventName: string, txHash: string): Promise<void> {
    await this.prisma.chainEvent.create({
      data: {
        txHash,
        logIndex: 0,
        blockNumber: BigInt(
          8_000_000 + Math.floor((Date.now() - 1_760_000_000_000) / 12_000) + this.eventSeq++,
        ),
        eventName,
        payload: { escrowId, simulated: true },
      },
    });
  }
}
