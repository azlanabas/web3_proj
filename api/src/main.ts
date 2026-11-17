import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { AppModule } from "./app.module";

(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function (
  this: bigint,
): string {
  return this.toString();
};

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: ["error", "warn", "log"] });
  app.use(helmet());
  app.use(cookieParser());
  app.setGlobalPrefix("api");
  const allowed = process.env.SIWE_ORIGIN?.split(",").filter(Boolean);
  app.enableCors({ origin: allowed ?? false, credentials: true });

  const port = Number(process.env.PORT ?? 8310);
  await app.listen(port, "127.0.0.1");
  console.log(`web3proj api listening on 127.0.0.1:${port}`);
}

void bootstrap();
