import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { User } from "@prisma/client";
import type { Request } from "express";
import { PrismaService } from "../prisma/prisma.service";
import { readSession, SESSION_COOKIE } from "./session";

export interface AuthedRequest extends Request {
  user?: User;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const payload = readSession(req.cookies?.[SESSION_COOKIE]);
    if (!payload) throw new UnauthorizedException("no session");

    const user = await this.prisma.user.findUnique({
      where: { walletAddress: payload.addr },
    });
    if (!user) throw new UnauthorizedException("unknown user");

    req.user = user;
    return true;
  }
}
