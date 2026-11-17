# architecture.md — web3_proj

**Status:** architecture agreed 2026-11-17 GMT+8 · nothing built
**Companions:** [`plan.md`](plan.md) · [`todo.md`](todo.md) · [`docs/01-mvp-scope.md`](docs/01-mvp-scope.md) · [`docs/03-decisions.md`](docs/03-decisions.md)

All host facts below were **measured on the running instance** on 2026-11-17. All on-chain
facts were **read from Sepolia** the same day. Anything unverified says so.

---

## 1. What this system is

A marketplace where a buyer's USDC is held by a smart contract until delivery is confirmed.
The platform is a venue and an arbitration desk; it never holds funds.

One escrow loop is the whole MVP:

```
list → create escrow → fund → ship → confirm → release        (refund on failure)
```

## 2. Context

```
        Buyer / Seller / Operator                (humans, wallet in browser)
                    │
                    │ HTTPS
                    ▼
        ┌───────────────────────┐
        │  nginx 1.24 (EC2)     │  TLS via certbot
        │  web3.heurist.online  │
        └──────┬─────────┬──────┘
        static │         │ /api/
               ▼         ▼
        ┌──────────┐  ┌──────────────────┐
        │ Vite SPA │  │ NestJS API :8310 │───┐
        └──────────┘  └──────┬───────────┘   │
                             │               │ S3 (images)
                       ┌─────▼──────┐        │
                       │ PostgreSQL │        │
                       │ 16.15      │        │
                       └─────▲──────┘        │
                             │               │
                    ┌────────┴───────┐       │
                    │ Indexer worker │───┐   │
                    │ (systemd)      │   │   │
                    └────────────────┘   │   │
                                         ▼   │
                              ┌────────────────────┐
                              │ Sepolia RPC        │
                              │ (Alchemy, verified)│
                              └─────────┬──────────┘
                                        ▼
                              ┌────────────────────┐
                              │ VehicleEscrow.sol  │
                              │ USDC · 6 decimals  │
                              └────────────────────┘
```

## 3. Host — measured, not planned

| Item | Value |
|---|---|
| Cloud | AWS `ap-southeast-1` |
| Instance | `t4g.small`, **arm64**, Ubuntu **24.04.4 LTS** |
| RAM | 1.8 GB total, ~1.1 GB free, **4 GB swap** |
| Disk | 29 GB, **11 GB free** |
| Existing workload | `seoads` (Next.js `:3000`, Rust API `:8080`, 8 GB) — **must not be disturbed** |
| Node | **24.21.0** |
| PostgreSQL | **16.15**, bound to `127.0.0.1` |
| nginx | **1.24.0** |
| Docker | **not installed, and not used** (D-15) |
| Access | SSH over Tailscale; port 22 **closed** to the internet |

The shared host is a real constraint. The app must fit in roughly **600 MB RSS** alongside
`seoads`, or it will start competing for memory and swap.

## 4. Stack

Confirmed 2026-11-17. Versions marked *pin* are fixed by reading the installed version at
scaffold time and recording it — never guessed.

### Core

| Layer | Choice | Version |
|---|---|---|
| Backend | NestJS, REST | pin |
| Language | TypeScript `strict` | pin |
| Frontend | Vite + React + Tailwind | pin |
| Database | PostgreSQL | 16.15 |
| ORM | Prisma | pin |
| Validation | Zod at every request boundary | pin |
| Auth | SIWE (EIP-4361) → httpOnly cookie | pin |
| Tests | Vitest, Playwright | pin |
| Logs | pino → journald | pin |

### Web3

| Layer | Choice | Notes |
|---|---|---|
| Chain | Ethereum **Sepolia** (11155111) | verified live |
| Token | USDC `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` | `symbol()`/`name()` = "USDC", `decimals()` = 6, 1,798 bytes — read on-chain 2026-11-17 |
| RPC | Alchemy (key verified) + `publicnode` fallback | |
| Contracts | Solidity 0.8.x, **Foundry** | pin |
| Libraries | OpenZeppelin v5 `SafeERC20`, `ReentrancyGuard`, `Ownable2Step` | |
| Client | **viem** | |
| Wallet | **wagmi v2 + RainbowKit** | |
| Indexer | custom `getLogs` poller, Postgres checkpoint | no extra service |
| Arbiter key | systemd `EnvironmentFile`, mode 600 | KMS is a later step |
| Verification | Etherscan Sepolia API | needs an API key |

## 5. Domain model

```
Listing 1 ──── 0..* Image
   │
   │ 1
   ▼
Escrow  * ──── 1 Buyer (User)
   │      └──── 1 Seller (User)
   │
   └── 1..* ChainEvent   (append-only, idempotent)
```

Prisma models (shape, not final syntax):

```prisma
model User {
  id            String   @id @default(uuid())
  walletAddress String   @unique          // lowercased
  role          Role     @default(BUYER)  // BUYER | SELLER | OPERATOR
  createdAt     DateTime @default(now())
}

model Listing {
  id         String    @id @default(uuid())
  sellerId   String
  title      String
  make       String
  model      String
  year       Int
  vin        String
  mileage    Int
  priceUsdc  Decimal   @db.Decimal(20, 6)   // never a float
  status     ListingStatus
  deletedAt  DateTime?
}

model Escrow {
  id              String   @id @default(uuid())
  listingId       String
  buyerId         String
  sellerId        String
  chainId         Int
  contractAddress String
  onchainId       String                     // uint256 as string
  amountUsdc      Decimal  @db.Decimal(20, 6)
  status          EscrowStatus
  fundTx          String?
  releaseTx       String?
  refundTx        String?
  createdAt       DateTime @default(now())
}

model ChainEvent {
  id          BigInt   @id @default(autoincrement())
  txHash      String
  logIndex    Int
  blockNumber BigInt
  eventName   String
  payload     Json
  processedAt DateTime?
  @@unique([txHash, logIndex])               // makes the indexer idempotent
}
```

## 6. Escrow state machine

```
CREATED ──fund──▶ FUNDED ──ship──▶ SHIPPED ──confirm──▶ RELEASED
   │                 │                 │
   │cancel           │refund           │refund
   ▼                 ▼                 ▼
CANCELLED         REFUNDED          REFUNDED
```

Terminal: `RELEASED`, `REFUNDED`, `CANCELLED`. No transition out.

**Deadlock risk — unresolved.** If the seller ships and the buyer simply never confirms,
funds are locked forever: the arbiter can refund but cannot release, and the buyer has no
incentive to act. This is a genuine hole in the "arbiter is refund-only" model. See §11.

## 7. Contract — `VehicleEscrow.sol`

```solidity
enum State { NONE, CREATED, FUNDED, SHIPPED, RELEASED, REFUNDED, CANCELLED }

struct Escrow {
    address buyer;
    address seller;
    address arbiter;
    uint256 amount;
    State   state;
}
```

Functions: `createEscrow`, `fund`, `markShipped`, `confirmDelivery`, `refund`, `cancel`.
Events: `EscrowCreated`, `Funded`, `Shipped`, `Released`, `Refunded`, `Cancelled`.

One deployment holds many escrows keyed by `escrowId`. **No proxy, no upgradeability** — an
escrow users can trust should not be silently mutable.

Invariants:

1. Funds move only to the recorded buyer or seller.
2. `refund` is callable **only** by the arbiter.
3. The arbiter can never send funds to the seller.
4. Terminal states are terminal.
5. `cancel` is impossible once funded.
6. Reentrancy on every state transition is blocked.

## 8. API

| Method | Path | Auth |
|---|---|---|
| GET | `/api/listings` | public |
| GET | `/api/listings/:id` | public |
| POST | `/api/listings` | seller |
| PATCH | `/api/listings/:id` | seller (own) |
| POST | `/api/auth/siwe/nonce` | public |
| POST | `/api/auth/siwe/verify` | public |
| POST | `/api/escrows` | buyer |
| POST | `/api/escrows/:id/ship` | seller |
| POST | `/api/escrows/:id/confirm` | buyer |
| POST | `/api/escrows/:id/refund` | arbiter |
| GET | `/api/admin/escrows` | operator |
| GET | `/api/health` | public |

Every state-changing call accepts a `txHash`, **re-reads the receipt on-chain**, checks the
log belongs to the expected contract and event, and only then mutates. The chain is the
source of truth; Postgres is a read model. A forged `txHash` cannot move state.

## 9. Trust boundaries

| Boundary | Trusted? | Mitigation |
|---|---|---|
| Buyer's delivery confirmation | **yes** — it is the delivery oracle | Documented; not "trustless" |
| Arbiter key | **yes**, refund-only | Asymmetry caps damage; key in 600 env file |
| RPC provider | **partly** — could lie about logs | Two providers; verify against a second before terminal states |
| Chain reorgs | no | Wait 3 confirmations before marking terminal |
| Database | no | Rebuildable from events |
| S3 | no | Pre-signed URLs, no public buckets |

## 10. Deployment topology

```
/srv/web3proj/
├── api/            NestJS source + dist
├── web/            Vite source; dist/ served by nginx
├── contracts/      Foundry project
├── deploy/         nginx conf, systemd units, env templates
└── .env            mode 600, never in git

systemd:  web3proj-api.service      → node dist/main.js  :8310
          web3proj-indexer.service  → node dist/indexer.js
nginx:    /etc/nginx/sites-available/web3.heurist.online
DB:       web3proj (role web3app, no DDL rights at runtime)
```

Ports: API **8310** (must confirm free), Postgres 5432 localhost only, `seoads` keeps
`:3000`/`:8080`. Nothing may touch `seoads`.

## 11. Open architectural questions

| ID | Question | Why it matters |
|---|---|---|
| A-1 | **Buyer-ghosting deadlock** — what releases funds if the buyer never confirms? | Seller funds locked forever. Options: (a) timeout auto-release to seller after N days, buyer can dispute before it; (b) arbiter gains release power after timeout (weakens invariant 3); (c) do nothing. **Recommend (a).** |
| A-2 | Who pays gas at each step? | Buyer pays fund + confirm; seller pays ship. Affects UI guidance. |
| A-3 | Where does vehicle media live before S3 exists? | No bucket, no IAM role yet (G-21). |
| A-4 | Does USDC on Sepolia support EIP-2612 `permit`? | If yes, one-tx fund instead of approve + fund. Unverified. |
| A-5 | Operator authentication model | Wallet-based role vs separate credentials. |

## 12. Non-goals

No KYC, fiat, fractional tokens, multi-chain, dispute evidence upload, DMV/lien integration,
auctions, email, mobile app, mainnet, upgradeable contracts, or indexing service.

## 13. Known risks

| Risk | Impact | Mitigation |
|---|---|---|
| 1.1 GB free RAM shared with `seoads` | OOM kills a **live** app | Cap Node heap ~400 MB; measure before/after |
| 11 GB free disk | Build space exhausted | Prune npm cache; build in `/tmp` with cleanup |
| Arbiter key on disk | Mass refunds if leaked | 600 perms, never logged, rotate plan |
| No contract audit | Unsafe on mainnet | Testnet only |
| Buyer-ghosting | Stuck funds | A-1 must be decided before Phase 1 freezes the interface |
