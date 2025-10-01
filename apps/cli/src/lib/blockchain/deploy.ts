import { ethers } from "ethers";
import artifactData from "./artifacts/EIP3009Token.json" assert { type: "json" };

export interface TokenConfig {
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: string;
}

/**
 * Deploy EIP-3009 token using ethers.js
 * This works with both Hardhat and Anvil nodes
 */
export async function deployEIP3009Token(
  signer: ethers.Wallet,
  config: TokenConfig
): Promise<string> {
  // Get bytecode and ABI
  const bytecode = await getBytecode();

  const abi = await getABI();
  const factory = new ethers.ContractFactory(abi, bytecode, signer);

  const contract = await factory.deploy(
    config.name,
    config.symbol,
    config.decimals,
    config.initialSupply
  );

  await contract.waitForDeployment();
  return await contract.getAddress();
}

/**
 * Mint tokens to addresses using contract interaction
 */
export async function mintTokensToAccounts(
  tokenAddress: string,
  owner: ethers.Wallet,
  recipients: Array<{ address: string; amount: string }>
): Promise<void> {
  const abi = [
    "function mint(address to, uint256 amount) external",
    "function balanceOf(address account) view returns (uint256)",
    "function decimals() view returns (uint8)",
  ];

  const token = new ethers.Contract(tokenAddress, abi, owner);
  const decimals = await token.decimals();

  // Get the starting nonce
  let nonce = await owner.getNonce();

  for (const recipient of recipients) {
    try {
      // Explicitly set the nonce for each transaction
      const tx = await token.mint(recipient.address, recipient.amount, { nonce: nonce++ });
      await tx.wait();

      const balance = await token.balanceOf(recipient.address);
      console.log(
        `  ✓ ${recipient.address.slice(0, 8)}...${recipient.address.slice(
          -6
        )}: ${ethers.formatUnits(balance, decimals)} USDC`
      );
    } catch (error) {
      console.error(
        `  ✗ Failed to mint to ${recipient.address.slice(
          0,
          8
        )}...${recipient.address.slice(-6)}: ${error instanceof Error ? error.message : error}`
      );
      // Get fresh nonce if error occurred
      nonce = await owner.getNonce();
    }
  }
}

async function getABI(): Promise<any[]> {
  return artifactData.abi ?? [
    {
      inputs: [
        { internalType: "string", name: "name", type: "string" },
        { internalType: "string", name: "symbol", type: "string" },
        { internalType: "uint8", name: "decimals_", type: "uint8" },
        { internalType: "uint256", name: "initialSupply", type: "uint256" },
      ],
      stateMutability: "nonpayable",
      type: "constructor",
    },
    {
      inputs: [
        { internalType: "address", name: "to", type: "address" },
        { internalType: "uint256", name: "amount", type: "uint256" },
      ],
      name: "mint",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        { internalType: "address", name: "from", type: "address" },
        { internalType: "address", name: "to", type: "address" },
        { internalType: "uint256", name: "value", type: "uint256" },
        { internalType: "uint256", name: "validAfter", type: "uint256" },
        { internalType: "uint256", name: "validBefore", type: "uint256" },
        { internalType: "bytes32", name: "nonce", type: "bytes32" },
        { internalType: "uint8", name: "v", type: "uint8" },
        { internalType: "bytes32", name: "r", type: "bytes32" },
        { internalType: "bytes32", name: "s", type: "bytes32" },
      ],
      name: "transferWithAuthorization",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [{ internalType: "address", name: "account", type: "address" }],
      name: "balanceOf",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "name",
      outputs: [{ internalType: "string", name: "", type: "string" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "symbol",
      outputs: [{ internalType: "string", name: "", type: "string" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "decimals",
      outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "DOMAIN_SEPARATOR",
      outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
      stateMutability: "view",
      type: "function",
    },
  ];
}

async function getBytecode(): Promise<string> {
  if (artifactData?.bytecode?.object) {
    return artifactData.bytecode.object;
  }

  throw new Error(
    "Contract bytecode not found. Please compile the contract first."
  );
}
