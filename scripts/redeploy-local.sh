#!/usr/bin/env bash
# Redeploys the demo contracts to the local anvil chain and prints the env lines.
# Use this if anvil restarts (its state is in-memory) and the app loses its contract.
set -euo pipefail
export PATH="$HOME/.foundry/bin:$PATH"
cd /srv/web3proj/contracts

RPC=http://127.0.0.1:8545
ARBITER_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
ARBITER=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
BUYER=0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC

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

echo "Update /srv/web3proj/api/.env with:"
echo "CONTRACT_ADDRESS=$ESCROW"
echo "TOKEN_ADDRESS=$USDC"
echo "CONTRACT_DEPLOY_BLOCK=$BLOCK"
echo "then: sudo systemctl restart web3proj-api"
