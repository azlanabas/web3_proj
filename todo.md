# todo.md — build checklist

**Project:** `web3_proj` · **Updated:** 2026-11-17 GMT+8
**Plan:** [`plan.md`](plan.md) · **Status:** Phase 0 — everything blocked until AWS auth

Legend: `🔴 owner action` · `⚠️ decision needed` · `[ ]` not started · `[x]` done

---

## Phase 0 — Unblock

### Access and infrastructure
- [x] 🔴 Run `aws login` — done 2026-11-17
- [ ] 🔴 Prefer switching from the `:root` session to a scoped IAM user
- [x] Verify session: `aws sts get-caller-identity` succeeds (root session)
- [x] EC2 instance identified — t4g.small, arm64, Ubuntu 24.04.4, reused
- [ ] Read instance: type, state, AMI, public IP
- [x] Elastic IP confirmed attached — stable for DNS
- [ ] Record host capacity: `free -m`, `df -h /` — t4g.small is 2 GB, tight
- [ ] Confirm SSH: user, key path, security group allows :22 from your IP

### DNS and TLS prerequisites
- [ ] 🔴 Add GoDaddy A record: `web3` → Elastic IP, TTL 600
- [ ] Verify propagation: `dig +short web3.heurist.online @1.1.1.1`
- [ ] Note: `heurist.online` apex has no A record (pre-existing, not ours)

### Repository
- [x] Create GitHub repo `azlanabas/web3_proj` (public)
- [x] `.gitignore` covering `node_modules`, `.env`, `*.pem`, `dist`, `target`, `pgdata`
- [ ] 🔴 Confirm whether app source lives in this repo or only on the server (D-08 sub-point)

### Decisions still open
- [x] D-09 settlement asset — USDC locked
- [x] D-10 ORM — Prisma locked
- [x] D-11 chain — Ethereum Sepolia locked
- [ ] ⚠️ D-12 arbiter key custody — who holds, where stored, rotation
- [ ] ⚠️ D-14 jurisdiction — required before mainnet, not before testnet
- [ ] Update `docs/03-decisions.md` D-13 (repo now exists) and `docs/04-gap-register.md` G-11

**Gate:** session valid · instance ID known · `dig` returns the Elastic IP.

---

## Phase 1 — Smart contract

### Setup
- [ ] `forge init contracts` in the app repo
- [ ] Pin Solidity + Foundry versions in `foundry.toml`
- [ ] Add OpenZeppelin `ReentrancyGuard`, `SafeERC20`, `Ownable`
- [ ] Obtain test USDC on Sepolia; record token address

### Contract
- [ ] Define `Escrow` struct: buyer, seller, arbiter, amount, state
- [ ] `createEscrow(listingId, seller, amount, arbiter)`
- [ ] `fund(escrowId)` — `safeTransferFrom` buyer → contract
- [ ] `markShipped(escrowId)` — seller only
- [ ] `confirmDelivery(escrowId)` — buyer only → pay seller
- [ ] `refund(escrowId)` — **arbiter only**, pays buyer
- [ ] `cancel(escrowId)` — before funding, either party
- [ ] Events: `EscrowCreated`, `Funded`, `Shipped`, `Released`, `Refunded`, `Cancelled`
- [ ] State guards: no transition out of terminal states; no double release

### Tests (each one must exist)
- [ ] Happy path: create → fund → ship → confirm → seller paid
- [ ] Refund by arbiter returns funds to buyer
- [ ] Non-arbiter cannot refund
- [ ] Released escrow cannot be refunded
- [ ] Arbiter cannot release to seller
- [ ] Double-fund reverts
- [ ] Reentrancy attempt on release is rejected
- [ ] Cancel only before funding
- [ ] `forge test --gas-report` reviewed

### Deploy
- [ ] Deploy script with arbiter address as a parameter
- [ ] Deploy to Sepolia; record address + tx hash
- [ ] Verify contract on Etherscan Sepolia
- [ ] Commit deployment record (no private keys)

**Gate:** tests green · contract verified on Sepolia.

---

## Phase 2 — Backend (NestJS)

### Foundation
- [ ] Scaffold NestJS app in `api/`
- [ ] Pin Node, NestJS, TypeScript, ORM versions in `package.json`
- [ ] systemd unit for the API (no Docker — D-15); Postgres 16 already on the host
- [ ] Config module validating env vars at boot (fail fast, no defaults for secrets)
- [ ] `.env.example` with names only, no values
- [ ] Health endpoint `GET /api/health`

### Database
- [ ] Migration: `users` (wallet, role)
- [ ] Migration: `listings` (vehicle fields, `price_usdc numeric(20,6)`, `deleted_at`)
- [ ] Migration: `listing_images`
- [ ] Migration: `escrows` (chain_id, contract_address, onchain_escrow_id, tx hashes)
- [ ] Migration: `chain_events` with `UNIQUE (tx_hash, log_index)`
- [ ] Indexes on `listings.status`, `escrows.status`, `escrows.buyer_id`
- [ ] Least-privilege DB role (no DDL) for the app at runtime
- [ ] Seed script for local development

### Auth
- [ ] SIWE nonce issuance (`POST /api/auth/siwe/nonce`), single-use, 5 min expiry
- [ ] SIWE verification (`POST /api/auth/siwe/verify`), session cookie HttpOnly+Secure+SameSite
- [ ] Role guard: seller / buyer / arbiter / operator
- [ ] Rate limit auth endpoints

### Listings
- [ ] `GET /api/listings` — paginated, filter by make/year/price
- [ ] `GET /api/listings/:id`
- [ ] `POST /api/listings` — seller only, draft state
- [ ] `PATCH /api/listings/:id` — owner only
- [ ] S3 pre-signed upload for images; store keys, not blobs

### Escrow
- [ ] `POST /api/escrows` — creates DB row + returns contract call args
- [ ] `POST /api/escrows/:id/ship` — seller, verifies tx on-chain
- [ ] `POST /api/escrows/:id/confirm` — buyer, verifies tx on-chain
- [ ] `POST /api/escrows/:id/refund` — arbiter, verifies tx on-chain
- [ ] Reject state changes when chain disagrees with DB

### Indexer
- [ ] Poll `eth_getLogs` from stored checkpoint
- [ ] Write `chain_events` idempotently
- [ ] Reconcile `escrows.status` from events
- [ ] Handle reorgs by block confirmation depth
- [ ] Survives restart without duplicate processing

### Quality
- [ ] Unit tests for services; e2e test for the escrow loop
- [ ] Structured logs with no PII and no secrets
- [ ] Global exception filter returning JSON

**Gate:** full loop via REST on Sepolia · DB correct after restart.

---

## Phase 3 — Frontend (Vite/React)

- [ ] Scaffold Vite + React + TypeScript + Tailwind
- [ ] Design tokens in Tailwind config (colour, spacing, type scale)
- [ ] Wallet connect (injected + WalletConnect optional)
- [ ] SIWE sign-in flow wired to the API
- [ ] Listing grid: cards, pagination, filters
- [ ] Listing detail: gallery, VIN, mileage, price, seller
- [ ] Create-listing form with Zod validation
- [ ] Escrow flow UI: create → fund → ship → confirm, with tx status
- [ ] Wrong-network guard and switch prompt
- [ ] Loading skeletons; error boundary; API timeout fallback at 3 s
- [ ] Mobile-first breakpoints (320/480/768+)
- [ ] Empty, error and pending states for every async view

**Gate:** a human completes the loop in a browser.

---

## Phase 4 — Admin

- [ ] Operator login (role-gated)
- [ ] Table of all escrows: state, amount, parties, tx links
- [ ] Detail view with full chain event history
- [ ] Refund action with explicit confirmation
- [ ] Read-only audit log (who did what, when)

**Gate:** refund issued from UI, confirmed on-chain.

---

## Phase 5 — Deploy

- [ ] Provision/prepare EC2: Node 24, Nginx, certbot, git (no Docker — D-15)
- [ ] Create S3 bucket + **IAM instance profile** (no instance role exists yet — G-21)
- [ ] Clone repo to the deploy path; write `.env` on the host (never committed)
- [ ] `npm ci && npm run build`, then `systemctl restart web3proj-api`
- [ ] Nginx vhost for `web3.heurist.online`, proxy `/api/` → `:8310`
- [ ] `nginx -t` then reload
- [ ] `certbot --nginx -d web3.heurist.online --redirect`
- [ ] `certbot renew --dry-run`
- [ ] Postgres bound to localhost only (verify with `ss -tlnp`)
- [ ] Nightly `pg_dump` cron with 7-day rotation
- [ ] Log rotation configured

**Gate:** runbook Phase 8 checks all pass.

---

## Phase 6 — Verification and handover

- [ ] `curl -sI https://web3.heurist.online` → 200
- [ ] `curl -s https://web3.heurist.online/api/health` → `{"status":"ok"}`
- [ ] HTTP → HTTPS redirect verified (301)
- [ ] TLS protocol verified with `openssl s_client`
- [ ] End-to-end testnet run executed and tx hashes recorded
- [ ] README updated with the live URL and the recorded run
- [ ] Rollback procedure dry-run
- [ ] Every open decision in `docs/03-decisions.md` resolved or explicitly deferred

---

## Backlog — deliberately deferred

Not part of the MVP. Listed so they are not rediscovered as "missing".

- [ ] KYC / AML provider integration
- [ ] Fiat on/off-ramp
- [ ] Fractional / RWA tokenisation
- [ ] Multi-chain support
- [ ] Dispute evidence upload and messaging
- [ ] DMV / lien / title registry integration
- [ ] Auctions and bidding
- [ ] Email and push notifications
- [ ] Mobile application
- [ ] Mainnet deployment + independent contract audit
- [ ] Terms of service, arbitration clause, refund policy
- [ ] Fee model
