import { getSupabase } from "./supabase";
import { pumpConfig } from "./pumpConfig";

export type PumpToken = {
  mint: string;
  symbol: string | null;
  name: string | null;
  image_url: string | null;
  dex_url: string | null;
  pair_address: string | null;
  dex_id: string | null;
  price_usd: number | null;
  market_cap_usd: number | null;
  fdv_usd: number | null;
  liquidity_usd: number | null;
  volume_1h_usd: number | null;
  volume_24h_usd: number | null;
  price_change_1h: number | null;
  price_change_24h: number | null;
  buys_1h: number | null;
  sells_1h: number | null;
  score: number | null;
  risk_flags: string[];
  pair_created_at: string | null;
  updated_at: string;
};

export type PumpSignal = {
  id: string;
  token_mint: string;
  signal_type: "watch" | "high_conviction";
  status: "draft" | "active" | "invalidated" | "closed";
  thesis: string;
  trigger_price_usd: number | null;
  invalidation_price_usd: number | null;
  confidence: number;
  is_premium: boolean;
  published_at: string | null;
  created_at: string;
  token?: Pick<PumpToken, "symbol" | "name" | "price_usd" | "dex_url"> | null;
};

export type TrackedWallet = {
  address: string;
  label: string;
  category: string;
  thesis: string | null;
  updated_at: string;
};

export type WalletEvent = {
  id: string;
  signature: string;
  wallet_address: string;
  token_mint: string;
  direction: "buy" | "sell" | "transfer";
  token_amount: number | null;
  amount_usd: number | null;
  counterparty: string | null;
  block_time: string;
  wallet?: Pick<TrackedWallet, "label" | "category"> | null;
  token?: Pick<PumpToken, "symbol" | "name" | "price_usd"> | null;
};

export type TreasuryEvent = {
  signature: string;
  event_type: "funding" | "trade_profit" | "buyback" | "burn";
  token: string;
  token_mint: string | null;
  amount: number;
  amount_usd: number | null;
  block_time: string;
  memo: string | null;
};

export type TerminalData = {
  connected: boolean;
  error?: string;
  updatedAt: string | null;
  tokens: PumpToken[];
  signals: PumpSignal[];
  wallets: TrackedWallet[];
  walletEvents: WalletEvent[];
  treasuryEvents: TreasuryEvent[];
  stats: {
    trackedMarkets: number | null;
    activeSignals: number | null;
    trackedWallets: number | null;
    walletEvents24h: number | null;
  };
};

function hasDatabaseConfig() {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

function asNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeToken(row: Record<string, unknown>): PumpToken {
  return {
    mint: String(row.mint),
    symbol: row.symbol == null ? null : String(row.symbol),
    name: row.name == null ? null : String(row.name),
    image_url: row.image_url == null ? null : String(row.image_url),
    dex_url: row.dex_url == null ? null : String(row.dex_url),
    pair_address: row.pair_address == null ? null : String(row.pair_address),
    dex_id: row.dex_id == null ? null : String(row.dex_id),
    price_usd: asNumber(row.price_usd),
    market_cap_usd: asNumber(row.market_cap_usd),
    fdv_usd: asNumber(row.fdv_usd),
    liquidity_usd: asNumber(row.liquidity_usd),
    volume_1h_usd: asNumber(row.volume_1h_usd),
    volume_24h_usd: asNumber(row.volume_24h_usd),
    price_change_1h: asNumber(row.price_change_1h),
    price_change_24h: asNumber(row.price_change_24h),
    buys_1h: asNumber(row.buys_1h),
    sells_1h: asNumber(row.sells_1h),
    score: asNumber(row.score),
    risk_flags: Array.isArray(row.risk_flags) ? row.risk_flags.map(String) : [],
    pair_created_at: row.pair_created_at == null ? null : String(row.pair_created_at),
    updated_at: String(row.updated_at)
  };
}

function emptyTerminal(error?: string): TerminalData {
  return {
    connected: false,
    error,
    updatedAt: null,
    tokens: [],
    signals: [],
    wallets: [],
    walletEvents: [],
    treasuryEvents: [],
    stats: {
      trackedMarkets: null,
      activeSignals: null,
      trackedWallets: null,
      walletEvents24h: null
    }
  };
}

export async function queuePumpToken(mint: string) {
  if (!mint.toLowerCase().endsWith(pumpConfig.tokenSuffix)) {
    throw new Error(`Only Solana mints ending in ${pumpConfig.tokenSuffix} can be queued.`);
  }
  const { error } = await getSupabase().from("pump_tokens").upsert({
    mint,
    status: "queued",
    last_seen_at: new Date().toISOString()
  }, { onConflict: "mint", ignoreDuplicates: true });
  if (error) throw error;
}

export async function findPumpTokenByMint(mint: string) {
  const { data, error } = await getSupabase().from("pump_tokens")
    .select("*")
    .eq("mint", mint)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  return data ? normalizeToken(data as Record<string, unknown>) : null;
}

export async function findPumpTokensBySymbol(symbol: string) {
  const { data, error } = await getSupabase().from("pump_tokens")
    .select("*")
    .eq("status", "active")
    .ilike("symbol", symbol)
    .order("liquidity_usd", { ascending: false, nullsFirst: false })
    .limit(2);
  if (error) throw error;
  return (data ?? []).map((row) => normalizeToken(row as Record<string, unknown>));
}

export async function findActiveSignal(tokenMint: string) {
  const minimum = Number.parseInt(process.env.HIGH_CONVICTION_MIN_SCORE ?? "85", 10);
  const { data, error } = await getSupabase().from("pump_signals")
    .select("*")
    .eq("token_mint", tokenMint)
    .eq("status", "active")
    .eq("signal_type", "high_conviction")
    .not("published_at", "is", null)
    .gte("confidence", Number.isFinite(minimum) ? minimum : 85)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as PumpSignal | null;
}

export async function readTerminalData(premium: boolean): Promise<TerminalData> {
  if (!hasDatabaseConfig()) return emptyTerminal("Data service is not configured.");

  try {
    const db = getSupabase();
    const since = new Date(Date.now() - 86_400_000).toISOString();
    let signalQuery = db.from("pump_signals")
      .select("*, token:pump_tokens(symbol,name,price_usd,dex_url)")
      .eq("status", "active")
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(20);
    if (!premium) signalQuery = signalQuery.eq("is_premium", false);

    const [tokens, signals, wallets, walletEvents, treasuryEvents, marketCount, signalCount, walletCount, eventCount] = await Promise.all([
      db.from("pump_tokens").select("*").eq("status", "active")
        .order("score", { ascending: false, nullsFirst: false }).limit(24),
      signalQuery,
      premium
        ? db.from("tracked_wallets").select("address,label,category,thesis,updated_at")
          .eq("active", true).order("label").limit(50)
        : Promise.resolve({ data: [], error: null }),
      premium
        ? db.from("wallet_events")
          .select("*, wallet:tracked_wallets(label,category), token:pump_tokens(symbol,name,price_usd)")
          .order("block_time", { ascending: false }).limit(50)
        : Promise.resolve({ data: [], error: null }),
      db.from("treasury_events").select("*").order("block_time", { ascending: false }).limit(20),
      db.from("pump_tokens").select("mint", { count: "exact", head: true }).eq("status", "active"),
      db.from("pump_signals").select("id", { count: "exact", head: true })
        .eq("status", "active").not("published_at", "is", null),
      db.from("tracked_wallets").select("address", { count: "exact", head: true }).eq("active", true),
      db.from("wallet_events").select("id", { count: "exact", head: true }).gte("block_time", since)
    ]);

    const firstError = [tokens, signals, wallets, walletEvents, treasuryEvents, marketCount, signalCount, walletCount, eventCount]
      .find((result) => result.error)?.error;
    if (firstError) throw firstError;

    const normalizedTokens = (tokens.data ?? []).map((row) => normalizeToken(row as Record<string, unknown>));
    const updatedAt = normalizedTokens.reduce<string | null>((latest, token) => {
      if (!latest || Date.parse(token.updated_at) > Date.parse(latest)) return token.updated_at;
      return latest;
    }, null);

    return {
      connected: true,
      updatedAt,
      tokens: normalizedTokens,
      signals: (signals.data ?? []) as unknown as PumpSignal[],
      wallets: (wallets.data ?? []) as unknown as TrackedWallet[],
      walletEvents: (walletEvents.data ?? []) as unknown as WalletEvent[],
      treasuryEvents: (treasuryEvents.data ?? []) as unknown as TreasuryEvent[],
      stats: {
        trackedMarkets: marketCount.count ?? 0,
        activeSignals: signalCount.count ?? 0,
        trackedWallets: walletCount.count ?? 0,
        walletEvents24h: eventCount.count ?? 0
      }
    };
  } catch (error) {
    return emptyTerminal(error instanceof Error ? error.message : "Data service unavailable.");
  }
}
