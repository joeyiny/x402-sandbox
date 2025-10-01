# @bus402/x402-sandbox

> **One command to spin up a complete x402 payment server locally**

Local development environment for testing HTTP 402 Payment Required protocol with blockchain payments.

## Quick Start

```bash
# Start everything with one command
npx @bus402/x402-sandbox start

# Generate payment curl commands
npx @bus402/x402-sandbox curl -p <payment-address> -t <token-address>
```

That's it! You now have:
- ✅ Local blockchain running (Anvil)
- ✅ USDC token deployed
- ✅ X402 payment server running on http://localhost:3002
- ✅ Payment facilitator running
- ✅ Test accounts funded with ETH & USDC

## Installation

```bash
# Global installation
npm install -g @bus402/x402-sandbox

# Or use directly with npx (recommended)
npx @bus402/x402-sandbox start
```

## What is x402?

x402 is a protocol for HTTP 402 Payment Required - enabling direct blockchain payments for API access. This sandbox gives you everything you need to test it locally.

## Features

- 🚀 **One-line setup** - Complete x402 environment in seconds
- 💳 **EIP-3009 USDC** - Gasless token transfers via signatures
- 🔧 **Payment Facilitator** - Handles payment verification and settlement
- 🌐 **Sample Server** - Ready-to-use x402 protected endpoints
- 🧪 **Pre-funded Accounts** - Test accounts with ETH and USDC

## Commands

### `start`

Start the complete x402 sandbox environment:

```bash
x402-sandbox start [options]

Options:
  -c, --config <path>  Path to config file
```

This command will:
1. Start a local Anvil node (or connect to external)
2. Deploy an EIP-3009 USDC token
3. Fund test accounts with ETH and USDC
4. Start the X402 Facilitator service
5. Start the X402 Server with sample endpoints

### `curl`

Generate curl commands for testing x402 payments:

```bash
x402-sandbox curl [options]

Required Options:
  -p, --payment-address <address>  Payment receiver address
  -t, --token-address <address>    EIP-3009 token address

Optional:
  -k, --private-key <key>          Private key for signing
  -s, --server <url>               Server URL (default: http://localhost:3002)
  --chain-id <id>                  Chain ID (default: 31337)
  --token-name <name>              Token name (default: USD Coin)
  -e, --endpoint <path>            Specific endpoint to test
  -a, --amount <units>             Payment amount in atomic units
```

## Sample Endpoints

The sandbox includes a sample X402 server with protected endpoints:

- `/health` - Free health check endpoint
- `/api/data` - Requires 0.1 USDC payment

## Configuration

You can provide a custom configuration file:

```json
{
  "node": {
    "type": "local" | "external",
    "url": "https://your-rpc-url" // for external
  },
  "token": {
    "deploy": true,
    "name": "USD Coin",
    "symbol": "USDC",
    "decimals": 6
  },
  "facilitator": {
    "port": 3001
  },
  "server": {
    "port": 3002
  }
}
```

## Test Accounts

When using local mode, the following test accounts are created with 1000 ETH and 10,000 USDC each:

1. `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
   - Private Key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

2. `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
   - Private Key: `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`

3. `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`
   - Private Key: `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a`

## License

MIT