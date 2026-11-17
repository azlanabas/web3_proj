import { Controller, Get } from "@nestjs/common";

const ENDPOINTS = [
  { method: "GET",    path: "/api/health",                    auth: "public", purpose: "Liveness probe used by nginx and status checks" },
  { method: "GET",    path: "/api/meta",                      auth: "public", purpose: "Machine-readable description of this service" },
  { method: "POST",   path: "/api/demo/session",              auth: "public", purpose: "Issues a demo session cookie and seeds sample vehicles" },
  { method: "POST",   path: "/api/demo/reset",                auth: "public", purpose: "Clears escrows and chain events (demo only)" },
  { method: "POST",   path: "/api/auth/siwe/nonce",           auth: "public", purpose: "Issues a single-use SIWE nonce, 5 minute TTL" },
  { method: "POST",   path: "/api/auth/siwe/verify",          auth: "public", purpose: "Verifies a wallet signature, sets an httpOnly session cookie" },
  { method: "POST",   path: "/api/auth/logout",               auth: "session", purpose: "Clears the session cookie" },
  { method: "GET",    path: "/api/auth/me",                   auth: "session", purpose: "Returns the authenticated wallet and role" },
  { method: "GET",    path: "/api/listings",                  auth: "public", purpose: "Paginated listings, filterable by make and year" },
  { method: "GET",    path: "/api/listings/:id",              auth: "public", purpose: "Single listing with images" },
  { method: "POST",   path: "/api/listings",                  auth: "seller", purpose: "Creates a listing owned by the caller" },
  { method: "PATCH",  path: "/api/listings/:id",              auth: "owner",  purpose: "Updates a listing the caller owns" },
  { method: "GET",    path: "/api/escrows",                   auth: "session", purpose: "All escrows with buyer, seller and listing" },
  { method: "GET",    path: "/api/escrows/:id",               auth: "session", purpose: "Escrow detail plus its ordered chain events" },
  { method: "POST",   path: "/api/escrows",                   auth: "buyer",  purpose: "Opens an escrow against a listing" },
  { method: "POST",   path: "/api/escrows/:id/fund",          auth: "buyer",  purpose: "CREATED → FUNDED, records the funding transaction" },
  { method: "POST",   path: "/api/escrows/:id/ship",          auth: "seller", purpose: "FUNDED → SHIPPED, starts the 14 day timer" },
  { method: "POST",   path: "/api/escrows/:id/confirm",       auth: "buyer",  purpose: "SHIPPED → RELEASED, pays the seller" },
  { method: "POST",   path: "/api/escrows/:id/dispute",       auth: "buyer",  purpose: "SHIPPED → DISPUTED, freezes the timer" },
  { method: "POST",   path: "/api/escrows/:id/refund",        auth: "arbiter", purpose: "Returns funds to the buyer" },
  { method: "POST",   path: "/api/escrows/:id/release",       auth: "arbiter", purpose: "Pays the seller from a disputed escrow" },
  { method: "POST",   path: "/api/escrows/:id/timeout-release", auth: "any",  purpose: "Pays the seller once 14 days have elapsed undisputed" },
  { method: "POST",   path: "/api/escrows/:id/simulate-timeout", auth: "any", purpose: "Backdates shipment by 14 days (demo affordance)" },
];

@Controller("meta")
export class MetaController {
  @Get()
  meta() {
    return {
      service: "web3proj-api",
      version: "0.1.0",
      generatedAt: new Date().toISOString(),
      runtime: {
        node: process.version,
        framework: "NestJS 12.5.1",
        language: "TypeScript 5.9.3 (strict)",
        orm: "Prisma 6.19.3",
        database: "PostgreSQL 16.15",
        validation: "Zod 4.6.7",
        auth: "SIWE (EIP-4361) + HMAC session cookie",
      },
      web3: {
        chain: "Ethereum Sepolia",
        chainId: 11155111,
        token: "USDC",
        tokenAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
        tokenDecimals: 6,
        escrowContract: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        solidity: "0.8.28",
        openzeppelin: "5.7.0",
        settlement: "simulated",
        note: "Contract is written and tested (23/23) but not deployed; transitions are recorded, not mined.",
      },
      escrow: {
        states: ["CREATED", "FUNDED", "SHIPPED", "DISPUTED", "RELEASED", "REFUNDED", "CANCELLED"],
        releaseTimeoutDays: 14,
        arbitration: "refund or release to seller, only inside a dispute",
      },
      endpoints: ENDPOINTS,
    };
  }
}
