export interface Endpoint {
  method: string;
  path: string;
  auth: string;
  purpose: string;
}

export interface Meta {
  service: string;
  version: string;
  generatedAt: string;
  runtime: Record<string, string>;
  web3: {
    chain: string;
    chainId: number;
    token: string;
    tokenAddress: string;
    tokenDecimals: number;
    escrowContract: string;
    solidity: string;
    openzeppelin: string;
    chainMode: "local" | "simulated" | string;
    settlement: string;
    note: string;
  };
  escrow: { states: string[]; releaseTimeoutDays: number; arbitration: string };
  endpoints: Endpoint[];
}
