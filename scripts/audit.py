#!/usr/bin/env python3
"""Deep audit: ~350 assertions across structure, API, schema, contract, security, ops."""
import json, os, re, subprocess, sys, pathlib, time

WEB = pathlib.Path("/srv/web3proj/web")
API = pathlib.Path("/srv/web3proj/api")
BASE = "https://web3.heurist.online"
TMP = pathlib.Path("/tmp/audit"); TMP.mkdir(parents=True, exist_ok=True)
CAST = "/home/ubuntu/.foundry/bin/cast"
results = []
cat_stats = {}

def rec(cat, cid, name, ok, detail=""):
    results.append((cat, cid, name, bool(ok), str(detail)[:140]))
    s = cat_stats.setdefault(cat, [0, 0])
    s[1] += 1
    if ok: s[0] += 1

def sh(cmd, cwd=None, timeout=180):
    try:
        return subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        class R: returncode=124; stdout=""; stderr="timeout"
        return R()

def http(path, method="GET", body=None, cookie=None):
    out = TMP / "body"
    cmd = ["curl", "-s", "-o", str(out), "-w", "%{http_code}", "-m", "25", "-X", method, BASE + path]
    if body is not None:
        cmd += ["-H", "Content-Type: application/json", "-d", json.dumps(body)]
    if cookie: cmd += ["-b", cookie]
    code = sh(cmd).stdout.strip()
    try: data = out.read_text()
    except Exception: data = ""
    return code, data

env = {}
for line in (API / ".env").read_text().splitlines():
    if "=" in line and not line.startswith("#"):
        k, v = line.split("=", 1); env[k] = v
RPC = env.get("RPC_URL", "http://127.0.0.1:8545")
ESCROW = env["CONTRACT_ADDRESS"]; TOKEN = env["TOKEN_ADDRESS"]

def cast(*args, timeout=60):
    return sh([CAST, *args, "--rpc-url", RPC], timeout=timeout).stdout.strip()

def psql(sql):
    return sh(["psql", env["DATABASE_URL"], "-tAc", sql]).stdout.strip()

# ============================ A. STRUCTURE (24 sections) ============================
nav = (WEB / "src/nav.ts").read_text()
blocks = re.findall(r'\{\s*id:\s*"([a-z]+)",\s*group:\s*"([^"]+)",\s*label:\s*"([^"]+)",\s*blurb:\s*"([^"]+)"', nav)
groups = re.findall(r'export const GROUPS = \[(.*?)\]', nav, re.S)[0]
group_list = re.findall(r'"([^"]+)"', groups)
handoffs = set(re.findall(r'^  ([a-z]+): "', nav, re.M))
app = (WEB / "src/App.tsx").read_text()
routes = set(re.findall(r'route === "([a-z]+)"', app))
page_files = {p.stem.lower(): p for p in (WEB / "src/pages").glob("*.tsx")}

rec("STRUCT", "A0", "section count >= 24", len(blocks) >= 24, len(blocks))
for sid, grp, label, blurb in blocks:
    rec("STRUCT", f"A-{sid}-id", f"{sid}: id is slug", re.fullmatch(r"[a-z]+", sid) is not None)
    rec("STRUCT", f"A-{sid}-label", f"{sid}: has label", len(label) > 3, label)
    rec("STRUCT", f"A-{sid}-blurb", f"{sid}: has blurb", len(blurb) > 10, blurb)
    rec("STRUCT", f"A-{sid}-group", f"{sid}: group known", grp in group_list, grp)
    is_static = sid == "blueprint"
    rec("STRUCT", f"A-{sid}-route", f"{sid}: routed or static", sid in routes or is_static)
    rec("STRUCT", f"A-{sid}-handoff", f"{sid}: has handoff", sid in handoffs or is_static)

for name, path in page_files.items():
    if name == "login": continue
    txt = path.read_text()
    rec("STRUCT", f"A-file-{name}", f"page {name} imports kickerFor", "kickerFor(" in txt)

# ============================ B. API SURFACE ============================
code, body = http("/api/meta")
meta = json.loads(body) if code == "200" else {}
eps = meta.get("endpoints", [])
rec("API", "B0", "meta returns endpoints", len(eps) >= 20, len(eps))

ALLOWED_AUTH = {"public", "session", "seller", "buyer", "owner", "arbiter", "any"}
for i, e in enumerate(eps):
    p = e.get("path", ""); m = e.get("method", ""); a = e.get("auth", ""); purpose = e.get("purpose", "")
    rec("API", f"B{i}-path", f"{p}: path shape", p.startswith("/api/"), p)
    rec("API", f"B{i}-method", f"{p}: method valid", m in {"GET", "POST", "PATCH", "DELETE"}, m)
    rec("API", f"B{i}-auth", f"{p}: auth known", a in ALLOWED_AUTH, a)
    rec("API", f"B{i}-purpose", f"{p}: documented", len(purpose) > 10, purpose)

# live GET checks (5xx is a failure; 401/404 acceptable depending on route)
for i, e in enumerate([x for x in eps if x.get("method") == "GET"]):
    path = e["path"]
    probe = path
    if ":id" in path:
        probe = path.replace(":id", "00000000-0000-0000-0000-000000000000")
    code, _ = http(probe)
    rec("API", f"BGET{i}", f"GET {probe} not 5xx", code and code[0] in "24", code)

# ============================ C. DATABASE SCHEMA ============================
tables = ["User", "Listing", "ListingImage", "Escrow", "ChainEvent", "SiweNonce"]
for t in tables:
    got = psql(f"SELECT to_regclass('public.\"{t}\"') IS NOT NULL")
    rec("DB", f"C-{t}", f"table {t} exists", got == "t", got)

cols = [
    ("User", "walletAddress"), ("User", "role"), ("Listing", "priceUsdc"), ("Listing", "deletedAt"),
    ("Escrow", "onchainId"), ("Escrow", "status"), ("Escrow", "fundTx"), ("Escrow", "shippedAt"),
    ("ChainEvent", "txHash"), ("ChainEvent", "logIndex"), ("SiweNonce", "nonce"), ("SiweNonce", "expiresAt"),
]
for t, c in cols:
    got = psql(f"SELECT count(*) FROM information_schema.columns WHERE table_name='{t}' AND column_name='{c}'")
    rec("DB", f"C-{t}-{c}", f"{t}.{c} exists", got == "1", got)

typ = psql("SELECT data_type||':'||numeric_precision||':'||numeric_scale FROM information_schema.columns WHERE table_name='Listing' AND column_name='priceUsdc'")
rec("DB", "C-money-type", "priceUsdc is numeric(20,6)", typ == "numeric:20:6", typ)

uniq = psql("SELECT count(*) FROM pg_indexes WHERE tablename='ChainEvent' AND indexdef ILIKE '%unique%'")
rec("DB", "C-event-unique", "ChainEvent unique index", int(uniq or 0) >= 1, uniq)

migs = psql("SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL")
rec("DB", "C-migrations", "migrations applied", int(migs or 0) >= 2, migs)

for e in ["Role", "ListingStatus", "EscrowStatus"]:
    got = psql(f"SELECT count(*) FROM pg_type WHERE typname='{e}'")
    rec("DB", f"C-enum-{e}", f"enum {e} exists", got == "1", got)

for idx_col in ["status", "buyer"]:
    got = psql(f"SELECT count(*) FROM pg_indexes WHERE tablename='Escrow' AND indexdef ILIKE '%{idx_col}%'")
    rec("DB", f"C-idx-{idx_col}", f"Escrow index on {idx_col}", int(got or 0) >= 1, got)

# ============================ D. CONTRACT ============================
funcs = [
    ("nextEscrowId()(uint256)", True), ("RELEASE_TIMEOUT()(uint64)", True),
    ("usdc()(address)", True), ("arbiter()(address)", True),
    ("getEscrow(uint256)(address,address,uint256,uint64,uint64,uint8)", True),
]
for sig, _ in funcs:
    arg = "1" if "uint256)" in sig and sig.startswith("getEscrow") else None
    out = cast("call", ESCROW, sig, *([arg] if arg else []))
    rec("CONTRACT", f"D-{sig[:18]}", f"contract read {sig[:28]}", len(out) > 0, out[:60])

rec("CONTRACT", "D-timeout", "RELEASE_TIMEOUT is 14 days",
    cast("call", ESCROW, "RELEASE_TIMEOUT()(uint64)").split()[0] == "1209600")
rec("CONTRACT", "D-arbiter", "arbiter is non-zero",
    cast("call", ESCROW, "arbiter()(address)") != "0x0000000000000000000000000000000000000000")
rec("CONTRACT", "D-usdc", "usdc is the configured token",
    cast("call", ESCROW, "usdc()(address)").lower() == TOKEN.lower())
rec("CONTRACT", "D-decimals", "token has 6 decimals",
    cast("call", TOKEN, "decimals()(uint8)").split()[0] == "6")

events = ["EscrowCreated(uint256,bytes32,address,address,uint256)", "Funded(uint256)",
          "Shipped(uint256,uint64)", "Disputed(uint256,uint64)", "Released(uint256,address,uint256)",
          "Refunded(uint256,address,uint256)", "Cancelled(uint256,address)"]
for e in events:
    topic = sh([CAST, "keccak", e]).stdout.strip()
    rec("CONTRACT", f"D-ev-{e[:14]}", f"topic0 for {e[:24]}", topic.startswith("0x") and len(topic) == 66, topic[:18])

# ============================ E. SECURITY / TRANSPORT ============================
r = sh(["curl", "-s", "-D", "-", "-o", "/dev/null", "-m", "20", BASE + "/api/health"])
h = r.stdout.lower()
for hdr in ["x-content-type-options", "x-frame-options", "content-security-policy",
            "referrer-policy", "strict-transport-security", "x-dns-prefetch-control"]:
    rec("SEC", f"E-{hdr}", f"header {hdr}", hdr in h)

r = sh(["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "-m", "20", "http://web3.heurist.online/"])
rec("SEC", "E-redirect", "HTTP -> HTTPS 301", r.stdout.strip() == "301", r.stdout.strip())

r = sh(["bash", "-lc", "echo | openssl s_client -connect web3.heurist.online:443 -servername web3.heurist.online 2>/dev/null | openssl x509 -noout -checkend 2592000"])
rec("SEC", "E-cert-valid", "cert valid > 30 days", "will not expire" in r.stdout, r.stdout.strip()[:60])

for path, method in [("/api/escrows", "GET"), ("/api/auth/me", "GET"), ("/api/listings", "POST")]:
    code, _ = http(path, method, {} if method == "POST" else None)
    rec("SEC", f"E-auth-{path}", f"{method} {path} requires session", code == "401", code)

# rate limit: burst past the auth limit
codes = []
for _ in range(12):
    c, _ = http("/api/auth/siwe/nonce", "POST")
    codes.append(c)
rec("SEC", "E-ratelimit", "auth rate limit returns 429", "429" in codes, ",".join(sorted(set(codes))))

# ============================ F. OPERATIONS ============================
for svc in ["web3proj-api", "anvil", "nginx"]:
    st = sh(["systemctl", "is-active", svc]).stdout.strip()
    rec("OPS", f"F-{svc}", f"service {svc} active", st == "active", st)

bks = sorted(pathlib.Path("/srv/web3proj/backups").glob("*.dump"))
rec("OPS", "F-backup-exists", "backup exists", len(bks) > 0, len(bks))
if bks:
    age_h = (time.time() - bks[-1].stat().st_mtime) / 3600
    rec("OPS", "F-backup-fresh", "backup < 26h old", age_h < 26, f"{age_h:.1f}h")
rec("OPS", "F-cron", "backup cron installed", pathlib.Path("/etc/cron.d/web3proj-backup").exists())
rec("OPS", "F-journald", "journald cap installed",
    pathlib.Path("/etc/systemd/journald.conf.d/99-web3proj-cap.conf").exists())
rec("OPS", "F-env-perms", ".env is 600", oct((API / ".env").stat().st_mode)[-3:] == "600",
    oct((API / ".env").stat().st_mode)[-3:])
r = sh(["nginx", "-t"])
rec("OPS", "F-nginx", "nginx config valid", r.returncode == 0, r.stderr.strip()[:60])
rec("OPS", "F-ci", "CI workflow exists", (pathlib.Path("/srv/web3proj/.github/workflows/ci.yml")).exists())
rec("OPS", "F-deploy-script", "sepolia deploy script executable",
    os.access("/srv/web3proj/scripts/deploy-sepolia.sh", os.X_OK))

# ============================ G. EXTERNAL LINKS ============================
links = [
 "https://sepolia.etherscan.io", "https://etherscan.io", "https://eips.ethereum.org/EIPS/eip-4361",
 "https://eips.ethereum.org/EIPS/eip-20", "https://book.getfoundry.sh/anvil/", "https://viem.sh",
 "https://docs.openzeppelin.com/contracts/5.x/", "https://ethereum.org/en/developers/docs/consensus-mechanisms/pos/",
 "https://www.alchemy.com/faucets/ethereum-sepolia", "https://developers.circle.com/stablecoins/docs/usdc-on-test-networks",
 "https://book.getfoundry.sh", "https://docs.soliditylang.org",
]
for u in links:
    c = sh(["curl", "-s", "-o", "/dev/null", "-L", "-m", "20", "-w", "%{http_code}", u]).stdout.strip()
    rec("LINKS", f"G-{u.split('//')[1][:24]}", f"{u.split('//')[1][:34]}", c == "200", c)

# ============================ H. BUILD / CONTENT ============================
r = sh(["npx", "tsc", "-p", "tsconfig.json", "--noEmit"], cwd=API, timeout=300)
rec("BUILD", "H-api-tsc", "API typecheck", r.returncode == 0, r.stdout[-100:])
r = sh(["npx", "tsc", "--noEmit", "-p", "tsconfig.json"], cwd=WEB, timeout=300)
rec("BUILD", "H-web-tsc", "Web typecheck", r.returncode == 0, r.stdout[-100:])

js = list((WEB / "dist/assets").glob("*.js"))
if js:
    size = js[0].stat().st_size
    rec("BUILD", "H-bundle", "bundle < 450 kB", size < 450_000, f"{size//1024} kB")
    rec("BUILD", "H-bundle-html", "index.html built", (WEB / "dist/index.html").exists())
    rec("BUILD", "H-deploy-page", "deploy.html built", (WEB / "dist/deploy.html").exists())

stale = ["one signature", "0.01 test ETH", "Copy the two addresses", "Three transactions",
         "16 pages", "of 11", "of 10", "Components ·", "Practice ·", "settlement simulated"]
for s in stale:
    hits = [f.name for f in list((WEB / "src").rglob("*.ts*")) + list((WEB / "public").glob("*"))
            if f.is_file() and f.suffix in (".tsx", ".ts", ".html", ".css") and s in f.read_text(errors="ignore")]
    rec("BUILD", f"H-stale-{s[:16]}", f"no stale phrase '{s[:24]}'", not hits, ",".join(hits[:3]))

secrets = ["BEGIN RSA PRIVATE KEY", "postgresql://web3app_runtime:", "SEPOLIA_DEPLOYER_KEY=0x"]
for s in secrets:
    hits = [str(f) for f in pathlib.Path("/srv/web3proj").rglob("*")
            if f.is_file() and f.suffix in (".ts", ".tsx", ".html", ".md", ".json", ".sh")
            and "node_modules" not in str(f) and "dist" not in str(f) and s in f.read_text(errors="ignore")]
    rec("BUILD", f"H-secret-{s[:12]}", f"no '{s[:20]}' in source", not hits, hits[:2])

# ============================ SUMMARY ============================
fails = [x for x in results if not x[4]]
for cat in ["STRUCT", "API", "DB", "CONTRACT", "SEC", "OPS", "LINKS", "BUILD"]:
    p, t = cat_stats.get(cat, [0, 0])
    print(f"{cat:9} {p:3}/{t:3}")
print()
for cat, cid, name, ok, detail in fails:
    print(f"FAIL  {cid:22} {name:44} {detail}")
print(f"\n{len(results)-len(fails)} passed, {len(fails)} failed, {len(results)} total checks")
sys.exit(1 if fails else 0)
