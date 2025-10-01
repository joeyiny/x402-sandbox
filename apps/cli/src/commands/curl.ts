import { ethers } from "ethers";
import { Command } from "commander";
import colors from "colors";
import { DEFAULT_TEST_ACCOUNTS } from "@x402-sandbox/types";

interface PaymentPayload {
  x402Version: number;
  scheme: string;
  network: string;
  payload: {
    signature: string;
    authorization: {
      from: string;
      to: string;
      value: string;
      validAfter: string;
      validBefore: string;
      nonce: string;
    };
  };
}

async function generateEIP3009Signature(
  privateKey: string,
  to: string,
  amount: bigint,
  tokenAddress: string,
  chainId: number = 31337,
  tokenName: string = "USD Coin",
  tokenVersion: string = "1"
): Promise<{ signature: string; nonce: string; validBefore: bigint }> {
  const wallet = new ethers.Wallet(privateKey);

  // Generate random nonce (32 bytes)
  const nonce = ethers.hexlify(ethers.randomBytes(32));
  const validAfter = 0n;
  const validBefore = BigInt(Math.floor(Date.now() / 1000) + 3600); // Valid for 1 hour

  // EIP-3009 domain (use provided token info)
  const domain = {
    name: tokenName,
    version: tokenVersion,
    chainId,
    verifyingContract: tokenAddress,
  };

  // EIP-3009 types
  const types = {
    TransferWithAuthorization: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
    ],
  };

  const message = {
    from: wallet.address,
    to,
    value: amount,
    validAfter,
    validBefore,
    nonce,
  };

  // Sign the typed data
  const signature = await wallet.signTypedData(domain, types, message);

  return { signature, nonce, validBefore };
}

async function generatePaymentCurl(
  endpoint: string,
  amount: string,
  method: "GET" | "POST" = "GET",
  privateKey: string,
  paymentAddress: string,
  tokenAddress: string,
  serverUrl: string = "http://localhost:3002",
  chainId: number = 31337,
  tokenName: string = "USD Coin",
  tokenVersion: string = "1"
): Promise<string> {
  const wallet = new ethers.Wallet(privateKey);

  // Generate EIP-3009 signature
  const { signature, nonce, validBefore } = await generateEIP3009Signature(
    privateKey,
    paymentAddress,
    BigInt(amount),
    tokenAddress,
    chainId,
    tokenName,
    tokenVersion
  );

  // Create payment payload with 'exact' scheme
  const paymentPayload: PaymentPayload = {
    x402Version: 1,
    scheme: "exact",
    network: chainId === 31337 ? "local" : chainId.toString(),
    payload: {
      signature,
      authorization: {
        from: wallet.address,
        to: paymentAddress,
        value: amount,
        validAfter: "0",
        validBefore: validBefore.toString(),
        nonce,
      },
    },
  };

  // Base64 encode the payload
  const encodedPayload = Buffer.from(JSON.stringify(paymentPayload)).toString(
    "base64"
  );

  // Build curl command
  const baseCommand = `curl -X ${method} "${serverUrl}${endpoint}" \\\n`;
  const headers = [
    `  -H "Content-Type: application/json" \\\n`,
    `  -H "X-PAYMENT: ${encodedPayload}"`,
  ];
  const data = method === "POST" ? ` \\\n  -d '{"input": "test data"}'` : "";

  return baseCommand + headers.join("") + data;
}

export const curlCommand = new Command("curl")
  .description("Generate curl commands for testing x402 payments")
  .requiredOption(
    "-p, --payment-address <address>",
    "Payment receiver address (facilitator address from start command)"
  )
  .requiredOption(
    "-t, --token-address <address>",
    "EIP-3009 token contract address (from start command)"
  )
  .option(
    "-k, --private-key <key>",
    "Private key to use for signing (default: test account #1)",
    DEFAULT_TEST_ACCOUNTS[0].privateKey
  )
  .option("-s, --server <url>", "Server URL", "http://localhost:3002")
  .option("--rpc <url>", "RPC URL for external networks")
  .option("--chain-id <id>", "Chain ID for external networks", "31337")
  .option("--token-name <name>", "Token name for EIP-3009 domain", "USD Coin")
  .option("-e, --endpoint <path>", "Specific endpoint to test")
  .option("-a, --amount <units>", "Payment amount in atomic units")
  .action(async (options) => {
    try {
      const privateKey = options.privateKey;
      const wallet = new ethers.Wallet(privateKey);
      const chainId = parseInt(options.chainId);

      console.log(colors.cyan.bold("\n=== X402 Payment Test Commands ===\n"));
      console.log(colors.gray("Configuration:"));
      console.log(colors.gray("─".repeat(50)));
      console.log(`Account:         ${colors.yellow(wallet.address)}`);
      console.log(`Payment to:      ${colors.yellow(options.paymentAddress)}`);
      console.log(`Token:           ${colors.yellow(options.tokenAddress)}`);
      console.log(`Server:          ${colors.yellow(options.server)}`);
      console.log(`Chain ID:        ${colors.yellow(chainId.toString())}`);
      console.log(`Scheme:          ${colors.yellow("exact")}`);
      console.log(colors.gray("─".repeat(50)));

      // If specific endpoint requested
      if (options.endpoint && options.amount) {
        const method = options.endpoint.includes("compute") ? "POST" : "GET";
        console.log(
          colors.green(`\nGenerated payment command for ${options.endpoint}:`)
        );
        console.log(colors.gray("─".repeat(50)));
        const curl = await generatePaymentCurl(
          options.endpoint,
          options.amount,
          method,
          privateKey,
          options.paymentAddress,
          options.tokenAddress,
          options.server,
          chainId
        );
        console.log(curl);
        return;
      }

      console.log(
        colors.green("\n1. Test health endpoint (free, no payment required):")
      );
      console.log(colors.gray("─".repeat(50)));
      console.log(
        `curl -X GET "${options.server}/health" -H "Content-Type: application/json"`
      );

      console.log(
        colors.green("\n2. Test endpoint WITHOUT payment (will return 402):")
      );
      console.log(colors.gray("─".repeat(50)));
      console.log(
        `curl -X GET "${options.server}/api/data" -H "Content-Type: application/json" -i`
      );

      console.log(
        colors.green("\n3. Test endpoint WITH payment (EIP-3009 signature):")
      );
      console.log(colors.gray("─".repeat(50)));

      console.log(colors.yellow("\n# Data endpoint (0.1 USDC):"));
      const dataCurl = await generatePaymentCurl(
        "/api/data",
        "100000",
        "GET",
        privateKey,
        options.paymentAddress,
        options.tokenAddress,
        options.server,
        chainId
      );
      console.log(dataCurl);

      console.log(colors.cyan.bold("\n=== Pricing ==="));
      console.log(colors.gray("─".repeat(50)));
      console.log("• /api/data:     0.1 USDC  (100000 units)");

      console.log(colors.cyan.bold("\n=== Notes ==="));
      console.log(colors.gray("─".repeat(50)));
      console.log(
        "• Make sure x402-sandbox is running (npx x402-sandbox start)"
      );
      console.log(
        "• The account needs USDC tokens (minted during sandbox startup)"
      );
      console.log("• Signatures are valid for 1 hour from generation");
      console.log("");
    } catch (error) {
      console.error(colors.red("Error generating payment commands:"), error);
      process.exit(1);
    }
  });
