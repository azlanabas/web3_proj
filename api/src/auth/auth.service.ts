import { Injectable, UnauthorizedException } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { SiweMessage } from "siwe";
import { PrismaService } from "../prisma/prisma.service";

const NONCE_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async issueNonce(): Promise<string> {
    const nonce = randomBytes(16).toString("hex");
    await this.prisma.siweNonce.create({
      data: { nonce, expiresAt: new Date(Date.now() + NONCE_TTL_MS) },
    });
    return nonce;
  }

  async verify(message: string, signature: string): Promise<{ address: string }> {
    const siwe = new SiweMessage(message);

    let result: Awaited<ReturnType<SiweMessage["verify"]>>;
    try {
      result = await siwe.verify({ signature });
    } catch {
      throw new UnauthorizedException("malformed SIWE message");
    }
    if (!result.success) {
      throw new UnauthorizedException(result.error?.type ?? "invalid signature");
    }

    const expectedDomain = process.env.SIWE_DOMAIN;
    if (expectedDomain && siwe.domain !== expectedDomain) {
      throw new UnauthorizedException("wrong domain");
    }

    const stored = await this.prisma.siweNonce.findUnique({ where: { nonce: siwe.nonce } });
    if (!stored || stored.usedAt !== null || stored.expiresAt < new Date()) {
      throw new UnauthorizedException("invalid or expired nonce");
    }
    await this.prisma.siweNonce.update({
      where: { id: stored.id },
      data: { usedAt: new Date() },
    });

    const address = siwe.address.toLowerCase();
    await this.prisma.user.upsert({
      where: { walletAddress: address },
      create: { walletAddress: address },
      update: {},
    });

    return { address };
  }
}
