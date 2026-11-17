import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { AuthGuard, AuthedRequest } from "../auth/auth.guard";
import { ZodPipe } from "../common/zod.pipe";
import { EscrowService } from "./escrow.service";

const CreateSchema = z.object({ listingId: z.string().uuid() });

@Controller("escrows")
@UseGuards(AuthGuard)
export class EscrowController {
  constructor(private readonly escrow: EscrowService) {}

  @Get()
  list() {
    return this.escrow.list();
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.escrow.get(id);
  }

  @Post()
  create(
    @Req() req: AuthedRequest,
    @Body(new ZodPipe(CreateSchema)) body: { listingId: string },
  ) {
    return this.escrow.create(this.user(req).id, body.listingId);
  }

  @Post(":id/fund")
  fund(@Req() req: AuthedRequest, @Param("id") id: string) {
    return this.escrow.fund(id, this.user(req).id);
  }

  @Post(":id/ship")
  ship(@Req() req: AuthedRequest, @Param("id") id: string) {
    return this.escrow.ship(id, this.user(req).id);
  }

  @Post(":id/confirm")
  confirm(@Req() req: AuthedRequest, @Param("id") id: string) {
    return this.escrow.confirm(id, this.user(req).id);
  }

  @Post(":id/dispute")
  dispute(@Req() req: AuthedRequest, @Param("id") id: string) {
    return this.escrow.dispute(id, this.user(req).id);
  }

  @Post(":id/refund")
  refund(@Req() req: AuthedRequest, @Param("id") id: string) {
    return this.escrow.refund(id, this.user(req).id);
  }

  @Post(":id/release")
  release(@Req() req: AuthedRequest, @Param("id") id: string) {
    return this.escrow.releaseToSeller(id, this.user(req).id);
  }

  @Post(":id/timeout-release")
  timeoutRelease(@Req() req: AuthedRequest, @Param("id") id: string) {
    return this.escrow.timeoutRelease(id, this.user(req).id);
  }

  @Post(":id/simulate-timeout")
  simulateTimeout(@Param("id") id: string) {
    return this.escrow.simulateTimeout(id);
  }

  private user(req: AuthedRequest) {
    return req.user as NonNullable<AuthedRequest["user"]>;
  }
}
