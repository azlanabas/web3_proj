---
title: 05 — Deploy runbook
project: web3_proj
status: NOT EXECUTABLE
updated: 2026-11-17
---

# 05 — Deploy runbook

> 🔴 **DO NOT RUN.** Every step below depends on the AWS instance identity, which cannot be
> read while the AWS session is expired (G-01, G-02). Values shown as `<ANGLE_BRACKETS>` are
> **placeholders, not measurements**. Written in advance so Phase 5 is mechanical rather
> than improvised.

Target: `https://web3.heurist.online` on AWS `ap-southeast-1`, account `<AWS_ACCOUNT_ID>`.
kerry takes no part (D-06).

---

## Phase 0 — Prerequisites (owner)

| # | Action | Verify |
|---|---|---|
| 0.1 | `aws login` (prefer an IAM user, not the `:root` session) | `aws sts get-caller-identity` returns an ARN |
| 0.2 | Supply the EC2 instance ID | `aws ec2 describe-instances --query 'Reservations[].Instances[].InstanceId'` |
| 0.3 | Confirm which key pairs with it | the local EC2 key (`.pem`) is the only one on file |

**Gate:** do not proceed until 0.1 and 0.2 pass.

## Phase 1 — Read the instance (read-only)

```bash
aws ec2 describe-instances \
  --instance-ids <INSTANCE_ID> \
  --query 'Reservations[].Instances[].[InstanceId,InstanceType,State.Name,PublicIpAddress,PlatformDetails]' \
  --output table
```

Record: instance type, state, public IP, AMI/OS. If there is **no Elastic IP**, allocate one
— a dynamic public IP would break DNS on every stop/start.

```bash
# only if no EIP is attached
aws ec2 allocate-address --domain vpc
aws ec2 associate-address --instance-id <INSTANCE_ID> --allocation-id <ALLOC_ID>
```

**Output of this phase = the IP that goes in the DNS record.**

## Phase 2 — Host preparation

```bash
ssh -i <PATH_TO_EC2_KEY>.pem <USER>@<ELASTIC_IP>
```

On the host:

```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin nginx certbot python3-certbot-nginx git
sudo systemctl enable --now docker nginx
docker compose version        # must be >= 2
```

Check capacity before building — t4g.small is 2 GB RAM, which is tight for Node build +
Postgres + Nginx:

```bash
free -m; df -h /
```

## Phase 3 — Application layout

```bash
sudo mkdir -p /srv/web3 && sudo chown "$USER" /srv/web3
cd /srv/web3
git clone git@github.com:azlanabas/web3_proj.git .   # repo does not exist yet (G-11)
```

Expected tree:

```
/srv/web3/
├── docker-compose.yml
├── .env                 # never committed
├── api/                 # NestJS
├── web/                 # Vite/React, built to static files
└── contracts/           # Foundry project
```

`.env` keys are listed in `02-architecture.md`. Values are supplied by the owner; they are
never echoed to a terminal, chat, or commit.

## Phase 4 — Compose

```yaml
# /srv/web3/docker-compose.yml  (skeleton — finalised at build time)
services:
  db:
    image: postgres:<PINNED>
    environment:
      POSTGRES_DB: web3proj
      POSTGRES_USER: web3app
    volumes: [ "pgdata:/var/lib/postgresql/data" ]
    ports: [ "127.0.0.1:5432:5432" ]     # localhost only
  api:
    build: ./api
    env_file: .env
    ports: [ "127.0.0.1:8310:8310" ]     # localhost only
    depends_on: [ db ]
  web:
    build: ./web                         # produces static assets
volumes:
  pgdata:
```

```bash
docker compose up -d --build
docker compose ps
curl -s localhost:8310/api/health
```

## Phase 5 — Nginx vhost

`/etc/nginx/sites-available/web3.heurist.online`:

```nginx
server {
    listen 80;
    server_name web3.heurist.online;

    root /srv/web3/web/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8310;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/web3.heurist.online /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## Phase 6 — DNS (owner, GoDaddy)

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `web3` | `<ELASTIC_IP>` | 600 |

Verify **before** requesting a certificate — certbot will fail if the name does not resolve
to this host:

```bash
dig +short web3.heurist.online @1.1.1.1
```

## Phase 7 — TLS

```bash
sudo certbot --nginx -d web3.heurist.online --redirect
sudo certbot renew --dry-run
```

## Phase 8 — Verification (do not skip)

```bash
curl -sI https://web3.heurist.online | head -1          # expect 200
curl -s  https://web3.heurist.online/api/health         # expect {"status":"ok"}
curl -sI http://web3.heurist.online | head -1           # expect 301
echo | openssl s_client -connect web3.heurist.online:443 -servername web3.heurist.online 2>/dev/null | grep -i "protocol\|verify"
```

Then the end-to-end escrow run on testnet, with tx hashes recorded in the project log.

## Phase 9 — Rollback

| Situation | Action |
|---|---|
| Bad app deploy | `cd /srv/web3 && git checkout <last-good-tag> && docker compose up -d --build` |
| Nginx misconfigured | `sudo rm /etc/nginx/sites-enabled/web3.heurist.online && sudo nginx -t && sudo systemctl reload nginx` |
| Cert failure | leave vhost on :80, diagnose DNS first; **never** disable TLS to "fix" it |
| Everything wrong | stop containers (`docker compose down`), keep the volume, DNS can stay |

Never `docker compose down -v` — that destroys the database volume.

## Known risks in this runbook

1. **t4g.small RAM.** A Node build plus Postgres plus Nginx on 2 GB may OOM. Mitigation:
   build images elsewhere or add swap — decide after measuring.
2. **Elastic IP.** If the instance has only a dynamic IP, DNS will break on restart.
3. **Alchemy key on file** (local credential file, 26 bytes) — confirm it
   is still valid and which network it targets before wiring `RPC_URL`.
4. **No repo exists.** Phase 3 cannot run until D-13 is confirmed and the repo is created.
