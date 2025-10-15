"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_TOKEN_CONFIG = exports.DEFAULT_MNEMONIC = exports.DEFAULT_FACILITATOR_PRIVATE_KEY = exports.DEFAULT_TEST_ACCOUNTS = exports.DEFAULT_CDP_FACILITATOR_URL = exports.DEFAULT_LOCAL_FACILITATOR_URL = exports.DEFAULT_PORTS = void 0;
// Default ports
exports.DEFAULT_PORTS = {
  rpc: 8545,
  facilitator: 3005,
  server: 3002,
};
// Default facilitator URLs
exports.DEFAULT_LOCAL_FACILITATOR_URL = `http://localhost:${exports.DEFAULT_PORTS.facilitator}`;
exports.DEFAULT_CDP_FACILITATOR_URL = 'https://api.developer.coinbase.com/x402/facilitator';
// Test accounts (same as Anvil/Hardhat default accounts)
exports.DEFAULT_TEST_ACCOUNTS = [
    {
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
    },
    {
        address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
    },
    {
        address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        privateKey: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a'
    }
];
// Default facilitator uses first test account
exports.DEFAULT_FACILITATOR_PRIVATE_KEY = exports.DEFAULT_TEST_ACCOUNTS[0].privateKey;
// Default mnemonic for local nodes
exports.DEFAULT_MNEMONIC = 'test test test test test test test test test test test junk';
// Default token config
exports.DEFAULT_TOKEN_CONFIG = {
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    initialSupply: '1000000000000000' // 1 billion USDC
};
//# sourceMappingURL=index.js.map