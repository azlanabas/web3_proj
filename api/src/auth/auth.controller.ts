import { Body, Controller, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { z } from "zod";
import { ZodPipe } from "../common/zod.pipe";
import { AuthGuard, AuthedRequest } from "./auth.guard";
import { AuthService } from "./auth.service";
import { issueSession, SESSION_COOKIE } from "./session";

const VerifySchema = z.object({
  message: z.string().min(1),
  signature: z.string().min(1),
});

type VerifyBody = z.infer<typeof VerifySchema>;

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("siwe/nonce")
  async nonce(): Promise<{ nonce: string }> {
    return { nonce: await this.auth.issueNonce() };
  }

  @Post("siwe/verify")
  async verify(
    @Body(new ZodPipe(VerifySchema)) body: VerifyBody,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ address: string }> {
    const { address } = await this.auth.verify(body.message, body.signature);
    res.cookie(SESSION_COOKIE, issueSession(address), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 2 * 60 * 60 * 1000,
      path: "/",
    });
    return { address };
  }

  @Post("logout")
  logout(@Res({ passthrough: true }) res: Response): { ok: boolean } {
    res.clearCookie(SESSION_COOKIE, { path: "/" });
    return { ok: true };
  }

  @Get("me")
  @UseGuards(AuthGuard)
  me(@Req() req: AuthedRequest): { id: string; walletAddress: string; role: string } {
    const user = req.user as NonNullable<AuthedRequest["user"]>;
    return { id: user.id, walletAddress: user.walletAddress, role: user.role };
  }
}
