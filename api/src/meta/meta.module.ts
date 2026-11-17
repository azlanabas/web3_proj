import { Module } from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";
import { ChainModule } from "../chain/chain.module";
import { MetaController } from "./meta.controller";

@Module({ imports: [DiscoveryModule, ChainModule], controllers: [MetaController] })
export class MetaModule {}
