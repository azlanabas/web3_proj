import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { EscrowController } from "./escrow.controller";
import { EscrowService } from "./escrow.service";

@Module({
  imports: [AuthModule],
  controllers: [EscrowController],
  providers: [EscrowService],
})
export class EscrowModule {}
