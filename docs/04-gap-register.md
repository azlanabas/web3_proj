---
title: 04 — Gap register
project: web3_proj
status: living
updated: 2026-11-17
---

# 04 — Gap register

Every unknown, split by what it actually blocks. A gap is only closed when it is **measured
or decided**, not when someone assumes an answer.

- **BLOCKS BUILD** — no code can be written correctly until this is answered.
- **BLOCKS DEPLOY** — code can be written, but cannot go live.
- **BLOCKS LAUNCH** — live on a testnet is possible; public/mainnet release is not.

---

## BLOCKS BUILD

| ID | Gap | Why it blocks | Owner action |
|---|---|---|---|
| G-01 | **AWS session expired** | Cannot read or create any AWS resource | Run `aws login`; prefer an IAM user over the `:root` session currently stored |
| G-02 | **EC2 instance identity unknown** | Path, OS, ports, and whether an Elastic IP exists are all unknown | After G-01, provide instance ID (`aws ec2 describe-instances`) |
| G-03 | Chain choice (D-11) | Contract, RPC config, USDC address all depend on it | Decide Sepolia vs other |
| G-04 | Arbiter key custody (D-12) | Determines deploy secret handling | Decide holder + storage |
| G-05 | ORM choice (D-10) | Schema and migration tooling differ | Decide |

## BLOCKS DEPLOY

| ID | Gap | Why it blocks | Owner action |
|---|---|---|---|
| G-06 | **Public IP of the EC2 host** | The DNS A record target is unknown; needs G-01/G-02 | Provide after G-02 |
| G-07 | **DNS A record absent** | `web3.heurist.online` does not resolve; no wildcard exists | Add in GoDaddy: `A web3 → <elastic ip>` |
| G-08 | GoDaddy API unusable | the stored GoDaddy credential is 59 bytes, no `:`, API returns **401** | Either fix the key:secret or add the record by hand |
| G-09 | Deploy path on EC2 | `/srv/<app>` vs `/opt/<app>` unverified | Confirmed once G-02 answered |
| G-10 | S3 bucket + IAM principal | Media upload has no destination | Create bucket + least-privilege key |
| G-11 | Git remote (D-13) | No repo exists; EC2 deploy pulls from somewhere | Confirm `azlanabas` and create repo |
| G-12 | Domain ownership of TLS | certbot needs :80 reachable and DNS resolved first | Sequence: G-07 → certbot |

## BLOCKS LAUNCH (public / mainnet)

| ID | Gap | Notes |
|---|---|---|
| G-13 | Jurisdiction (D-14) | Determines escrow legality and title mechanics |
| G-14 | Fee model | Who pays the platform, and in what |
| G-15 | Terms of service + arbitration clause | The escrow only works if the arbiter's authority is contractual |
| G-16 | Refund and cancellation policy | Contract enforces code; policy must match |
| G-17 | KYC threshold analysis | Even non-custodial venues face AML expectations in some jurisdictions |
| G-18 | Title / lien verification process | Entirely off-chain; currently no process at all |
| G-19 | Insurance / liability | Who is liable if a vehicle is stolen or a title is forged |
| G-20 | Mainnet contract audit | No audit budget or firm identified |

---

## Resolved

| ID | Gap | Resolution | Date |
|---|---|---|---|
| — | Stack ambiguity (Rust vs TypeScript) | D-03, owner chose TypeScript/Node/React | 2026-11-17 |
| — | Hosting ambiguity (kerry vs AWS) | D-05/D-06, owner chose AWS only | 2026-11-17 |
| — | Whether `heurist.online` is on GoDaddy | Verified via live NS lookup | 2026-11-17 |
| — | Whether a wildcard DNS record exists | Verified: none | 2026-11-17 |

## Standing caveat

Items marked with a live measurement carry the timestamp of that measurement. Everything
else is an assumption and says so. **Re-measure before acting.**
