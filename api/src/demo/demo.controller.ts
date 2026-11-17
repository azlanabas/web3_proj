import { Controller, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import { issueSession, SESSION_COOKIE } from "../auth/session";
import { DemoService } from "./demo.service";

@Controller("session")
export class DemoController {
  constructor(private readonly sessions: DemoService) {}

  @Post()
  async create(@Res({ passthrough: true }) res: Response) {
    const user = await this.sessions.session();
    res.cookie(SESSION_COOKIE, issueSession(user.walletAddress), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 2 * 60 * 60 * 1000,
      path: "/",
    });
    return { walletAddress: user.walletAddress };
  }

  @Post("reset")
  reset() {
    return this.sessions.reset();
  }
}
