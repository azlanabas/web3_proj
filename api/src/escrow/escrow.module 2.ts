import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ChainModule } from "../chain/chain.module";
import { EscrowController } from "./escrow.controller";
import { EscrowService } from "./escrow.service";

@Module({
  imports: [AuthModule, ChainModule],
  controllers: [EscrowController],
  providers: [EscrowService],
})
export class EscrowModule {}
