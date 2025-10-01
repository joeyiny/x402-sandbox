import { Request, Response, NextFunction } from "express";
import type { Address } from "viem";
import type {
  PaymentPayload,
  PaymentRequirements,
  VerifyRequest,
  VerifyResponse,
  SettleRequest,
  SettleResponse,
  x402Response,
} from "x402/types";
import type { FacilitatorConfig } from "@x402-sandbox/types";

/**
 * Payment middleware for x402-sandbox
 * Simple implementation for local testing with Anvil and facilitator
 */
export function paymentMiddleware(
  paymentAddress: Address,
  pricing: {
    [path: string]: {
      price: string;
      network: string;
      asset: string;
    };
  },
  facilitator: FacilitatorConfig
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const priceConfig = pricing[req.path];
    if (!priceConfig) {
      return next();
    }

    // Convert decimal USDC to atomic units (6 decimals)
    const priceInUsdc = parseFloat(priceConfig.price);
    const priceInAtomicUnits = Math.floor(priceInUsdc * 1_000_000).toString();

    console.log(`💳 ${req.method} ${req.path} - Price: ${priceInUsdc} USDC (${priceInAtomicUnits} units)`);

    // Get payment header (case-insensitive search)
    const paymentHeader = Object.entries(req.headers).find(
      ([key]) => key.toLowerCase() === "x-payment"
    )?.[1] as string | undefined;

    const paymentRequirements: PaymentRequirements = {
      scheme: "exact",
      network: priceConfig.network as any, // Allow any network for local testing
      maxAmountRequired: priceInAtomicUnits,
      resource: `${req.protocol}://${req.get("host")}${req.originalUrl}`,
      description: "",
      mimeType: "application/json",
      payTo: paymentAddress,
      maxTimeoutSeconds: 60,
      asset: priceConfig.asset,
      extra: {
        name: "USD Coin",
        version: "1",
      },
      outputSchema: {
        input: {
          type: "http",
          method: req.method,
          discoverable: true,
        },
      },
    };

    const buildErrorResponse = (error?: string): x402Response => ({
      x402Version: 1,
      error: error as any,
      accepts: [paymentRequirements],
    });

    if (!paymentHeader) {
      console.log(`❌ No payment header - returning 402`);
      return res
        .status(402)
        .json(buildErrorResponse("X-PAYMENT header is required"));
    }

    // Decode payment payload
    const paymentPayload = await (async (): Promise<PaymentPayload | null> => {
      try {
        return JSON.parse(Buffer.from(paymentHeader, "base64").toString());
      } catch {
        return null;
      }
    })();

    if (!paymentPayload) {
      return res
        .status(402)
        .json(buildErrorResponse("Invalid payment header format"));
    }

    const verifyResult = await (async (): Promise<VerifyResponse | null> => {
      try {
        const headers = facilitator.createAuthHeaders
          ? (await facilitator.createAuthHeaders()).verify ?? {}
          : {};

        const verifyRequest: VerifyRequest = {
          paymentPayload,
          paymentRequirements,
        };

        const response = await fetch(`${facilitator.url}/verify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
          body: JSON.stringify(verifyRequest),
        });

        return (await response.json()) as VerifyResponse;
      } catch (error) {
        console.error("Facilitator verification error:", error);
        return null;
      }
    })();

    if (!verifyResult) {
      return res
        .status(402)
        .json(buildErrorResponse("Payment verification failed"));
    }

    if (!verifyResult.isValid) {
      return res
        .status(402)
        .json(
          buildErrorResponse(
            verifyResult.invalidReason ?? "Payment verification failed"
          )
        );
    }

    // Intercept response to handle settlement BEFORE sending
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    const performSettlement = async (): Promise<SettleResponse> => {
      const headers = facilitator.createAuthHeaders
        ? (await facilitator.createAuthHeaders()).settle || {}
        : {};

      const settleRequest: SettleRequest = {
        paymentPayload,
        paymentRequirements,
      };

      const response = await fetch(`${facilitator.url}/settle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify(settleRequest),
      });

      return (await response.json()) as SettleResponse;
    };

    let settlementHandled = false;
    const handleSettlement = async (body: any) => {
      if (settlementHandled) {
        return originalJson.call(res, body);
      }
      settlementHandled = true;

      if (res.statusCode < 200 || res.statusCode >= 300) {
        return originalJson.call(res, body);
      }

      try {
        const settleResult = await performSettlement();
        if (!settleResult?.success) {
          console.error(
            `❌ Settlement failed: ${settleResult?.errorReason ?? "Unknown error"}`
          );
          res.status(402);
          return originalJson.call(
            res,
            buildErrorResponse("payment_settlement_failed")
          );
        }

        console.log(
          `✅ Payment received! ${priceInUsdc} USDC - TX: ${settleResult.transaction}`
        );

        res.setHeader(
          "X-PAYMENT-RESPONSE",
          JSON.stringify({
            success: true,
            transaction: settleResult.transaction,
            network: settleResult.network,
          })
        );
        return originalJson.call(res, body);
      } catch (error) {
        console.error("❌ Settlement error:", error);
        res.status(402);
        return originalJson.call(
          res,
          buildErrorResponse("payment_settlement_error")
        );
      }
    };

    // Override json method with proper typing
    res.json = function (body?: any): Response {
      handleSettlement(body).catch((err) => {
        console.error("Settlement handling error:", err);
        if (!res.headersSent) {
          res.status(500).end();
        }
      });
      return res;
    };

    next();
  };
}
