export interface Endpoint {
  method: string;
  path: string;
  auth: string;
  purpose: string;
}

export interface Meta {
  service: string;
  version: string;
  startedAt: string;
  uptimeSeconds: number;
  runtime: { node: string; platform: string; arch: string; memoryMb: number };
  chain: {
    mode: string;
    network: string;
    chainId: number;
    rpcHost: string;
    escrow: string;
    token: string;
    deployBlock: string | null;
    blockNumber: string | null;
    gasPriceWei: string | null;
    supportsTimeTravel: boolean;
    timeoutSeconds: string | null;
    tokenDecimals: number | null;
    accounts: { arbiter: string; seller: string; buyer: string };
  };
  escrowStates: string[];
  counts: { listings: number; escrows: number; events: number };
  endpoints: Endpoint[];
}

export interface Block {
  available: boolean;
  number?: string;
  hash?: string;
  parentHash?: string;
  stateRoot?: string;
  timestamp?: string;
  gasUsed?: string;
  transactions?: number;
}
