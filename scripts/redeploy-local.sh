#!/usr/bin/env bash
# Redeploys the demo contracts to the local anvil chain and prints the env lines.
# Use this if anvil restarts (its state is in-memory) and the app loses its contract.
# Credentials are read from the API env file; nothing is hardcoded here.
set -euo pipefail
export PATH="$HOME/.foundry/bin:$PATH"
cd /srv/web3proj/contracts

ENV_FILE="${ENV_FILE:-/srv/web3proj/api/.env}"
# shellcheck disable=SC1090
set -a; . "$ENV_FILE"; set +a

RPC="${RPC_URL:?RPC_URL missing from $ENV_FILE}"
ARBITER_KEY="${ARBITER_PRIVATE_KEY:?ARBITER_PRIVATE_KEY missing from $ENV_FILE}"
BUYER="${DEMO_BUYER:?DEMO_BUYER missing from $ENV_FILE}"
ARBITER=$(cast wallet address --private-key "$ARBITER_KEY")

curl -sf -X POST "$RPC" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' > /dev/null \
  || { echo "anvil is not responding on $RPC"; exit 1; }

USDC=$(forge create src/MockUSDC.sol:MockUSDC --rpc-url "$RPC" \
  --private-key "$ARBITER_KEY" --broadcast 2>/dev/null \
  | grep -o "Deployed to: 0x[0-9a-fA-F]*" | awk '{print $3}')

ESCROW=$(forge create src/VehicleEscrow.sol:VehicleEscrow --rpc-url "$RPC" \
  --private-key "$ARBITER_KEY" --broadcast \
  --constructor-args "$USDC" "$ARBITER" 2>/dev/null \
  | grep -o "Deployed to: 0x[0-9a-fA-F]*" | awk '{print $3}')

cast send "$USDC" "mint(address,uint256)" "$BUYER" 1000000000000 \
  --rpc-url "$RPC" --private-key "$ARBITER_KEY" > /dev/null

BLOCK=$(cast block-number --rpc-url "$RPC")

echo "Update $ENV_FILE with:"
echo "CONTRACT_ADDRESS=$ESCROW"
echo "TOKEN_ADDRESS=$USDC"
echo "CONTRACT_DEPLOY_BLOCK=$BLOCK"
echo "then: sudo systemctl restart web3proj-api"
