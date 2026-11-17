import { Module } from "@nestjs/common";
import { ChainService } from "./chain.service";
import { IndexerService } from "./indexer.service";

@Module({
  providers: [ChainService, IndexerService],
  exports: [ChainService, IndexerService],
})
export class ChainModule {}
