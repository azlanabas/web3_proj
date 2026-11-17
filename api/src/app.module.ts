import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { DemoModule } from "./demo/demo.module";
import { EscrowModule } from "./escrow/escrow.module";
import { HealthController } from "./health/health.controller";
import { ListingsModule } from "./listings/listings.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [PrismaModule, AuthModule, ListingsModule, EscrowModule, DemoModule],
  controllers: [HealthController],
})
export class AppModule {}
