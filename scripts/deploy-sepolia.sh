#!/usr/bin/env bash
# Deploys the escrow to Ethereum Sepolia with real transactions.
set -euo pipefail
export PATH="$HOME/.foundry/bin:$PATH"
cd /srv/web3proj/contracts

ENV_FILE="${ENV_FILE:-/srv/web3proj/api/.env}"
set -a; . "$ENV_FILE"; set +a

RPC="https://ethereum-sepolia-rpc.publicnode.com"
KEY="${SEPOLIA_DEPLOYER_KEY:?missing SEPOLIA_DEPLOYER_KEY}"
DEPLOYER=$(cast wallet address --private-key "$KEY")
ARBITER=$(cast wallet address --private-key "$ARBITER_PRIVATE_KEY")
GAS_FUND=2000000000000000   # 0.002 ETH each

echo "deployer: $DEPLOYER"
echo "arbiter:  $ARBITER"
echo "balance:  $(cast balance "$DEPLOYER" --rpc-url "$RPC" --ether) ETH"

echo "deploying test USDC on Sepolia…"
USDC=$(forge create src/MockUSDC.sol:MockUSDC --rpc-url "$RPC" --private-key "$KEY" --broadcast 2>/dev/null \
  | grep -o "Deployed to: 0x[0-9a-fA-F]*" | awk '{print $3}')
echo "  USDC:   $USDC"

echo "deploying escrow…"
ESCROW=$(forge create src/VehicleEscrow.sol:VehicleEscrow --rpc-url "$RPC" --private-key "$KEY" --broadcast \
  --constructor-args "$USDC" "$ARBITER" 2>/dev/null \
  | grep -o "Deployed to: 0x[0-9a-fA-F]*" | awk '{print $3}')
echo "  escrow: $ESCROW"

echo "minting 1,000,000 USDC to the demo buyer…"
cast send "$USDC" "mint(address,uint256)" "$DEMO_BUYER" 1000000000000 \
  --rpc-url "$RPC" --private-key "$KEY" > /dev/null

echo "funding signers with gas…"
for ACCT in "$DEMO_BUYER" "$DEMO_SELLER" "$ARBITER"; do
  cast send "$ACCT" --value "$GAS_FUND" --rpc-url "$RPC" --private-key "$KEY" > /dev/null
  echo "  $ACCT funded"
done

BLOCK=$(cast block-number --rpc-url "$RPC")

python3 - "$RPC" "$ESCROW" "$USDC" "$BLOCK" <<'PY'
import sys, pathlib
rpc, escrow, usdc, block = sys.argv[1:5]
p = pathlib.Path("/srv/web3proj/api/.env")
lines = [l for l in p.read_text().splitlines() if l and not l.startswith(
    ("CHAIN_MODE=", "RPC_URL=", "CHAIN_ID=", "CONTRACT_ADDRESS=", "TOKEN_ADDRESS=", "CONTRACT_DEPLOY_BLOCK="))]
lines += ["CHAIN_MODE=sepolia", f"RPC_URL={rpc}", "CHAIN_ID=11155111",
          f"CONTRACT_ADDRESS={escrow}", f"TOKEN_ADDRESS={usdc}", f"CONTRACT_DEPLOY_BLOCK={block}"]
p.write_text("\n".join(lines) + "\n")
PY

echo "restarting API…"
sudo systemctl restart web3proj-api
sleep 5
echo "health: $(curl -s http://127.0.0.1:8310/api/health)"
echo
echo "escrow: https://sepolia.etherscan.io/address/$ESCROW"
echo "token:  https://sepolia.etherscan.io/address/$USDC"
