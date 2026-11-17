import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { decodeEventLog } from "viem";
import { PrismaService } from "../prisma/prisma.service";
import { ChainService, ESCROW_ABI } from "./chain.service";

const STATUS_BY_EVENT: Record<string, string> = {
  Funded: "FUNDED",
  Shipped: "SHIPPED",
  Disputed: "DISPUTED",
  Released: "RELEASED",
  Refunded: "REFUNDED",
  Cancelled: "CANCELLED",
};

@Injectable()
export class IndexerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IndexerService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly chain: ChainService,
  ) {}

  onModuleInit(): void {
    if (!this.chain.enabled) return;
    this.timer = setInterval(() => void this.sync(), 4000);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** Reads escrow logs since the last checkpoint and mirrors them locally. */
  async sync(): Promise<number> {
    if (!this.chain.enabled || this.running) return 0;
    this.running = true;
    let added = 0;
    try {
      const latest = await this.chain.blockNumber();
      const last = await this.prisma.chainEvent.findFirst({
        orderBy: { blockNumber: "desc" },
        select: { blockNumber: true },
      });
      const from = last
        ? last.blockNumber + 1n
        : BigInt(process.env.CONTRACT_DEPLOY_BLOCK ?? 0);
      if (from > latest) return 0;

      const logs = await this.chain.publicClient.getLogs({
        address: this.chain.escrow,
        fromBlock: from,
        toBlock: latest,
      });

      for (const log of logs) {
        const decoded = decodeEventLog({
          abi: ESCROW_ABI,
          data: log.data,
          topics: log.topics,
        });
        const args = decoded.args as unknown as { escrowId?: bigint };
        if (args.escrowId === undefined) continue;

        const escrowId = args.escrowId.toString();
        const payload: Record<string, unknown> = { escrowId };
        for (const [k, v] of Object.entries(args)) {
          payload[k] = typeof v === "bigint" ? v.toString() : v;
        }

        try {
          await this.prisma.chainEvent.create({
            data: {
              txHash: log.transactionHash,
              logIndex: Number(log.logIndex),
              blockNumber: log.blockNumber,
              eventName: decoded.eventName,
              payload: payload as never,
            },
          });
          added += 1;
        } catch {
          continue; // duplicate (txHash, logIndex) — idempotent
        }

        const status = STATUS_BY_EVENT[decoded.eventName];
        if (status) {
          await this.prisma.escrow.updateMany({
            where: { onchainId: escrowId },
            data: { status: status as never },
          });
        }
      }
    } catch (err) {
      this.logger.warn(`indexer sync failed: ${(err as Error).message}`);
    } finally {
      this.running = false;
    }
    return added;
  }
}
