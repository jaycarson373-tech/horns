import bs58 from "bs58";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction
} from "@solana/web3.js";

import { getConfig } from "./config";
import {
  createAutoTrade,
  updateAutoTrade,
  type AutoTradeStatus,
  type PumpTrade
} from "./supabase";
import { resolveCalloutToken, type CalloutResolution } from "./pumpxbtAgent";
import { pumpConfig } from "./pumpConfig";

const SOL_MINT = "So11111111111111111111111111111111111111112";

type QuoteRoute = {
  inAmount?: string;
  outAmount?: string;
  [key: string]: unknown;
};

type QuoteResponse = {
  data?: QuoteRoute[];
  route?: QuoteRoute;
  routes?: QuoteRoute[];
  inputAmount?: string;
  inAmount?: string;
  outAmount?: string;
};

type SwapResponse = {
  swapTransaction?: string;
};

type AutoTradeResult =
  | { kind: "not_applicable"; reason: string }
  | { kind: "dry_run"; trade: PumpTrade; reason?: string }
  | { kind: "already_processed"; trade: PumpTrade; reason: string }
  | { kind: "success"; trade: PumpTrade; signature: string }
  | { kind: "failed"; trade: PumpTrade; reason: string };

function splitJsonArray(value: string) {
  const trimmed = value.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return null;

  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function parseSecretKey(value: string): Keypair {
  const input = value.trim();

  const parsed = splitJsonArray(input);
  if (parsed && parsed.length === 64 && parsed.every((value) => typeof value === "number")) {
    return Keypair.fromSecretKey(Uint8Array.from(parsed));
  }

  const decoded = bs58.decode(input);
  return Keypair.fromSecretKey(decoded);
}

function asTradeCandidate(text: string): Promise<CalloutResolution> {
  return resolveCalloutToken(text);
}

function parseAmount(value: string | undefined | null) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function safeBigInt(value: string | null | undefined) {
  if (!value || !/^\d+$/.test(value)) return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

function toUiAmount(raw: string | null | undefined, decimals: number | null): number | null {
  if (!raw || decimals === null || !Number.isInteger(decimals) || decimals < 0 || decimals > 18) return null;
  const numeric = safeBigInt(raw);
  if (numeric === null) return null;
  const divisor = 10n ** BigInt(decimals);
  const integer = numeric / divisor;
  const fraction = numeric % divisor;
  return Number(integer) + Number(fraction) / Number(divisor);
}

function parseFirstRoute(payload: QuoteResponse): QuoteRoute {
  if (payload.route && payload.route.inAmount && payload.route.outAmount) {
    return payload.route;
  }

  if (payload.data && payload.data.length > 0) {
    return payload.data[0];
  }

  if (payload.routes && payload.routes.length > 0) {
    return payload.routes[0];
  }

  throw new Error("No route returned by Jupiter quote endpoint.");
}

function getQuoteErrorText(payload: unknown) {
  if (payload == null) return "empty response";
  if (typeof payload === "string") return payload;
  if (typeof payload === "object" && payload !== null) {
    const maybe = payload as Record<string, unknown>;
    if (typeof maybe.error === "string") return maybe.error;
    if (typeof maybe.error === "object") return JSON.stringify(maybe.error);
  }

  return "unknown response";
}

async function getMintDecimals(connection: Connection, mint: string) {
  const parsed = await connection.getParsedAccountInfo(new PublicKey(mint));
  const value = parsed.value;
  const parsedData = value && typeof value === "object" && "data" in value ? value.data : null;
  if (!parsedData || parsedData === null || parsedData === undefined) return null;

  if (typeof parsedData !== "object") return null;
  const maybe = parsedData as { parsed?: { info?: { decimals?: unknown } } };
  const decimals = maybe.parsed?.info?.decimals;

  return typeof decimals === "number" && Number.isInteger(decimals) ? decimals : null;
}

async function fetchQuote(config: ReturnType<typeof getConfig>, tokenMint: string) {
  const amount = Math.max(config.autoTradeSolAmount, 0.000001);
  const amountLamports = Math.floor(amount * 1_000_000_000);

  const quoteUrl = new URL(`${config.autoTradeQuoteApiUrl.replace(/\/$/, "")}/quote`);
  quoteUrl.searchParams.set("inputMint", config.autoTradeSolMint || SOL_MINT);
  quoteUrl.searchParams.set("outputMint", tokenMint);
  quoteUrl.searchParams.set("amount", String(amountLamports));
  quoteUrl.searchParams.set("slippageBps", String(config.autoTradeSlippageBps));
  quoteUrl.searchParams.set("onlyDirectRoutes", "true");

  const response = await fetch(quoteUrl.toString());
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Quote request failed: ${response.status} ${response.statusText} ${getQuoteErrorText(body)}`);
  }

  const payload = await response.json() as QuoteResponse;
  const route = parseFirstRoute(payload);
  const inAmount = parseAmount(route.inAmount ?? payload.inAmount);
  const outAmount = parseAmount(route.outAmount ?? payload.outAmount);

  if (!route || !inAmount || inAmount <= 0) {
    throw new Error("Quote route missing amount fields.");
  }

  return { route, inAmount, outAmount };
}

async function fetchSwapTransaction(config: ReturnType<typeof getConfig>, trader: Keypair, quoteRoute: QuoteRoute) {
  const response = await fetch(`${config.autoTradeQuoteApiUrl.replace(/\/$/, "")}/swap`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      quoteResponse: quoteRoute,
      userPublicKey: trader.publicKey.toBase58(),
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      asLegacyTransaction: false
    })
  });

  const payloadText = await response.text();
  if (!response.ok) {
    throw new Error(`Swap transaction request failed: ${response.status} ${response.statusText} ${getQuoteErrorText(payloadText)}`);
  }

  const payload = payloadText ? JSON.parse(payloadText) as SwapResponse : {};
  if (!payload.swapTransaction) {
    throw new Error("Swap endpoint did not return a serialized transaction.");
  }

  const serialized = Buffer.from(payload.swapTransaction, "base64");
  try {
    const tx = VersionedTransaction.deserialize(serialized);
    tx.sign([trader]);
    return tx.serialize();
  } catch {
    const tx = Transaction.from(serialized);
    tx.sign(trader);
    return tx.serialize();
  }
}

async function sendAndConfirm(connection: Connection, serializedTx: Buffer | Uint8Array) {
  const signature = await connection.sendRawTransaction(Buffer.from(serializedTx));
  await connection.confirmTransaction(signature, "confirmed");
  return signature;
}

function skipReasonFromResolution(resolution: CalloutResolution) {
  if (resolution.unsupportedMint) return "unsupported_mint";
  if (resolution.queuedMint) return "token_queued";
  if (resolution.ambiguous) return "ambiguous_token";
  return "no_valid_callout";
}

export function isTradeableCallout(resolution: CalloutResolution) {
  if (resolution.unsupportedMint || resolution.ambiguous || (!resolution.token && !resolution.queuedMint)) {
    return false;
  }

  const mint = resolution.token?.mint ?? resolution.queuedMint!;
  return mint.toLowerCase().endsWith(pumpConfig.tokenSuffix);
}

export async function resolveCalloutForAutoTrade(text: string) {
  const resolution = await asTradeCandidate(text);
  return {
    resolution,
    tokenMint: resolution.token?.mint ?? resolution.queuedMint,
    canTrade: isTradeableCallout(resolution)
  };
}

export async function executeAutoTradeFromMention(params: {
  mentionId: string;
  mentionText: string;
  authorId: string;
  authorUsername: string | null;
  authorFollowers: number | null;
}) : Promise<AutoTradeResult> {
  const config = getConfig();
  if (!config.autoTradeEnabled) {
    return { kind: "not_applicable", reason: "auto_trading_disabled" };
  }

  const resolution = await resolveCalloutForAutoTrade(params.mentionText);

  if (!resolution.canTrade) {
    return { kind: "not_applicable", reason: skipReasonFromResolution(resolution.resolution) };
  }

  const token = resolution.resolution.token;
  const tokenMint = resolution.tokenMint;
  if (!tokenMint) {
    return { kind: "not_applicable", reason: "no_token" };
  }
  const tokenSymbol = token?.symbol ?? null;

  const created = await createAutoTrade({
    mentionId: params.mentionId,
    authorId: params.authorId,
    tokenMint,
    tokenSymbol,
    solAmount: config.autoTradeSolAmount,
    authorUsername: params.authorUsername,
    authorFollowers: params.authorFollowers,
    status: config.dryRun ? "submitted" : "queued",
    reason: config.dryRun ? "dry_run" : null
  });

  if (!created.created) {
    return { kind: "already_processed", trade: created.trade, reason: "already_executed_or_queued" };
  }

  if (config.dryRun) {
    return { kind: "dry_run", trade: created.trade };
  }

  try {
    if (!config.autoTradePrivateKey) {
      throw new Error("AUTO_TRADE_PRIVATE_KEY is required when AUTO_TRADE_ENABLED=true and DRY_RUN=false");
    }

    const trader = parseSecretKey(config.autoTradePrivateKey);
    const connection = new Connection(config.autoTradeRpcUrl);
    const decimals = await getMintDecimals(connection, tokenMint);
    const quote = await fetchQuote(config, tokenMint);
    const serializedTx = await fetchSwapTransaction(config, trader, quote.route);
    await updateAutoTrade(created.trade.id, { status: "submitted", reason: null });
    const signature = await sendAndConfirm(connection, serializedTx);
    const tokenAmount = toUiAmount(quote.route.outAmount ?? null, decimals);

    const updated = await updateAutoTrade(created.trade.id, {
      status: "executed" as AutoTradeStatus,
      reason: null,
      executed_at: new Date().toISOString(),
      tx_signature: signature,
      token_amount: tokenAmount,
      token_decimals: decimals,
      quote_amount_lamports: quote.route.inAmount ?? null,
      token_symbol: tokenSymbol
    });

    return { kind: "success", trade: updated, signature };
  } catch (error) {
    const updated = await updateAutoTrade(created.trade.id, {
      status: "failed" as AutoTradeStatus,
      reason: error instanceof Error ? error.message : "trade_failed"
    });

    return {
      kind: "failed",
      trade: updated,
      reason: error instanceof Error ? error.message : "trade_failed"
    };
  }
}
