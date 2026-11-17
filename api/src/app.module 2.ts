import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./auth/auth.module";
import { ChainModule } from "./chain/chain.module";
import { AppThrottlerGuard } from "./common/throttler.guard";
import { DemoModule } from "./demo/demo.module";
import { EscrowModule } from "./escrow/escrow.module";
import { HealthController } from "./health/health.controller";
import { ListingsModule } from "./listings/listings.module";
import { MetaModule } from "./meta/meta.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    ChainModule,
    AuthModule,
    ListingsModule,
    EscrowModule,
    DemoModule,
    MetaModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: AppThrottlerGuard }],
})
export class AppModule {}
