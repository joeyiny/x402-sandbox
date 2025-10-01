import express from "express";
import cors from "cors";
import { ethers } from "ethers";
import winston from "winston";
import type {
  PaymentPayload,
  PaymentRequirements,
  VerifyRequest,
  VerifyResponse,
  SettleRequest,
  SettleResponse,
  x402Response,
  ExactEvmPayload,
} from "x402/types";
import {
  DEFAULT_FACILITATOR_PRIVATE_KEY,
  DEFAULT_PORTS,
} from "@x402-sandbox/types";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: "HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length
        ? `\n${JSON.stringify(meta, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value, 2)}`
        : "";
      return `[${timestamp}] ${level}: ${message}${metaStr}`;
    })
  ),
  transports: [new winston.transports.Console()],
});

export class Facilitator {
  private app: express.Application;
  private provider: ethers.Provider;
  private wallet: ethers.Wallet;
  private tokenAddress: string;
  private port: number;

  constructor(options: {
    rpcUrl: string;
    privateKey?: string;
    tokenAddress: string;
    port?: number;
  }) {
    this.app = express();
    this.provider = new ethers.JsonRpcProvider(options.rpcUrl);
    this.wallet = new ethers.Wallet(
      options.privateKey || DEFAULT_FACILITATOR_PRIVATE_KEY,
      this.provider
    );
    this.tokenAddress = options.tokenAddress;
    this.port = options.port || DEFAULT_PORTS.facilitator;

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get("/health", (req, res) => {
      res.json({ status: "healthy" });
    });

    // Payment requirements endpoint - returns 402 with requirements
    this.app.get("/protected-resource", async (req, res) => {
      const chainId = await this.provider
        .getNetwork()
        .then((n) => n.chainId.toString());

      const requirements: x402Response = {
        x402Version: 1,
        accepts: [
          {
            scheme: "exact",
            network: chainId as any, // Allow local network IDs
            maxAmountRequired: "1000000", // 1 USDC (6 decimals)
            resource: req.originalUrl,
            description: "Access to protected resource",
            mimeType: "application/json",
            payTo: this.wallet.address,
            maxTimeoutSeconds: 300,
            asset: this.tokenAddress,
            extra: {
              name: "USD Coin",
              version: "2",
            },
          },
        ],
      };

      res.status(402).json(requirements);
    });

    // Verify endpoint - validates payment authorization
    this.app.post("/verify", async (req, res) => {
      try {
        const { paymentPayload, paymentRequirements } =
          req.body as VerifyRequest;

        logger.info(
          `🔍 Verifying payment from ${
            (paymentPayload.payload as any)?.authorization?.from || "unknown"
          }`
        );

        if (paymentPayload.scheme !== "exact") {
          logger.warn("❌ Unsupported payment scheme", {
            scheme: paymentPayload.scheme,
          });
          return res.status(400).json({
            isValid: false,
            invalidReason: "unsupported_scheme",
          } as VerifyResponse);
        }

        const evmPayload = paymentPayload.payload as ExactEvmPayload;
        const { from, to, value, validAfter, validBefore, nonce } =
          evmPayload.authorization;
        const { signature } = evmPayload;

        const valueInUsdc = Number(value) / 1_000_000;
        logger.info(
          `💰 Payment details: ${valueInUsdc} USDC from ${from.slice(
            0,
            8
          )}...${from.slice(-6)}`
        );

        // Verify the payment meets requirements
        if (to.toLowerCase() !== paymentRequirements.payTo.toLowerCase()) {
          logger.warn("❌ Recipient mismatch", {
            expected: paymentRequirements.payTo,
            received: to,
          });
          return res.status(400).json({
            isValid: false,
            invalidReason: "invalid_exact_evm_payload_recipient_mismatch",
          } as VerifyResponse);
        }

        const paymentValue = BigInt(value);
        const requiredValue = BigInt(paymentRequirements.maxAmountRequired);

        if (paymentValue < requiredValue) {
          logger.warn("❌ Insufficient payment", {
            required: `${Number(requiredValue) / 1_000_000} USDC`,
            received: `${valueInUsdc} USDC`,
          });
          return res.status(400).json({
            isValid: false,
            invalidReason: "insufficient_funds",
          } as VerifyResponse);
        }

        // Verify EIP-712 signature
        // For local network, use Anvil's chain ID (31337)
        const chainId =
          (paymentRequirements.network as any) === "local"
            ? 31337n
            : BigInt(paymentRequirements.network);

        const domain = {
          name: paymentRequirements.extra?.name || "USD Coin",
          version: paymentRequirements.extra?.version || "1",
          chainId,
          verifyingContract: paymentRequirements.asset,
        };

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
          from,
          to,
          value: BigInt(value),
          validAfter: BigInt(validAfter),
          validBefore: BigInt(validBefore),
          nonce,
        };

        // Verify signature using the hex signature string
        const recoveredAddress = ethers.verifyTypedData(
          domain,
          types,
          message,
          signature
        );

        logger.debug("🔐 Signature verification", {
          recovered: recoveredAddress,
          expected: from,
          domain,
          nonce,
        });

        if (recoveredAddress.toLowerCase() !== from.toLowerCase()) {
          logger.warn("❌ Signature verification failed", {
            recovered: recoveredAddress,
            expected: from,
          });
          return res.status(400).json({
            isValid: false,
            invalidReason: "invalid_exact_evm_payload_signature",
          } as VerifyResponse);
        }

        // Check time validity
        const now = Math.floor(Date.now() / 1000);
        if (now < Number(validAfter)) {
          logger.warn("❌ Payment not yet valid");
          return res.status(400).json({
            isValid: false,
            invalidReason:
              "invalid_exact_evm_payload_authorization_valid_after",
          } as VerifyResponse);
        }

        if (now > Number(validBefore)) {
          logger.warn("❌ Payment expired");
          return res.status(400).json({
            isValid: false,
            invalidReason: "payment_expired",
          } as VerifyResponse);
        }

        logger.info(`✅ Payment verification successful`);
        res.json({
          isValid: true,
          invalidReason: undefined,
        } as VerifyResponse);
      } catch (error: any) {
        console.log(error);
        logger.error("❌ Verify error:", error.message);
        res.status(500).json({
          isValid: false,
          invalidReason: "unexpected_verify_error",
        } as VerifyResponse);
      }
    });

    // Settle endpoint - executes the payment on-chain
    this.app.post("/settle", async (req, res) => {
      try {
        const { paymentPayload, paymentRequirements } =
          req.body as SettleRequest;

        if (paymentPayload.scheme !== "exact") {
          logger.warn("❌ Unsupported settlement scheme");
          return res.status(400).json({
            success: false,
            errorReason: "unsupported_scheme",
            transaction: "",
            network: "31337" as any,
          } as SettleResponse);
        }

        const evmPayload = paymentPayload.payload as ExactEvmPayload;
        const { from, to, value, validAfter, validBefore, nonce } =
          evmPayload.authorization;
        const { signature } = evmPayload;

        const valueInUsdc = Number(value) / 1_000_000;
        logger.info(
          `⚡ Settling payment: ${valueInUsdc} USDC from ${from.slice(
            0,
            8
          )}...${from.slice(-6)}`
        );

        // Split the signature into r, s, v for the contract call
        const sig = ethers.Signature.from(signature);

        // Execute the transfer with authorization on-chain
        const tokenContract = new ethers.Contract(
          paymentRequirements.asset,
          [
            "function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)",
          ],
          this.wallet
        );

        const tx = await tokenContract.transferWithAuthorization(
          from,
          to,
          value,
          validAfter,
          validBefore,
          nonce,
          sig.v,
          sig.r,
          sig.s
        );

        logger.info(`⏳ Transaction sent: ${tx.hash}`);
        const receipt = await tx.wait();

        logger.info(
          `✅ Payment settled successfully! ${valueInUsdc} USDC received`,
          {
            txHash: receipt.hash,
            from: `${from.slice(0, 8)}...${from.slice(-6)}`,
            amount: `${valueInUsdc} USDC`,
          }
        );

        res.json({
          success: true,
          transaction: receipt.hash,
          network: "local",
          payer: from,
        });
      } catch (error: any) {
        logger.error("❌ Settlement failed:", error.message);

        res.status(500).json({
          success: false,
          errorReason: "unexpected_settle_error",
          transaction: "",
          network: "local",
        });
      }
    });

    // Get facilitator info
    this.app.get("/info", async (req, res) => {
      res.json({
        address: this.wallet.address,
        tokenAddress: this.tokenAddress,
        chainId: await this.provider
          .getNetwork()
          .then((n) => Number(n.chainId)),
      });
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.port, () => {
        logger.info(`Facilitator listening on port ${this.port}`);
        resolve();
      });
    });
  }
}
