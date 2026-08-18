import { getSupabase, type PumpTrade } from "./supabase";
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

export type AutoTradeLedgerTrade = {
  id: string;
  bot_project: string;
  mention_id: string;
  author_id: string;
  author_username: string | null;
  author_followers: number | null;
  token_mint: string;
  token_symbol: string | null;
  token_decimals: number | null;
  token_amount: number | null;
  sol_amount: number;
  quote_amount_lamports: string | null;
  status: PumpTrade["status"];
  reason: string | null;
  tx_signature: string | null;
  executed_at: string | null;
  created_at: string;
  updated_at: string;
  token?: Pick<PumpToken, "symbol" | "name"> | null;
  current_sol_value: number | null;
  pnl_sol: number | null;
  pnl_percent: number | null;
};

export type TerminalData = {
  connected: boolean;
  error?: string;
  updatedAt: string | null;
  projectToken?: {
    mint: string;
    symbol: string | null;
    name: string | null;
    price_usd: number | null;
    market_cap_usd: number | null;
    liquidity_usd: number | null;
    volume_24h_usd: number | null;
    updated_at: string;
  };
  tokens: PumpToken[];
  signals: PumpSignal[];
  wallets: TrackedWallet[];
  walletEvents: WalletEvent[];
  treasuryEvents: TreasuryEvent[];
  autoTrades: AutoTradeLedgerTrade[];
  stats: {
    trackedMarkets: number | null;
    activeSignals: number | null;
    trackedWallets: number | null;
    walletEvents24h: number | null;
  };
};

export type CallerPerformance = {
  author_id: string;
  author_username: string | null;
  calls: number;
  executed: number;
  winRate: number | null;
  avgPnlPercent: number | null;
  bestPnlPercent: number | null;
  worstPnlPercent: number | null;
  totalSolAllocated: number;
  lastCallAt: string | null;
};

export type CalloutTokenPerformance = {
  token_mint: string;
  symbol: string | null;
  name: string | null;
  signal_count: number;
  latest_signal_status: PumpSignal["status"] | null;
  latest_signal_confidence: number | null;
  latest_signal_type: PumpSignal["signal_type"] | null;
  latest_signal_at: string | null;
  calls: number;
  executed: number;
  winRate: number | null;
  avgPnlPercent: number | null;
  bestPnlPercent: number | null;
  worstPnlPercent: number | null;
  lastTradeAt: string | null;
};

export type CalloutEngineData = {
  connected: boolean;
  error?: string;
  updatedAt: string | null;
  tokens: CalloutTokenPerformance[];
  callers: CallerPerformance[];
  trades: AutoTradeLedgerTrade[];
};

function hasDatabaseConfig() {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

function asNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asString(value: unknown) {
  if (value === null || value === undefined) return null;
  return String(value);
}

const AUTO_TRADE_QUOTE_API_URL = process.env.AUTO_TRADE_QUOTE_API_URL?.trim()?.replace(/\/$/, "") || "https://api.jup.ag/swap/v1";
const JUPITER_API_KEY = process.env.JUPITER_API_KEY?.trim();
const SOL_MINT = "So11111111111111111111111111111111111111112";

type QuoteResponse = {
  data?: Array<{
    inAmount?: string;
    outAmount?: string;
  }>;
  route?: {
    inAmount?: string;
    outAmount?: string;
  };
  routes?: Array<{
    inAmount?: string;
    outAmount?: string;
  }>;
  inAmount?: string;
  outAmount?: string;
};

function parseAmount(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asBigInt(value: number, decimals: number): string | null {
  if (!Number.isFinite(value) || decimals < 0 || decimals > 18) return null;
  const decimalString = value.toString();
  const [wholeRaw = "0", fractionRaw = ""] = decimalString.split(".");
  const whole = wholeRaw.replace(/^-/, "");
  const fraction = fractionRaw.padEnd(decimals, "0").slice(0, decimals);
  if (whole.length > 20) return null;
  return `${whole}${fraction}`.replace(/^0+(?=\d)/, "") || "0";
}

function firstRouteFromQuote(payload: QuoteResponse) {
  if (payload.route?.inAmount && payload.route?.outAmount) {
    return payload.route;
  }

  if (payload.data && payload.data.length > 0) {
    const route = payload.data[0];
    if (route?.inAmount && route?.outAmount) return route;
  }

  if (payload.routes && payload.routes.length > 0) {
    const route = payload.routes[0];
    if (route?.inAmount && route?.outAmount) return route;
  }

  return {
    inAmount: payload.inAmount,
    outAmount: payload.outAmount
  };
}

async function fetchCurrentSolValue(tokenMint: string, tokenAmount: number | null, tokenDecimals: number | null) {
  if (!tokenAmount || tokenAmount <= 0) return null;
  if (tokenDecimals === null || tokenDecimals < 0 || tokenDecimals > 18) return null;

  const tokenAmountRaw = asBigInt(tokenAmount, tokenDecimals);
  if (!tokenAmountRaw) return null;

  const quoteUrl = new URL(`${AUTO_TRADE_QUOTE_API_URL}/quote`);
  quoteUrl.searchParams.set("inputMint", tokenMint);
  quoteUrl.searchParams.set("outputMint", SOL_MINT);
  quoteUrl.searchParams.set("amount", tokenAmountRaw);
  quoteUrl.searchParams.set("restrictIntermediateTokens", "true");
  quoteUrl.searchParams.set("instructionVersion", "V2");

  const response = await fetch(quoteUrl.toString(), {
    cache: "no-store",
    headers: JUPITER_API_KEY ? { "x-api-key": JUPITER_API_KEY } : undefined
  });
  if (!response.ok) {
    return null;
  }

  const payload = await response.json() as QuoteResponse;
  const route = firstRouteFromQuote(payload);
  const outAmount = parseAmount(route?.outAmount);
  if (!outAmount || outAmount <= 0) return null;

  return outAmount / 1_000_000_000;
}

function addPnl(trade: PumpTrade & { token?: Pick<PumpToken, "symbol" | "name"> | null }, currentSolValue: number | null) {
  if (currentSolValue === null) {
    return {
      ...trade,
      token: trade.token ?? null,
      current_sol_value: null,
      pnl_sol: null,
      pnl_percent: null
    };
  }

  const pnlSol = currentSolValue - trade.sol_amount;
  const pnlPercent = trade.sol_amount > 0 ? (pnlSol / trade.sol_amount) * 100 : null;
  return {
    ...trade,
    token: trade.token ?? null,
    current_sol_value: currentSolValue,
    pnl_sol: pnlSol,
    pnl_percent: pnlPercent
  };
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

function normalizeAutoTrade(row: Record<string, unknown>): PumpTrade & { token?: Pick<PumpToken, "symbol" | "name"> | null } {
  return {
    id: String(row.id),
    bot_project: asString(row.bot_project) || "",
    mention_id: String(row.mention_id),
    author_id: String(row.author_id),
    author_username: row.author_username == null ? null : String(row.author_username),
    author_followers: asNumber(row.author_followers),
    token_mint: String(row.token_mint),
    token_symbol: row.token_symbol == null ? null : String(row.token_symbol),
    token_decimals: asNumber(row.token_decimals),
    token_amount: asNumber(row.token_amount),
    sol_amount: asNumber(row.sol_amount) ?? 0,
    quote_amount_lamports: row.quote_amount_lamports == null ? null : String(row.quote_amount_lamports),
    status: String(row.status) as PumpTrade["status"],
    reason: row.reason == null ? null : String(row.reason),
    tx_signature: row.tx_signature == null ? null : String(row.tx_signature),
    executed_at: row.executed_at == null ? null : String(row.executed_at),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    token: row.token ? {
      symbol: asString((row.token as Record<string, unknown>).symbol),
      name: asString((row.token as Record<string, unknown>).name)
    } : null
  };
}

function normalizePumpSignal(row: Record<string, unknown>): PumpSignal {
  return {
    id: String(row.id),
    token_mint: String(row.token_mint),
    signal_type: String(row.signal_type) as PumpSignal["signal_type"],
    status: String(row.status) as PumpSignal["status"],
    thesis: asString(row.thesis) || "",
    trigger_price_usd: asNumber(row.trigger_price_usd),
    invalidation_price_usd: asNumber(row.invalidation_price_usd),
    confidence: asNumber(row.confidence) ?? 0,
    is_premium: asString(row.is_premium) ? asString(row.is_premium) === "true" : true,
    published_at: row.published_at == null ? null : String(row.published_at),
    created_at: String(row.created_at),
    token: row.token && !Array.isArray(row.token) ? {
      symbol: asString((row.token as Record<string, unknown>).symbol),
      name: asString((row.token as Record<string, unknown>).name),
      price_usd: asNumber((row.token as Record<string, unknown>).price_usd),
      dex_url: asString((row.token as Record<string, unknown>).dex_url)
    } : null
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
    autoTrades: [],
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

async function readProjectToken() {
  const tokenMint = pumpConfig.publicTokenMint || pumpConfig.tokenMint;
  if (!tokenMint) {
    return undefined;
  }

  const { data } = await getSupabase()
    .from("pump_tokens")
    .select("mint, symbol, name, price_usd, market_cap_usd, liquidity_usd, volume_24h_usd, updated_at")
    .eq("mint", tokenMint)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    return undefined;
  }

  return {
    mint: String(data.mint),
    symbol: data.symbol == null ? null : String(data.symbol),
    name: data.name == null ? null : String(data.name),
    price_usd: asNumber(data.price_usd),
    market_cap_usd: asNumber(data.market_cap_usd),
    liquidity_usd: asNumber(data.liquidity_usd),
    volume_24h_usd: asNumber(data.volume_24h_usd),
    updated_at: String(data.updated_at)
  };
}

export async function readTerminalData(): Promise<TerminalData> {
  if (!hasDatabaseConfig()) return emptyTerminal("Data service is not configured.");

  try {
    const db = getSupabase();
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const signalQuery = db.from("pump_signals")
      .select("*, token:pump_tokens(symbol,name,price_usd,dex_url)")
      .eq("status", "active")
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(20);

    const [tokens, signals, wallets, walletEvents, treasuryEvents, autoTradesRaw, marketCount, signalCount, walletCount, eventCount, projectToken] = await Promise.all([
      db.from("pump_tokens").select("*").eq("status", "active")
        .order("score", { ascending: false, nullsFirst: false }).limit(24),
      signalQuery,
      db.from("tracked_wallets").select("address,label,category,thesis,updated_at")
        .eq("active", true).order("label").limit(50),
      db.from("wallet_events")
        .select("*, wallet:tracked_wallets(label,category), token:pump_tokens(symbol,name,price_usd)")
        .order("block_time", { ascending: false }).limit(50),
      db.from("treasury_events").select("*").order("block_time", { ascending: false }).limit(20),
      db.from("pump_trades")
        .select("*, token:pump_tokens(symbol,name)")
        .order("created_at", { ascending: false })
        .limit(20),
      db.from("pump_tokens").select("mint", { count: "exact", head: true }).eq("status", "active"),
      db.from("pump_signals").select("id", { count: "exact", head: true })
        .eq("status", "active").not("published_at", "is", null),
      db.from("tracked_wallets").select("address", { count: "exact", head: true }).eq("active", true),
      db.from("wallet_events").select("id", { count: "exact", head: true }).gte("block_time", since),
      readProjectToken()
    ]);

    const firstError = [tokens, signals, wallets, walletEvents, treasuryEvents, autoTradesRaw, marketCount, signalCount, walletCount, eventCount]
      .find((result) => result.error)?.error;
    if (firstError) throw firstError;

    const normalizedTokens = (tokens.data ?? []).map((row) => normalizeToken(row as Record<string, unknown>));
    const rawAutoTrades = (autoTradesRaw.data ?? []).map((row) => normalizeAutoTrade(row as Record<string, unknown>));
    const autoTrades = await Promise.all(rawAutoTrades.map(async (trade) => {
      if (trade.status !== "executed" || !trade.token_mint || !trade.token_amount || trade.token_amount <= 0) {
        return {
          ...trade,
          current_sol_value: null,
          pnl_sol: null,
          pnl_percent: null
        } as AutoTradeLedgerTrade;
      }

      const currentValue = await fetchCurrentSolValue(trade.token_mint, trade.token_amount, trade.token_decimals ?? 0).catch(() => null);
      return addPnl(trade, currentValue) as AutoTradeLedgerTrade;
    }));

    const updatedAt = normalizedTokens.reduce<string | null>((latest, token) => {
      if (!latest || Date.parse(token.updated_at) > Date.parse(latest)) return token.updated_at;
      return latest;
    }, null);

    return {
      connected: true,
      updatedAt,
      projectToken: projectToken ?? undefined,
      tokens: normalizedTokens,
      signals: (signals.data ?? []).map((row) => normalizePumpSignal(row as Record<string, unknown>)),
      wallets: (wallets.data ?? []) as unknown as TrackedWallet[],
      walletEvents: (walletEvents.data ?? []) as unknown as WalletEvent[],
      treasuryEvents: (treasuryEvents.data ?? []) as unknown as TreasuryEvent[],
      autoTrades: autoTrades.sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at)),
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

function safeSortDate(left: string | null, right: string | null): number {
  if (!left && !right) return 0;
  if (!left) return -1;
  if (!right) return 1;
  return Date.parse(left) - Date.parse(right);
}

type CalloutTokenState = CalloutTokenPerformance & {
  _tokenSort: {
    latestSignalDate: string | null;
    lastTradeDate: string | null;
  };
  _tradePnls: number[];
};

type CallerState = CallerPerformance & {
  _pnlValues: number[];
};

function emptyCalloutData(error?: string) {
  return {
    connected: false,
    error,
    updatedAt: null,
    tokens: [],
    callers: [],
    trades: []
  };
}

export async function readCalloutEngineData(filters?: {
  tokenMint?: string;
  callerId?: string;
  since?: string;
  limit?: number;
}): Promise<CalloutEngineData> {
  if (!hasDatabaseConfig()) return emptyCalloutData("Data service is not configured.");

  try {
    const db = getSupabase();
    const limit = Math.max(10, Math.min(filters?.limit ?? 60, 120));
    const tokenMint = filters?.tokenMint?.trim();
    const callerId = filters?.callerId?.trim();
    const since = filters?.since?.trim();

    const signalQuery = db.from("pump_signals")
      .select("id, token_mint, signal_type, status, confidence, published_at, created_at, token:pump_tokens(symbol,name)")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (tokenMint) {
      signalQuery.eq("token_mint", tokenMint);
    }
    if (since) signalQuery.gte("created_at", since);

    const tradeQuery = db.from("pump_trades")
      .select("*, token:pump_tokens(symbol,name,price_usd)")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (tokenMint) tradeQuery.eq("token_mint", tokenMint);
    if (callerId) tradeQuery.ilike("author_id", callerId);
    if (since) tradeQuery.gte("created_at", since);

    const [signalRows, tradeRows] = await Promise.all([
      signalQuery,
      tradeQuery
    ]);

    if (signalRows.error) throw signalRows.error;
    if (tradeRows.error) throw tradeRows.error;

    const rawSignals = (signalRows.data ?? []).map((row) => normalizePumpSignal(row as Record<string, unknown>));
    const rawTrades = (tradeRows.data ?? []).map((row) => normalizeAutoTrade(row as Record<string, unknown>));
    const tradesWithPerformance = await Promise.all(rawTrades.map(async (trade) => {
      if (trade.status !== "executed" || !trade.token_mint || !trade.token_amount || trade.token_amount <= 0) {
        return {
          ...trade,
          current_sol_value: null,
          pnl_sol: null,
          pnl_percent: null
        } as AutoTradeLedgerTrade;
      }

      const currentValue = await fetchCurrentSolValue(trade.token_mint, trade.token_amount, trade.token_decimals ?? 0).catch(() => null);
      return addPnl(trade, currentValue) as AutoTradeLedgerTrade;
    }));

    const signalByToken = new Map<string, CalloutTokenState>();

    function ensureTokenEntry(tokenMint: string, symbol: string | null, name: string | null): CalloutTokenState {
      const existing = signalByToken.get(tokenMint);
      if (existing) {
        if (!existing.symbol && symbol) existing.symbol = symbol;
        if (!existing.name && name) existing.name = name;
        return existing;
      }

      const entry: CalloutTokenState = {
        token_mint: tokenMint,
        symbol,
        name,
        signal_count: 0,
        latest_signal_status: null,
        latest_signal_confidence: null,
        latest_signal_type: null,
        latest_signal_at: null,
        calls: 0,
        executed: 0,
        winRate: null,
        avgPnlPercent: null,
        bestPnlPercent: null,
        worstPnlPercent: null,
        lastTradeAt: null,
        _tokenSort: {
          latestSignalDate: null,
          lastTradeDate: null
        },
        _tradePnls: []
      };
      signalByToken.set(tokenMint, entry);
      return entry;
    }

    for (const signal of rawSignals as PumpSignal[]) {
      const symbol = signal.token?.symbol ?? null;
      const name = signal.token?.name ?? null;
      const entry = ensureTokenEntry(signal.token_mint, symbol, name);
      entry.signal_count += 1;

      const signalAt = signal.published_at ?? signal.created_at ?? null;
      if (!entry._tokenSort.latestSignalDate || safeSortDate(signalAt, entry._tokenSort.latestSignalDate) > 0) {
        entry.latest_signal_at = signalAt;
        entry._tokenSort.latestSignalDate = signalAt;
        entry.latest_signal_status = signal.status;
        entry.latest_signal_confidence = asNumber(signal.confidence);
        entry.latest_signal_type = signal.signal_type;
      }
    }

    const callerById = new Map<string, CallerState>();

    for (const trade of tradesWithPerformance) {
      const tokenSymbol = trade.token?.symbol ?? null;
      const tokenName = trade.token?.name ?? null;
      const tokenEntry = ensureTokenEntry(trade.token_mint, tokenSymbol, tokenName);
      tokenEntry.calls += 1;
      tokenEntry._tokenSort.lastTradeDate = tokenEntry.lastTradeAt = trade.created_at;

      if (trade.status === "executed") {
        tokenEntry.executed += 1;
      }

      if (trade.status === "executed" && trade.pnl_percent != null) {
        tokenEntry._tradePnls.push(trade.pnl_percent);
      }

      const callerKey = trade.author_id;
      const caller = callerById.get(callerKey);
      const callerValue = caller ?? {
        author_id: trade.author_id,
        author_username: trade.author_username,
        calls: 0,
        executed: 0,
        winRate: null,
        avgPnlPercent: null,
        bestPnlPercent: null,
        worstPnlPercent: null,
        totalSolAllocated: 0,
        lastCallAt: null,
        _pnlValues: []
      };

      callerValue.calls += 1;
      callerValue.totalSolAllocated += trade.sol_amount;
      if (trade.status === "executed") {
        callerValue.executed += 1;
      }

      if (!callerValue.lastCallAt || Date.parse(trade.created_at) > Date.parse(callerValue.lastCallAt)) {
        callerValue.lastCallAt = trade.created_at;
      }

      if (trade.status === "executed" && trade.pnl_percent != null) {
        callerValue._pnlValues.push(trade.pnl_percent);
      }

      callerById.set(callerKey, callerValue);
    }

    const tokenRows = Array.from(signalByToken.values()).map((entry) => {
      const pnlValues = entry._tradePnls;
      const wins = pnlValues.filter((value) => value > 0).length;
      const avg = pnlValues.length ? pnlValues.reduce((total, value) => total + value, 0) / pnlValues.length : null;
      const best = pnlValues.length ? Math.max(...pnlValues) : null;
      const worst = pnlValues.length ? Math.min(...pnlValues) : null;
      const winRate = pnlValues.length ? (wins / pnlValues.length) * 100 : null;

      return {
        token_mint: entry.token_mint,
        symbol: entry.symbol,
        name: entry.name,
        signal_count: entry.signal_count,
        latest_signal_status: entry.latest_signal_status,
        latest_signal_confidence: entry.latest_signal_confidence,
        latest_signal_type: entry.latest_signal_type,
        latest_signal_at: entry.latest_signal_at,
        calls: entry.calls,
        executed: entry.executed,
        winRate,
        avgPnlPercent: avg,
        bestPnlPercent: best,
        worstPnlPercent: worst,
        lastTradeAt: entry.lastTradeAt
      };
    });

    const callerRows = Array.from(callerById.values()).map((caller) => {
      const pnlValues = caller._pnlValues;
      const wins = pnlValues.filter((value) => value > 0).length;
      const avg = pnlValues.length ? pnlValues.reduce((total, value) => total + value, 0) / pnlValues.length : null;
      const best = pnlValues.length ? Math.max(...pnlValues) : null;
      const worst = pnlValues.length ? Math.min(...pnlValues) : null;
      const winRate = pnlValues.length ? (wins / pnlValues.length) * 100 : null;

      return {
        author_id: caller.author_id,
        author_username: caller.author_username,
        calls: caller.calls,
        executed: caller.executed,
        winRate,
        avgPnlPercent: avg,
        bestPnlPercent: best,
        worstPnlPercent: worst,
        totalSolAllocated: caller.totalSolAllocated,
        lastCallAt: caller.lastCallAt
      };
    });

    const sortedTokenRows = tokenRows.sort((left, right) => {
      const bySignal = right.signal_count - left.signal_count;
      if (bySignal !== 0) return bySignal;
      const rightDate = right.lastTradeAt ?? right.latest_signal_at;
      const leftDate = left.lastTradeAt ?? left.latest_signal_at;
      if (!leftDate && !rightDate) return 0;
      if (!leftDate) return 1;
      if (!rightDate) return -1;
      return Date.parse(rightDate) - Date.parse(leftDate);
    });

    const sortedCallerRows = callerRows.sort((left, right) => {
      const winDiff = (right.winRate ?? -1) - (left.winRate ?? -1);
      if (winDiff !== 0) return winDiff;
      return (right.avgPnlPercent ?? -1e9) - (left.avgPnlPercent ?? -1e9);
    });

    const updatedAt = (() => {
      const allTimes = [
        ...rawSignals.map((signal) => signal.published_at ?? signal.created_at),
        ...tradesWithPerformance.map((trade) => trade.updated_at),
      ].filter(Boolean) as string[];
      return allTimes.reduce<string | null>((latest, value) => {
        if (!latest || Date.parse(value) > Date.parse(latest)) return value;
        return latest;
      }, null);
    })();

    return {
      connected: true,
      updatedAt,
      tokens: sortedTokenRows,
      callers: sortedCallerRows,
      trades: tradesWithPerformance.sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at))
    };
  } catch (error) {
    return emptyCalloutData(error instanceof Error ? error.message : "Data service unavailable.");
  }
}
