// Default ports
export const DEFAULT_PORTS = {
  rpc: 8545,
  facilitator: 3001,
  server: 3002,
} as const;

// Default facilitator URLs
export const DEFAULT_LOCAL_FACILITATOR_URL = `http://localhost:${DEFAULT_PORTS.facilitator}`;
export const DEFAULT_CDP_FACILITATOR_URL =
  "https://api.developer.coinbase.com/x402/facilitator";

// Test accounts (same as Anvil/Hardhat default accounts)
export const DEFAULT_TEST_ACCOUNTS = [
  {
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    privateKey:
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  },
  {
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    privateKey:
      "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  },
  {
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    privateKey:
      "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  },
] as const;

// Default facilitator uses first test account
export const DEFAULT_FACILITATOR_PRIVATE_KEY =
  DEFAULT_TEST_ACCOUNTS[0].privateKey;

// Default mnemonic for local nodes
export const DEFAULT_MNEMONIC =
  "test test test test test test test test test test test junk";

// Node configuration
export interface NodeConfig {
  type: "local" | "external";
  url?: string; // Required for external node, ignored for local
}

// Token configuration
export interface TokenConfig {
  deploy?: boolean; // true for local (deploy new), false for external (use existing)
  address?: string; // Required when deploy=false
  // Optional overrides for deployment (when deploy=true)
  name?: string;
  symbol?: string;
  decimals?: number;
  initialSupply?: string;
}

// Facilitator configuration
export interface FacilitatorConfig {
  port?: number; // Default: 3001
  privateKey?: string; // Required for external node, optional for local
}

// Server configuration
export interface ServerConfig {
  port?: number; // Default: 3002
}

// Complete sandbox configuration
export interface SandboxConfig {
  node: NodeConfig;
  token?: TokenConfig;
  facilitator?: FacilitatorConfig;
  server?: ServerConfig;
}

// Legacy interfaces for backward compatibility (deprecated)
export type BlockchainType = "local" | "anvil" | "external";
export interface BlockchainConfig {
  type?: BlockchainType;
  url?: string;
}
export type FacilitatorType = "local" | "cdp";
export interface FacilitatorConfig {
  type?: FacilitatorType;
  privateKey?: string;
  url?: string;
  createAuthHeaders?: () => Promise<{
    verify?: Record<string, string>;
    settle?: Record<string, string>;
  }>;
}
export interface TokenConfigOverrides {
  deploy?: boolean;
  address?: string;
}

// Token deployment configuration
export interface TokenDeployConfig {
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: string;
}

// Default token config
export const DEFAULT_TOKEN_CONFIG: TokenDeployConfig = {
  name: "USD Coin",
  symbol: "USDC",
  decimals: 6,
  initialSupply: "1000000000000000", // 1 billion USDC
};
