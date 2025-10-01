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

**Built on top of [Coinbase x402](https://github.com/coinbase/x402)** - This local implementation follows the [x402 specification](https://github.com/coinbase/x402/tree/main/specs).

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

## License

MIT
