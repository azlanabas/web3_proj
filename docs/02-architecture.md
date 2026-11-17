---
title: 02 — Architecture
project: web3_proj
status: draft
updated: 2026-11-17
---

# 02 — Architecture

*Written 2026-11-17 GMT+8. No component below is built. AWS values are UNVERIFIED.*

## Stack — GDA Stack C, per D-03

The brief lists *TypeScript, Node.js, React, PostgreSQL, REST APIs, Docker, AWS, Git,
Solidity, Ethereum*. That maps onto the workspace's documented **Stack C**:

| Layer | Choice | Version |
|---|---|---|
| Frontend | Vite + React + Tailwind CSS | ⚠️ pin at scaffold — do not invent |
| Backend | NestJS (Node/TypeScript), REST | ⚠️ pin at scaffold |
| Database | PostgreSQL | ⚠️ pin at scaffold (local dev had 18.6; AWS unknown) |
| ORM | ⚠️ OPEN — Prisma vs TypeORM | see D-10 |
| Contracts | Solidity + Foundry | ⚠️ pin at scaffold |
| Chain client | viem | ⚠️ pin at scaffold |
| Process control | Docker Compose on EC2 | Docker Compose |
| Storage | AWS S3 | — |
| Reverse proxy / TLS | Nginx + certbot on the EC2 host | — |

**Version rule:** every `⚠️` above must be resolved by reading the installed version, never
by guessing. Pillar II of the `prd` skill requires exact pins.

## Component diagram

```
                    web3.heurist.online
                            │  443/TLS (certbot)
                    ┌───────▼────────┐
                    │  Nginx (EC2)   │
                    └───┬────────┬───┘
              /api/*    │        │   /*
                ┌───────▼──┐  ┌──▼─────────┐
                │ NestJS   │  │ Vite build │
                │ :8310    │  │ static     │
                └──┬────┬──┘  └────────────┘
                   │    │
        ┌──────────▼┐  ┌▼──────────────┐
        │ Postgres  │  │ S3 (images)   │
        │ :5432     │  └───────────────┘
        └──────▲────┘
               │ writes events
        ┌──────┴─────────┐      ┌──────────────────┐
        │ Indexer worker │◄─────┤ Ethereum RPC     │
        │ (same image)   │      │ (Sepolia/Alchemy)│
        └────────────────┘      └────────┬─────────┘
                                         │
                                ┌────────▼─────────┐
                                │ VehicleEscrow    │
                                │ (Solidity)       │
                                └──────────────────┘
```

## Ports (on the EC2 host)

| Service | Port | Exposure |
|---|---|---|
| Nginx | 80, 443 | public |
| NestJS API | 8310 | localhost only |
| Postgres | 5432 | localhost only — **never public** |
| Frontend | static files, no port | served by Nginx |

Exact host ports must be re-checked on the EC2 instance; the values above are the plan, not
a measurement (the instance could not be read).

## Database schema (draft)

```
users          id uuid pk · wallet_address text unique · role text · created_at
listings       id uuid pk · seller_id fk · title · make · model · year int
               vin text · mileage int · price_usdc numeric(20,6) · description
               status text · created_at · updated_at · deleted_at
listing_images id uuid pk · listing_id fk · s3_key text · position int
escrows        id uuid pk · listing_id fk · buyer_id fk · seller_id fk
               chain_id int · contract_address text · onchain_escrow_id text
               amount_usdc numeric(20,6) · status text
               fund_tx text · release_tx text · refund_tx text
               created_at · updated_at
chain_events   id bigserial pk · tx_hash text · log_index int · block_number bigint
               event_name text · payload jsonb · processed_at
               UNIQUE (tx_hash, log_index)
```

Rules: soft delete via `deleted_at` (Pillar X.12); money is `numeric`, never float;
`chain_events` unique constraint makes the indexer idempotent.

## REST surface (MVP)

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

State-changing calls accept a tx hash and verify it on-chain before mutating the DB. The
chain is the source of truth; the database is a read model.

## Contract interface — `VehicleEscrow.sol`

```solidity
createEscrow(bytes32 listingId, address seller, uint256 amount, address arbiter)
fund(uint256 escrowId)                      // buyer deposits USDC
markShipped(uint256 escrowId)               // seller
confirmDelivery(uint256 escrowId)           // buyer → releases to seller
refund(uint256 escrowId)                    // arbiter only → returns to buyer
cancel(uint256 escrowId)                    // before funding

event EscrowCreated(uint256 id, address buyer, address seller, uint256 amount)
event Funded(uint256 id, uint256 amount)
event Released(uint256 id)
event Refunded(uint256 id)
```

Invariants to test: funds can only move to the recorded buyer or seller; a released escrow
cannot be refunded; only the arbiter may refund; reentrancy guarded.

## Indexer

Polls `eth_getLogs` for the contract address from a stored checkpoint, writes to
`chain_events`, then reconciles `escrows.status`. Idempotent by `(tx_hash, log_index)`,
so duplicate processing is harmless. No websockets — polling survives restarts.

## Environment variables (names only — never values)

```
DATABASE_URL · RPC_URL · CHAIN_ID · CONTRACT_ADDRESS · ARBITER_PRIVATE_KEY
SIWE_DOMAIN · SIWE_ORIGIN · SESSION_SECRET · AWS_REGION · S3_BUCKET
AWS_ACCESS_KEY_ID · AWS_SECRET_ACCESS_KEY · NODE_ENV · PORT
```

`ARBITER_PRIVATE_KEY` is the highest-value secret in the system. It must never enter git,
the frontend bundle, or logs.

## AWS topology (UNVERIFIED)

| Item | Value |
|---|---|
| Account | `<AWS_ACCOUNT_ID>` |
| Region | `ap-southeast-1` |
| Compute | ⚠️ existing EC2, instance ID unknown |
| Public IP | ⚠️ unknown — determines the DNS A record |
| Storage | S3 bucket, name TBD |
| Database | Postgres in Docker on the EC2 host (RDS deferred past MVP) |

kerry is **not** in this architecture (D-06).

## Security baseline

TLS 1.3 via certbot · Postgres bound to localhost · no raw SQL string interpolation ·
siwe nonce single-use with expiry · rate limit auth endpoints · S3 objects via pre-signed
URLs · secrets only in `.env` on the host, never committed.
