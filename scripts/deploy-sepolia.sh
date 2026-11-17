#!/usr/bin/env bash
# Deploys the escrow to Ethereum Sepolia with a real ERC-20 and real transactions.
# Everything it creates lives on a public network and is visible on Etherscan.
set -euo pipefail
export PATH="$HOME/.foundry/bin:$PATH"
cd /srv/web3proj/contracts

ENV_FILE="${ENV_FILE:-/srv/web3proj/api/.env}"
# shellcheck disable=SC1090
set -a; . "$ENV_FILE"; set +a

RPC="${SEPOLIA_RPC:-https://ethereum-sepolia-rpc.publicnode.com}"
KEY="${SEPOLIA_DEPLOYER_KEY:?SEPOLIA_DEPLOYER_KEY missing from $ENV_FILE}"
DEPLOYER=$(cast wallet address --private-key "$KEY")
BUYER="$DEMO_BUYER"
SELLER="$DEMO_SELLER"

BAL_WEI=$(cast balance "$DEPLOYER" --rpc-url "$RPC")
MIN_WEI=10000000000000000   # 0.01 ETH

echo "network:  Sepolia (11155111)"
echo "deployer: $DEPLOYER"
echo "balance:  $(cast balance "$DEPLOYER" --rpc-url "$RPC" --ether) ETH"

if [ "$BAL_WEI" -lt "$MIN_WEI" ]; then
  cat <<MSG

  NOT FUNDED YET.

  Send at least 0.01 Sepolia ETH to:

      $DEPLOYER

  Then run this script again. It will deploy, fund the demo accounts with gas,
  mint test USDC and repoint the API at Sepolia.
MSG
  exit 1
fi

# gas for the two demo signers so they can send their own transactions on-chain
for ACCT in "$BUYER" "$SELLER"; do
  HAVE=$(cast balance "$ACCT" --rpc-url "$RPC")
  if [ "$HAVE" -lt 3000000000000000 ]; then
    echo "funding $ACCT with 0.004 ETH for gas"
    cast send "$ACCT" --value 0.004ether --rpc-url "$RPC" --private-key "$KEY" > /dev/null
  fi
done

echo "deploying test USDC on Sepolia…"
USDC=$(forge create src/MockUSDC.sol:MockUSDC --rpc-url "$RPC" --private-key "$KEY" --broadcast 2>/dev/null \
  | grep -o "Deployed to: 0x[0-9a-fA-F]*" | awk '{print $3}')
echo "  USDC: $USDC"

echo "deploying escrow…"
ESCROW=$(forge create src/VehicleEscrow.sol:VehicleEscrow --rpc-url "$RPC" --private-key "$KEY" --broadcast \
  --constructor-args "$USDC" "$DEPLOYER" 2>/dev/null \
  | grep -o "Deployed to: 0x[0-9a-fA-F]*" | awk '{print $3}')
echo "  escrow: $ESCROW"

echo "minting 1,000,000 USDC to the buyer…"
cast send "$USDC" "mint(address,uint256)" "$BUYER" 1000000000000 \
  --rpc-url "$RPC" --private-key "$KEY" > /dev/null

BLOCK=$(cast block-number --rpc-url "$RPC")

python3 - "$RPC" "$ESCROW" "$USDC" "$BLOCK" <<'PY'
import sys, pathlib, re
rpc, escrow, usdc, block = sys.argv[1:5]
p = pathlib.Path("/srv/web3proj/api/.env")
lines = [l for l in p.read_text().splitlines() if l and not l.startswith(
    ("CHAIN_MODE=", "RPC_URL=", "CHAIN_ID=", "CONTRACT_ADDRESS=", "TOKEN_ADDRESS=", "CONTRACT_DEPLOY_BLOCK="))]
lines += [
    "CHAIN_MODE=sepolia",
    f"RPC_URL={rpc}",
    "CHAIN_ID=11155111",
    f"CONTRACT_ADDRESS={escrow}",
    f"TOKEN_ADDRESS={usdc}",
    f"CONTRACT_DEPLOY_BLOCK={block}",
]
p.write_text("\n".join(lines) + "\n")
print("env updated")
PY

echo "restarting API…"
sudo systemctl restart web3proj-api

sleep 4
curl -s http://127.0.0.1:8310/api/health || true
echo
echo "escrow:   https://sepolia.etherscan.io/address/$ESCROW"
echo "token:    https://sepolia.etherscan.io/address/$USDC"
