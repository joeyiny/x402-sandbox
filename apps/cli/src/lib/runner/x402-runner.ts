import colors from "colors";
import fs from "fs-extra";
import path from "path";
import { ethers } from "ethers";
import type { Server } from "http";
import { Facilitator } from "@x402-sandbox/facilitator";
import { startX402Server } from "@x402-sandbox/x402-server";
import {
  DEFAULT_TEST_ACCOUNTS,
  DEFAULT_PORTS,
  SandboxConfig,
  DEFAULT_TOKEN_CONFIG,
} from "@x402-sandbox/types";
import {
  NodeManager,
  deployEIP3009Token,
  mintTokensToAccounts,
} from "../blockchain";
import { createInteractiveConfig } from "../config";

// Simple spinner implementation
class Spinner {
  private interval: NodeJS.Timeout | null = null;
  private message: string = "";

  start(message: string) {
    this.message = message;
    const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    let i = 0;
    this.interval = setInterval(() => {
      process.stdout.write(`\r${frames[i]} ${this.message}`);
      i = (i + 1) % frames.length;
    }, 80);
  }

  succeed(message: string) {
    if (this.interval) clearInterval(this.interval);
    process.stdout.write(`\r✓ ${message}\n`);
  }

  fail(message: string) {
    if (this.interval) clearInterval(this.interval);
    process.stdout.write(`\r✗ ${message}\n`);
  }

  info(message: string) {
    if (this.interval) clearInterval(this.interval);
    process.stdout.write(`\rℹ ${message}\n`);
  }
}

export class X402Runner {
  private config: SandboxConfig;
  private spinner: Spinner = new Spinner();

  private nodeManager?: NodeManager;
  private facilitator?: Facilitator;
  private server?: { app: any; server: Server; stop: () => Promise<void> };

  private constructor(config: SandboxConfig) {
    this.config = config;
  }

  static async create(configPath?: string): Promise<X402Runner> {
    const config: SandboxConfig = configPath
      ? await (async () => {
          const resolvedPath = path.resolve(configPath);
          if (await fs.pathExists(resolvedPath)) {
            console.log(colors.green(`✓ Loaded config from ${resolvedPath}`));
            return await fs.readJson(resolvedPath);
          }
          throw new Error(`Config file not found: ${resolvedPath}`);
        })()
      : await createInteractiveConfig();

    return new X402Runner(config);
  }

  private generateFacilitatorKey(): string {
    if (this.config.facilitator?.privateKey) {
      return this.config.facilitator.privateKey;
    }

    const isLocal = this.config.node?.type === "local";
    if (isLocal) {
      const wallet = ethers.Wallet.createRandom();
      console.log(colors.cyan("\n🔑 Generated new facilitator"));
      console.log(colors.gray(`   Address: ${wallet.address}`));
      console.log(colors.gray(`   Private Key: ${wallet.privateKey}\n`));
      return wallet.privateKey;
    }

    throw new Error("Facilitator private key is required for external node");
  }

  private async setupToken(signer: ethers.Signer): Promise<string> {
    if (this.config.token?.address) {
      this.spinner.succeed(`Using token at ${this.config.token.address}`);
      return this.config.token.address;
    }

    const isLocal = this.config.node?.type === "local";
    if (!isLocal && !this.config.token?.address) {
      throw new Error("Token address is required for external node");
    }

    this.spinner.start("Deploying EIP-3009 USDC token...");
    const tokenConfig = this.config.token?.deploy
      ? {
          name: this.config.token.name ?? DEFAULT_TOKEN_CONFIG.name,
          symbol: this.config.token.symbol ?? DEFAULT_TOKEN_CONFIG.symbol,
          decimals: this.config.token.decimals ?? DEFAULT_TOKEN_CONFIG.decimals,
          initialSupply:
            this.config.token.initialSupply ??
            DEFAULT_TOKEN_CONFIG.initialSupply,
        }
      : DEFAULT_TOKEN_CONFIG;

    const wallet = signer as ethers.Wallet;
    const tokenAddress = await deployEIP3009Token(wallet, tokenConfig);
    this.spinner.succeed(`USDC deployed at ${tokenAddress}`);

    if (isLocal) {
      this.spinner.start("Minting USDC to test accounts...");
      const recipients = DEFAULT_TEST_ACCOUNTS.map((acc) => ({
        address: acc.address,
        amount: "10000000000", // 10,000 USDC
      }));
      await mintTokensToAccounts(tokenAddress, wallet, recipients);
      this.spinner.succeed(`Test accounts funded with USDC`);
    }

    return tokenAddress;
  }

  private displaySummary(
    facilitatorKey: string,
    facilitatorAddress: string,
    tokenAddress: string,
    paymentAddress: string
  ): void {
    const isLocal = this.config.node?.type === "local";
    const rpcUrl = isLocal
      ? "http://127.0.0.1:8545"
      : this.config.node?.url ?? "";
    const facilitatorPort =
      this.config.facilitator?.port ?? DEFAULT_PORTS.facilitator;
    const serverPort = this.config.server?.port ?? DEFAULT_PORTS.server;

    console.log(colors.green("\n✅ X402 Sandbox is running!\n"));
    console.log(colors.cyan.bold("Configuration:"));
    console.log(colors.gray("─".repeat(50)));

    console.log(colors.yellow("Node:"));
    console.log(`  • RPC: ${colors.white(rpcUrl)}`);
    console.log(
      `  • Type: ${colors.white(isLocal ? "Local Anvil" : "External")}`
    );

    console.log(colors.yellow("\nFacilitator:"));
    console.log(
      `  • URL: ${colors.white(`http://localhost:${facilitatorPort}`)}`
    );
    console.log(`  • Address (gas payer): ${colors.white(facilitatorAddress)}`);
    if (isLocal) {
      console.log(`  • Private Key: ${colors.gray(facilitatorKey)}`);
    }

    console.log(colors.yellow("\nX402 Server:"));
    console.log(`  • URL: ${colors.white(`http://localhost:${serverPort}`)}`);
    console.log(`  • Payment Address (receiver): ${colors.white(paymentAddress)}`);

    console.log(colors.yellow("\nToken:"));
    console.log(`  • Address: ${colors.white(tokenAddress)}`);
    console.log(`  • Symbol: USDC`);

    if (isLocal) {
      console.log(
        colors.yellow("\nTest Accounts (1000 ETH, 10,000 USDC each):")
      );
      DEFAULT_TEST_ACCOUNTS.forEach((acc, i) => {
        console.log(`  ${i + 1}. ${acc.address}`);
        if (i === 0) {
          console.log(`     ${colors.gray(acc.privateKey)}`);
        }
      });
    }

    console.log(colors.gray("─".repeat(50)));

    // Payment command examples
    console.log(colors.cyan("\n💳 Generate payment commands:"));
    console.log(
      colors.white(
        `  x402-sandbox curl -p ${paymentAddress} -t ${tokenAddress}`
      )
    );
    console.log(colors.gray("  # Generate curl commands with valid payments\n"));

    console.log(colors.cyan("📝 Test endpoints:"));
    console.log(colors.white(`  curl http://localhost:${serverPort}/health`));
    console.log(colors.gray("  # Free endpoint\n"));

    console.log(
      colors.white(`  curl http://localhost:${serverPort}/api/data`)
    );
    console.log(colors.gray("  # Returns 402 - requires payment (0.1 USDC)\n"));

    console.log(colors.gray("Press Ctrl+C to stop all services\n"));
  }

  async start(): Promise<void> {
    const isLocal = this.config.node?.type === "local";
    const rpcUrl = isLocal
      ? "http://127.0.0.1:8545"
      : this.config.node?.url ?? "http://127.0.0.1:8545";

    // Start local node if needed
    if (isLocal) {
      this.nodeManager = new NodeManager();
      this.spinner.start("Starting Anvil node...");
      const isInstalled = await this.nodeManager.checkInstallation();
      if (!isInstalled) {
        this.spinner.info(
          "Anvil not found. @viem/anvil will download it automatically"
        );
      }
      await this.nodeManager.startNode({ port: 8545 });
      this.spinner.succeed("Anvil node started on port 8545");
    }

    // Setup facilitator
    const facilitatorKey = this.generateFacilitatorKey();
    const facilitatorWallet = new ethers.Wallet(facilitatorKey);
    const facilitatorAddress = facilitatorWallet.address;
    const facilitatorPort =
      this.config.facilitator?.port ?? DEFAULT_PORTS.facilitator;

    // Generate payment receiver address (different from facilitator)
    const paymentWallet = ethers.Wallet.createRandom();
    const paymentAddress = paymentWallet.address;
    console.log(colors.cyan("\n💰 Generated payment receiver"));
    console.log(colors.gray(`   Address: ${paymentAddress}`));
    if (isLocal) {
      console.log(colors.gray(`   Private Key: ${paymentWallet.privateKey}\n`));
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);

    if (isLocal) {
      this.spinner.start("Setting up accounts...");
      await provider.send("anvil_setBalance", [
        facilitatorWallet.address,
        "0x" + BigInt("100000000000000000000").toString(16), // 100 ETH
      ]);
      this.spinner.succeed(`Facilitator funded with 100 ETH`);
    }

    // Deploy/setup token
    const tokenAddress = await this.setupToken(
      facilitatorWallet.connect(provider)
    );

    // Start facilitator
    this.spinner.start("Starting X402 Facilitator...");
    this.facilitator = new Facilitator({
      rpcUrl: rpcUrl,
      privateKey: facilitatorKey,
      tokenAddress: tokenAddress,
      port: facilitatorPort,
    });

    await this.facilitator.start();
    this.spinner.succeed(`Facilitator started on port ${facilitatorPort}`);

    // Start X402 server
    this.spinner.start("Starting X402 Server...");
    const serverPort = this.config.server?.port ?? DEFAULT_PORTS.server;
    this.server = await startX402Server({
      port: serverPort,
      facilitatorUrl: `http://localhost:${facilitatorPort}`,
      paymentAddress: paymentAddress,
      tokenAddress: tokenAddress,
    });
    this.spinner.succeed(`X402 Server started on port ${serverPort}`);

    // Display summary
    this.displaySummary(facilitatorKey, facilitatorAddress, tokenAddress, paymentAddress);

    // Handle graceful shutdown
    process.on("SIGINT", async () => {
      console.log("\n");
      const stopSpinner = ora("Shutting down services...").start();
      try {
        if (this.server) {
          await this.server.stop();
        }
        if (this.nodeManager) {
          await this.nodeManager.stopNode();
        }
        stopSpinner.succeed("All services stopped");
      } catch (error) {
        stopSpinner.fail("Error during shutdown");
        console.error(error);
      }
      process.exit(0);
    });

    // Keep process alive
    await new Promise(() => {});
  }
}
