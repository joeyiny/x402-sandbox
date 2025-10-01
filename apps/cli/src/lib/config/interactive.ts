import prompts from "prompts";
import colors from "colors";
import type { SandboxConfig } from "@x402-sandbox/types";
import { DEFAULT_PORTS, DEFAULT_TOKEN_CONFIG } from "@x402-sandbox/types";

export async function createInteractiveConfig(): Promise<SandboxConfig> {
  console.log(colors.cyan.bold("\n🎮 X402 Sandbox Interactive Setup\n"));

  const { nodeType } = await prompts({
    type: "select",
    name: "nodeType",
    message: "Which type of node would you like to use?",
    choices: [
      {
        title: "Local Anvil Node (Recommended for development)",
        value: "local",
      },
      {
        title: "External Node (Connect to existing blockchain)",
        value: "external",
      },
    ],
  });

  if (nodeType === "local") {
    return await configureLocalNode();
  }

  return await configureExternalNode();
}

async function configureLocalNode(): Promise<SandboxConfig> {
  console.log(colors.green("\n📦 Configuring Local Development Environment\n"));

  // Ask for basic customization
  const { customize } = await prompts([
    {
      type: "confirm",
      name: "customize",
      message:
        "Would you like to customize the configuration? (No for defaults)",
      default: false,
    },
  ]);

  if (!customize) {
    // Return minimal config with defaults
    return {
      node: { type: "local" },
    } as SandboxConfig;
  }

  // Token configuration
  console.log(colors.yellow("\n💰 Token Configuration\n"));
  const tokenAnswers = await prompts([
    {
      type: "input",
      name: "name",
      message: "Token name:",
      default: DEFAULT_TOKEN_CONFIG.name,
    },
    {
      type: "input",
      name: "symbol",
      message: "Token symbol:",
      default: DEFAULT_TOKEN_CONFIG.symbol,
    },
    {
      type: "number",
      name: "decimals",
      message: "Token decimals:",
      default: DEFAULT_TOKEN_CONFIG.decimals,
    },
  ]);

  // Server configuration
  console.log(colors.yellow("\n🌐 Server Configuration\n"));
  const serverAnswers = await prompts([
    {
      type: "number",
      name: "facilitatorPort",
      message: "Facilitator port:",
      default: DEFAULT_PORTS.facilitator,
    },
    {
      type: "number",
      name: "serverPort",
      message: "X402 Server port:",
      default: DEFAULT_PORTS.server,
    },
  ]);

  return {
    node: { type: "local" },
    token: {
      deploy: true,
      name: tokenAnswers.name,
      symbol: tokenAnswers.symbol,
      decimals: tokenAnswers.decimals,
      initialSupply: DEFAULT_TOKEN_CONFIG.initialSupply,
    },
    facilitator: {
      port: serverAnswers.facilitatorPort,
    },
    server: {
      port: serverAnswers.serverPort,
    },
  } as SandboxConfig;
}

async function configureExternalNode(): Promise<SandboxConfig> {
  console.log(colors.green("\n🌍 Configuring External Node Connection\n"));

  const { nodeUrl } = await prompts([
    {
      type: "input",
      name: "nodeUrl",
      message:
        "Enter your node RPC URL (e.g., https://eth-sepolia.g.alchemy.com/v2/...):",
      validate: (input) => {
        if (!input || !input.startsWith("http")) {
          return "Please enter a valid HTTP(S) URL";
        }
        return true;
      },
    },
  ]);

  console.log(colors.yellow("\n💰 EIP-3009 Token Configuration\n"));
  const { tokenAddress } = await prompts([
    {
      type: "input",
      name: "tokenAddress",
      message: "Enter your EIP-3009 compatible token address:",
      validate: (input) => {
        if (!input || !input.startsWith("0x") || input.length !== 42) {
          return "Please enter a valid Ethereum address (0x...)";
        }
        return true;
      },
    },
  ]);

  console.log(colors.yellow("\n🔑 Facilitator Configuration\n"));
  const { privateKey } = await prompts([
    {
      type: "password",
      name: "privateKey",
      message: "Enter the facilitator private key (will be hidden):",
      validate: (input) => {
        if (!input || !input.startsWith("0x") || input.length !== 66) {
          return "Please enter a valid private key (0x... with 64 hex characters)";
        }
        return true;
      },
    },
  ]);

  return {
    node: {
      type: "external",
      url: nodeUrl,
    },
    token: {
      deploy: false,
      address: tokenAddress,
    },
    facilitator: {
      privateKey: privateKey,
    },
  } as SandboxConfig;
}