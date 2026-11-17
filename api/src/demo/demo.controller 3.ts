import { Controller, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import { issueSession, SESSION_COOKIE } from "../auth/session";
import { DemoService } from "./demo.service";

@Controller("demo")
export class DemoController {
  constructor(private readonly demo: DemoService) {}

  @Post("session")
  async session(@Res({ passthrough: true }) res: Response) {
    const user = await this.demo.session();
    res.cookie(SESSION_COOKIE, issueSession(user.walletAddress), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 2 * 60 * 60 * 1000,
      path: "/",
    });
    return { walletAddress: user.walletAddress, demo: true };
  }

  @Post("reset")
  reset() {
    return this.demo.reset();
  }
}
