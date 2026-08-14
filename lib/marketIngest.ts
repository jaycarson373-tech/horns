import { pumpConfig } from "./pumpConfig";
import { getSupabase } from "./supabase";

type TokenProfile = {
  chainId?: string;
  tokenAddress?: string;
  icon?: string;
};

type DexPair = {
  chainId?: string;
  dexId?: string;
  url?: string;
  pairAddress?: string;
  baseToken?: { address?: string; name?: string; symbol?: string };
  priceUsd?: string;
  txns?: { h1?: { buys?: number; sells?: number } };
  volume?: { h1?: number; h24?: number };
  priceChange?: { h1?: number; h24?: number };
  liquidity?: { usd?: number };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
  info?: { imageUrl?: string };
};

type HeliusTransfer = {
  fromUserAccount?: string;
  toUserAccount?: string;
  mint?: string;
  tokenAmount?: number;
};

type HeliusTransaction = {
  signature?: string;
  timestamp?: number;
  type?: string;
  tokenTransfers?: HeliusTransfer[];
};

export type MarketIngestResult = {
  discovered: number;
  refreshed: number;
  candidates: number;
  walletEvents: number;
  finishedAt: string;
};

const SCORE_VERSION = "pump-structure-v1";

function finite(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function chunk<T>(items: T[], size: number) {
  const groups: T[][] = [];
  for (let index = 0; index < items.length; index += size) groups.push(items.slice(index, index + size));
  return groups;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "User-Agent": "pumpxbt-agent/0.1.0",
      ...init?.headers
    },
    signal: AbortSignal.timeout(20_000)
  });
  if (!response.ok) throw new Error(`Market data request failed (${response.status})`);
  return response.json() as Promise<T>;
}

function scorePair(pair: DexPair) {
  const liquidity = finite(pair.liquidity?.usd);
  const volume24h = finite(pair.volume?.h24);
  const volume1h = finite(pair.volume?.h1);
  const buys = finite(pair.txns?.h1?.buys);
  const sells = finite(pair.txns?.h1?.sells);
  const change1h = finite(pair.priceChange?.h1);
  const ageHours = pair.pairCreatedAt ? Math.max(0, (Date.now() - pair.pairCreatedAt) / 3_600_000) : 0;

  let score = 0;
  score += Math.min(25, Math.log10(Math.max(1, liquidity)) * 5);
  score += Math.min(20, Math.log10(Math.max(1, volume24h)) * 3.2);
  score += Math.min(15, Math.max(0, (buys - sells) / Math.max(1, buys + sells) * 30 + 7.5));
  score += Math.min(15, volume1h / Math.max(1, liquidity) * 30);
  score += Math.min(10, ageHours / 12);
  score += change1h > 0 && change1h <= 45 ? Math.min(10, change1h / 4.5) : 0;
  score += liquidity > 0 && finite(pair.marketCap) / liquidity < 30 ? 5 : 0;

  const riskFlags: string[] = [];
  if (liquidity < 25_000) riskFlags.push("low_liquidity");
  if (volume24h < 50_000) riskFlags.push("low_volume");
  if (Math.abs(change1h) > 80) riskFlags.push("extreme_1h_move");
  if (sells > buys * 1.8 && sells > 10) riskFlags.push("sell_pressure");
  if (ageHours > 0 && ageHours < 0.25) riskFlags.push("very_new_pair");
  score -= riskFlags.length * 5;

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    riskFlags,
    evidence: { liquidity, volume24h, volume1h, buys, sells, change1h, ageHours }
  };
}

async function discoverMints() {
  const db = getSupabase();
  const existing = await db.from("pump_tokens").select("mint").in("status", ["queued", "active"]).limit(150);
  if (existing.error) throw existing.error;

  const discoveryResults = await Promise.allSettled([
    requestJson<TokenProfile[]>(`${pumpConfig.dexScreenerBaseUrl}/token-profiles/latest/v1`),
    requestJson<TokenProfile[]>(`${pumpConfig.dexScreenerBaseUrl}/token-boosts/latest/v1`),
    requestJson<TokenProfile[]>(`${pumpConfig.dexScreenerBaseUrl}/token-boosts/top/v1`)
  ]);

  const mints = new Set<string>();
  for (const result of discoveryResults) {
    if (result.status === "rejected") {
      console.warn("pumpxbt.discovery_source_failed", { error: String(result.reason) });
      continue;
    }
    for (const item of result.value) {
      const mint = item.tokenAddress?.trim();
      if (item.chainId === "solana" && mint?.toLowerCase().endsWith(pumpConfig.tokenSuffix)) mints.add(mint);
    }
  }
  for (const row of existing.data ?? []) {
    const mint = String(row.mint);
    if (mint.toLowerCase().endsWith(pumpConfig.tokenSuffix)) mints.add(mint);
  }
  return [...mints].slice(0, 150);
}

async function refreshMarkets(mints: string[]) {
  const db = getSupabase();
  let refreshed = 0;
  let candidates = 0;

  for (const group of chunk(mints, 30)) {
    let pairs: DexPair[];
    try {
      pairs = await requestJson<DexPair[]>(
        `${pumpConfig.dexScreenerBaseUrl}/tokens/v1/solana/${group.map(encodeURIComponent).join(",")}`
      );
    } catch (error) {
      console.warn("pumpxbt.market_batch_failed", { mints: group.length, error: String(error) });
      continue;
    }

    for (const mint of group) {
      const matches = pairs.filter((pair) => pair.chainId === "solana" && pair.baseToken?.address === mint);
      const pair = matches.sort((left, right) => finite(right.liquidity?.usd) - finite(left.liquidity?.usd))[0];
      if (!pair) continue;

      const scored = scorePair(pair);
      const now = new Date().toISOString();
      const row = {
        mint,
        symbol: pair.baseToken?.symbol ?? null,
        name: pair.baseToken?.name ?? null,
        image_url: pair.info?.imageUrl ?? null,
        dex_url: pair.url ?? null,
        pair_address: pair.pairAddress ?? null,
        dex_id: pair.dexId ?? null,
        status: "active",
        price_usd: pair.priceUsd ? finite(pair.priceUsd) : null,
        market_cap_usd: pair.marketCap ?? null,
        fdv_usd: pair.fdv ?? null,
        liquidity_usd: pair.liquidity?.usd ?? null,
        volume_1h_usd: pair.volume?.h1 ?? null,
        volume_24h_usd: pair.volume?.h24 ?? null,
        price_change_1h: pair.priceChange?.h1 ?? null,
        price_change_24h: pair.priceChange?.h24 ?? null,
        buys_1h: pair.txns?.h1?.buys ?? null,
        sells_1h: pair.txns?.h1?.sells ?? null,
        score: scored.score,
        score_version: SCORE_VERSION,
        risk_flags: scored.riskFlags,
        data_source: "dexscreener",
        pair_created_at: pair.pairCreatedAt ? new Date(pair.pairCreatedAt).toISOString() : null,
        last_seen_at: now,
        updated_at: now
      };
      const { error } = await db.from("pump_tokens").upsert(row, { onConflict: "mint" });
      if (error) throw error;
      refreshed += 1;

      const clearsThresholds = scored.score >= pumpConfig.highConvictionMinScore
        && scored.evidence.liquidity >= pumpConfig.minimumLiquidityUsd
        && scored.evidence.volume24h >= pumpConfig.minimumVolume24hUsd
        && scored.evidence.buys > scored.evidence.sells
        && scored.riskFlags.length === 0;
      if (!clearsThresholds) continue;

      const hour = now.slice(0, 13);
      const { error: candidateError } = await db.from("signal_candidates").upsert({
        candidate_key: `${mint}:${hour}:${SCORE_VERSION}`,
        token_mint: mint,
        score: scored.score,
        model_version: SCORE_VERSION,
        evidence: scored.evidence,
        reason: "Liquidity, volume, order flow, age, and momentum cleared the configured review thresholds.",
        status: "pending"
      }, { onConflict: "candidate_key", ignoreDuplicates: true });
      if (candidateError) throw candidateError;
      candidates += 1;
    }
  }
  return { refreshed, candidates };
}

async function syncWalletEvents() {
  if (!pumpConfig.heliusApiKey) return 0;
  const db = getSupabase();
  const [walletRows, tokenRows] = await Promise.all([
    db.from("tracked_wallets").select("address").eq("active", true).limit(25),
    db.from("pump_tokens").select("mint").eq("status", "active").limit(500)
  ]);
  if (walletRows.error) throw walletRows.error;
  if (tokenRows.error) throw tokenRows.error;
  const trackedMints = new Set((tokenRows.data ?? []).map((row) => String(row.mint)));
  if (trackedMints.size === 0) return 0;

  let inserted = 0;
  for (const row of walletRows.data ?? []) {
    const wallet = String(row.address);
    try {
      const transactions = await requestJson<HeliusTransaction[]>(
        `https://api-mainnet.helius-rpc.com/v0/addresses/${encodeURIComponent(wallet)}/transactions?api-key=${encodeURIComponent(pumpConfig.heliusApiKey)}&limit=50`
      );
      const events: Record<string, unknown>[] = [];
      for (const transaction of transactions) {
        if (!transaction.signature || !transaction.timestamp) continue;
        const signature = transaction.signature;
        const timestamp = transaction.timestamp;
        (transaction.tokenTransfers ?? []).forEach((transfer, index) => {
          if (!transfer.mint || !trackedMints.has(transfer.mint)) return;
          const incoming = transfer.toUserAccount === wallet;
          const outgoing = transfer.fromUserAccount === wallet;
          if (!incoming && !outgoing) return;
          const swap = transaction.type === "SWAP";
          events.push({
            event_key: `${signature}:${wallet}:${index}`,
            signature,
            transfer_index: index,
            wallet_address: wallet,
            token_mint: transfer.mint,
            direction: swap ? (incoming ? "buy" : "sell") : "transfer",
            token_amount: transfer.tokenAmount ?? null,
            amount_usd: null,
            counterparty: incoming ? transfer.fromUserAccount ?? null : transfer.toUserAccount ?? null,
            block_time: new Date(timestamp * 1000).toISOString(),
            source: "helius"
          });
        });
      }
      if (events.length > 0) {
        const { error } = await db.from("wallet_events").upsert(events, {
          onConflict: "event_key",
          ignoreDuplicates: true
        });
        if (error) throw error;
        inserted += events.length;
      }

      const latestSignature = transactions.find((transaction) => transaction.signature)?.signature;
      if (latestSignature) {
        const { error } = await db.from("tracked_wallets").update({
          last_seen_signature: latestSignature,
          updated_at: new Date().toISOString()
        }).eq("address", wallet);
        if (error) throw error;
      }
    } catch (error) {
      console.warn("pumpxbt.wallet_refresh_failed", { wallet, error: String(error) });
    }
  }
  return inserted;
}

export async function runMarketIngest(): Promise<MarketIngestResult> {
  const mints = await discoverMints();
  const market = await refreshMarkets(mints);
  const walletEvents = await syncWalletEvents();
  return {
    discovered: mints.length,
    refreshed: market.refreshed,
    candidates: market.candidates,
    walletEvents,
    finishedAt: new Date().toISOString()
  };
}
