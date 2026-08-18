import { getConfig } from "./config";
import { queuePumpToken } from "./pumpData";
import { getAutoTradeWalletAddress } from "./pumpTrade";
import { createAutoTrade, findAutoTradeBySignature, updateAutoTrade } from "./supabase";

type HeliusTransaction = {
  signature?: string;
  timestamp?: number;
  type?: string;
  fee?: number;
  transactionError?: unknown;
  tokenTransfers?: Array<{
    fromUserAccount?: string;
    toUserAccount?: string;
    mint?: string;
    tokenAmount?: number;
    rawTokenAmount?: { decimals?: number };
  }>;
  nativeTransfers?: Array<{ fromUserAccount?: string; toUserAccount?: string; amount?: number }>;
  accountData?: Array<{ account?: string; nativeBalanceChange?: number }>;
};

export type ParsedWalletBuy = {
  signature: string;
  mint: string;
  solAmount: number;
  tokenAmount: number | null;
  tokenDecimals: number | null;
  executedAt: string;
};

export function parseWalletBuy(transaction: HeliusTransaction, wallet: string): ParsedWalletBuy | null {
  if (transaction.type !== "SWAP" || transaction.transactionError || !transaction.signature || !transaction.timestamp) return null;
  const incoming = (transaction.tokenTransfers ?? [])
    .filter((transfer) => transfer.toUserAccount === wallet && transfer.mint)
    .sort((left, right) => (right.tokenAmount ?? 0) - (left.tokenAmount ?? 0))[0];
  if (!incoming?.mint) return null;

  const balanceChange = transaction.accountData?.find((entry) => entry.account === wallet)?.nativeBalanceChange;
  const outgoing = (transaction.nativeTransfers ?? [])
    .filter((transfer) => transfer.fromUserAccount === wallet)
    .reduce((sum, transfer) => sum + Math.max(0, transfer.amount ?? 0), 0);
  const incomingSol = (transaction.nativeTransfers ?? [])
    .filter((transfer) => transfer.toUserAccount === wallet)
    .reduce((sum, transfer) => sum + Math.max(0, transfer.amount ?? 0), 0);
  const transferSpend = Math.max(0, outgoing - incomingSol);
  const balanceSpend = typeof balanceChange === "number"
    ? Math.max(0, -balanceChange - Math.max(0, transaction.fee ?? 0))
    : 0;
  const spentLamports = transferSpend || balanceSpend;
  if (spentLamports <= 0) return null;

  return {
    signature: transaction.signature,
    mint: incoming.mint,
    solAmount: spentLamports / 1_000_000_000,
    tokenAmount: typeof incoming.tokenAmount === "number" ? incoming.tokenAmount : null,
    tokenDecimals: typeof incoming.rawTokenAmount?.decimals === "number" ? incoming.rawTokenAmount.decimals : null,
    executedAt: new Date(transaction.timestamp * 1000).toISOString()
  };
}

export async function syncTradeWalletOnce() {
  const config = getConfig();
  if (!config.tradeWalletSyncEnabled || config.dryRun) return { status: "disabled" as const, inserted: 0 };
  if (!config.heliusApiKey) return { status: "unavailable" as const, reason: "missing_helius_api_key", inserted: 0 };
  const wallet = getAutoTradeWalletAddress();
  if (!wallet) return { status: "unavailable" as const, reason: "missing_private_key", inserted: 0 };

  const response = await fetch(
    `https://api-mainnet.helius-rpc.com/v0/addresses/${encodeURIComponent(wallet)}/transactions?api-key=${encodeURIComponent(config.heliusApiKey)}&limit=25&type=SWAP`,
    { headers: { Accept: "application/json", "User-Agent": config.userAgent }, signal: AbortSignal.timeout(15_000) }
  );
  if (!response.ok) throw new Error(`Helius trade-wallet sync failed (${response.status})`);
  const transactions = await response.json() as HeliusTransaction[];
  let inserted = 0;

  for (const transaction of [...transactions].reverse()) {
    const buy = parseWalletBuy(transaction, wallet);
    if (!buy || await findAutoTradeBySignature(buy.signature)) continue;
    await queuePumpToken(buy.mint);
    const created = await createAutoTrade({
      mentionId: `wallet:${buy.signature}`,
      authorId: config.botUserId,
      authorUsername: config.botUsername,
      tokenMint: buy.mint,
      tokenAmount: buy.tokenAmount,
      tokenDecimals: buy.tokenDecimals,
      solAmount: buy.solAmount,
      quoteAmountLamports: String(Math.round(buy.solAmount * 1_000_000_000)),
      status: "executed",
      reason: "verified_wallet_sync",
      txSignature: buy.signature
    });
    if (!created.created) continue;
    await updateAutoTrade(created.trade.id, { executed_at: buy.executedAt });
    inserted += 1;
    console.info("pumpxbt.trade_wallet.synced", { signature: buy.signature, mint: buy.mint, solAmount: buy.solAmount });
  }

  return { status: "synced" as const, inserted, wallet };
}
