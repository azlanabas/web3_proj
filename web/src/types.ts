export type EscrowStatus =
  | "CREATED"
  | "FUNDED"
  | "SHIPPED"
  | "DISPUTED"
  | "RELEASED"
  | "REFUNDED"
  | "CANCELLED";

export interface Listing {
  id: string;
  title: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  mileage: number;
  priceUsdc: string;
  status: string;
}

export interface Escrow {
  id: string;
  listingId: string;
  status: EscrowStatus;
  amountUsdc: string;
  onchainId: string;
  contractAddress: string;
  chainId: number;
  fundTx?: string | null;
  releaseTx?: string | null;
  refundTx?: string | null;
  shippedAt?: string | null;
}

export interface ChainEvent {
  id: string;
  eventName: string;
  txHash: string;
  blockNumber: string;
}
