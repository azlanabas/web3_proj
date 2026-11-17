import { Controller, Get, NotFoundException } from "@nestjs/common";
import { privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";
import { PATH_METADATA, METHOD_METADATA } from "@nestjs/common/constants";
import { DiscoveryService, MetadataScanner, ModulesContainer } from "@nestjs/core";
import { RequestMethod } from "@nestjs/common";
import { EscrowStatus } from "@prisma/client";
import { ChainService, ERC20_ABI, ESCROW_ABI } from "../chain/chain.service";
import { PrismaService } from "../prisma/prisma.service";
import { ROUTE_PREFIX } from "../config";
import { API_DOC_KEY, ApiDocMeta } from "./api-doc.decorator";

const METHOD_NAMES: Record<number, string> = {
  [RequestMethod.GET]: "GET",
  [RequestMethod.POST]: "POST",
  [RequestMethod.PUT]: "PUT",
  [RequestMethod.PATCH]: "PATCH",
  [RequestMethod.DELETE]: "DELETE",
};

@Controller()
export class MetaController {
  private readonly startedAt = Date.now();

  constructor(
    private readonly discovery: DiscoveryService,
    private readonly modules: ModulesContainer,
    private readonly scanner: MetadataScanner,
    private readonly prisma: PrismaService,
    private readonly chain: ChainService,
  ) {}

  /** Every route is read from the router at runtime — nothing here is a typed-in list. */
  private endpoints() {
    const out: { method: string; path: string; auth: string; purpose: string }[] = [];
    for (const wrapper of this.discovery.getControllers()) {
      const { metatype } = wrapper;
      if (!metatype) continue;
      const controllerPath = Reflect.getMetadata(PATH_METADATA, metatype) ?? "";
      const prototype = metatype.prototype;
      for (const name of this.scanner.getAllMethodNames(prototype)) {
        const handler = prototype[name];
        const methodId = Reflect.getMetadata(METHOD_METADATA, handler);
        const routePath = Reflect.getMetadata(PATH_METADATA, handler);
        if (methodId === undefined || routePath === undefined) continue;

        const doc =
          (Reflect.getMetadata(API_DOC_KEY, handler) as ApiDocMeta | undefined) ??
          (Reflect.getMetadata(API_DOC_KEY, metatype) as ApiDocMeta | undefined);

        const guards =
          (Reflect.getMetadata("__guards__", handler) as unknown[] | undefined) ??
          (Reflect.getMetadata("__guards__", metatype) as unknown[] | undefined) ??
          [];
        const guarded = guards.length > 0;

        const clean = (s: string) => String(s ?? "").replace(/^\/+|\/+$/g, "");
        const segments = [ROUTE_PREFIX, clean(controllerPath), clean(routePath)].filter(Boolean);
        out.push({
          method: METHOD_NAMES[methodId] ?? String(methodId),
          path: "/" + segments.join("/"),
          auth: doc?.auth ?? (guarded ? "session" : "public"),
          purpose: doc?.purpose ?? "",
        });
      }
    }
    return out.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
  }

  @Get("meta")
  async meta() {
    const [listings, escrows, events] = await Promise.all([
      this.prisma.listing.count(),
      this.prisma.escrow.count(),
      this.prisma.chainEvent.count(),
    ]);

    let blockNumber: string | null = null;
    let gasPriceWei: string | null = null;
    let timeoutSeconds: string | null = null;
    let tokenDecimals: number | null = null;
    const accounts = { arbiter: "", seller: "", buyer: "" };

    if (this.chain.enabled) {
      const safe = async (fn: () => Promise<void>) => {
        try {
          await fn();
        } catch {
          /* a single failed read must not blank the whole response */
        }
      };
      await safe(async () => {
        blockNumber = (await this.chain.blockNumber()).toString();
      });
      await safe(async () => {
        gasPriceWei = (await this.chain.publicClient.getGasPrice()).toString();
      });
      await safe(async () => {
        timeoutSeconds = (
          await this.chain.read<bigint>({
            address: this.chain.escrow,
            abi: ESCROW_ABI,
            functionName: "RELEASE_TIMEOUT",
          })
        ).toString();
      });
      await safe(async () => {
        tokenDecimals = Number(
          await this.chain.read<number>({
            address: this.chain.token,
            abi: ERC20_ABI,
            functionName: "decimals",
          }),
        );
      });
      await safe(async () => {
        accounts.arbiter = await this.chain.address("arbiter");
      });
      await safe(async () => {
        accounts.seller = await this.chain.address("seller");
      });
      await safe(async () => {
        accounts.buyer = await this.chain.address("buyer");
      });
    }

    return {
      service: "web3proj-api",
      version: process.env.npm_package_version ?? "0.1.0",
      startedAt: new Date(this.startedAt).toISOString(),
      uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
      runtime: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        memoryMb: Math.round(process.memoryUsage().rss / 1048576),
      },
      chain: {
        mode: this.chain.mode,
        network: this.chain.networkName,
        chainId: this.chain.chainId,
        rpcHost: this.chain.rpcHost,
        escrow: this.chain.escrow,
        token: this.chain.token,
        deployBlock: this.chain.deployBlock,
        blockNumber,
        gasPriceWei,
        timeoutSeconds,
        tokenDecimals,
        accounts,
        supportsTimeTravel: this.chain.supportsTimeTravel,
      },
      counts: { listings, escrows, events },
      escrowStates: Object.keys(EscrowStatus),
      endpoints: this.endpoints(),
    };
  }

  /** The Sepolia deployer address, derived from the configured key at request time. */
  @Get("deployer")
  deployer() {
    const key = process.env.SEPOLIA_DEPLOYER_KEY as Hex | undefined;
    if (!key) throw new NotFoundException("no deployer key configured");
    return { address: privateKeyToAccount(key).address };
  }

  /** Recent indexed events, so the site can show the real transactions. */
  @Get("chain/events")
  async events() {
    const rows = await this.prisma.chainEvent.findMany({ orderBy: { id: "desc" }, take: 25 });
    return rows.map((r) => ({
      eventName: r.eventName,
      txHash: r.txHash,
      blockNumber: r.blockNumber.toString(),
      escrowId: (r.payload as { escrowId?: string } | null)?.escrowId ?? null,
      payload: r.payload,
    }));
  }

  @Get("chain/block")
  async block() {
    if (!this.chain.enabled) return { available: false };
    const block = await this.chain.publicClient.getBlock();
    return {
      available: true,
      number: block.number?.toString(),
      hash: block.hash,
      parentHash: block.parentHash,
      stateRoot: block.stateRoot,
      timestamp: block.timestamp?.toString(),
      gasUsed: block.gasUsed?.toString(),
      transactions: block.transactions.length,
    };
  }
}
