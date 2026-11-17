import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { ChainModule } from "./chain/chain.module";
import { DemoModule } from "./demo/demo.module";
import { EscrowModule } from "./escrow/escrow.module";
import { HealthController } from "./health/health.controller";
import { ListingsModule } from "./listings/listings.module";
import { MetaModule } from "./meta/meta.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    PrismaModule,
    ChainModule,
    AuthModule,
    ListingsModule,
    EscrowModule,
    DemoModule,
    MetaModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
