import express from "express";
import type { Server } from "http";
import cors from "cors";
import { isAddress, getAddress, type Address } from "viem";
import {
  DEFAULT_PORTS,
  type FacilitatorConfig,
} from "@x402-sandbox/types";
import { paymentMiddleware } from "./middleware";

export interface X402ServerConfig {
  port?: number;
  facilitatorUrl?: string;
  paymentAddress?: string;
  tokenAddress?: string;
}

export async function startX402Server(config: X402ServerConfig = {}): Promise<{
  app: express.Application;
  server: Server;
  stop: () => Promise<void>;
}> {
  // Validate required configuration
  if (!config.paymentAddress) {
    throw new Error("Payment address is required");
  }
  if (!isAddress(config.paymentAddress)) {
    throw new Error(`Invalid payment address: ${config.paymentAddress}`);
  }
  if (!config.tokenAddress) {
    throw new Error("Token address is required");
  }
  if (!isAddress(config.tokenAddress)) {
    throw new Error(`Invalid token address: ${config.tokenAddress}`);
  }

  // Convert to checksummed addresses
  const paymentAddress = getAddress(config.paymentAddress);
  const tokenAddress = getAddress(config.tokenAddress);

  const app = express();
  const port = config.port || DEFAULT_PORTS.server;

  app.use(cors());
  app.use(express.json());

  // Create facilitator config for local testing
  const localFacilitator: FacilitatorConfig = {
    url:
      config.facilitatorUrl || `http://localhost:${DEFAULT_PORTS.facilitator}`,
    // No auth headers needed for local facilitator
  };

  // Setup fixed pricing for different endpoints (in USDC, will be converted to atomic units)
  const pricing = {
    "/api/data": {
      price: "0.1", // 0.1 USDC
      network: "local",
      asset: tokenAddress,
    },
  };

  // Apply our custom payment middleware
  app.use(paymentMiddleware(paymentAddress, pricing, localFacilitator));

  // Health check (free)
  app.get("/health", (req, res) => {
    res.json({
      status: "healthy",
      paymentAddress,
      tokenAddress,
      facilitatorUrl:
        config.facilitatorUrl ||
        `http://localhost:${DEFAULT_PORTS.facilitator}`,
    });
  });

  // Protected endpoint - requires payment
  app.get("/api/data", (req, res) => {
    res.json({
      data: Array.from({ length: 100 }, (_, i) => ({
        id: i,
        value: Math.random(),
      })),
      timestamp: new Date().toISOString(),
    });
  });

  const server = app.listen(port);

  return {
    app,
    server,
    stop: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
}
