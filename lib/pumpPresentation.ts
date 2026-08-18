import type {
  CalloutEngineData,
  PumpSignal,
  PumpToken,
  TerminalData,
  WalletEvent
} from "./pumpData";

export function formatUsd(value: number | null) {
  if (value == null) return "--";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  if (value >= 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(8)}`;
}

export function formatPercent(value: number | null) {
  if (value == null) return "--";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function formatSol(value: number | null) {
  if (value == null) return "--";
  return `${value < 0.01 ? value.toFixed(4) : value.toFixed(2)} SOL`;
}

export function relativeTime(value: string | null) {
  if (!value) return "--";
  const elapsed = Math.max(0, Date.now() - Date.parse(value));
  if (elapsed < 60_000) return "now";
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m`;
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)}h`;
  return `${Math.floor(elapsed / 86_400_000)}d`;
}

export function shortAddress(value: string) {
  return value.length > 14 ? `${value.slice(0, 5)}...${value.slice(-4)}` : value;
}

export function tokenName(token: Pick<PumpToken, "symbol" | "mint">) {
  return token.symbol ? `$${token.symbol.toUpperCase()}` : shortAddress(token.mint);
}

export function signalCategory(signal: PumpSignal) {
  const thesis = signal.thesis.toLowerCase();
  if (thesis.includes("wallet") || thesis.includes("accumul")) return "Smart Money";
  if (thesis.includes("caller") || thesis.includes("converg")) return "Caller Convergence";
  if (thesis.includes("volume")) return "Volume Breakout";
  if (thesis.includes("risk") || signal.status === "invalidated") return "Risk";
  return signal.signal_type === "high_conviction" ? "High Confidence" : "Momentum";
}

export type TerminalMarketRow = PumpToken & {
  smartWallets: number;
  callers: number;
};

export function buildMarketRows(data: TerminalData, engine: CalloutEngineData): TerminalMarketRow[] {
  const walletSets = new Map<string, Set<string>>();
  for (const event of data.walletEvents) {
    const wallets = walletSets.get(event.token_mint) ?? new Set<string>();
    wallets.add(event.wallet_address);
    walletSets.set(event.token_mint, wallets);
  }
  const callers = new Map(engine.tokens.map((token) => [token.token_mint, token.calls]));
  return data.tokens.map((token) => ({
    ...token,
    smartWallets: walletSets.get(token.mint)?.size ?? 0,
    callers: callers.get(token.mint) ?? 0
  }));
}

export type XbtRead = {
  label: string;
  headline: string;
  detail: string;
  tokens: string[];
};

export function buildXbtReads(data: TerminalData, engine: CalloutEngineData): XbtRead[] {
  const scored = data.tokens.filter((token) => token.score != null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const positive = data.tokens.filter((token) => (token.price_change_1h ?? 0) > 0);
  const volume = [...data.tokens].filter((token) => token.volume_1h_usd != null).sort((a, b) => (b.volume_1h_usd ?? 0) - (a.volume_1h_usd ?? 0));
  const reads: XbtRead[] = [];

  if (scored.length) {
    reads.push({
      label: "XBT / MARKET READ",
      headline: `${tokenName(scored[0])} leads the current quality screen.`,
      detail: `XBT score ${scored[0].score?.toFixed(0)} with ${formatUsd(scored[0].liquidity_usd)} liquidity and ${formatUsd(scored[0].volume_1h_usd)} one-hour volume.`,
      tokens: scored.slice(0, 3).map(tokenName)
    });
  }
  if (data.tokens.length) {
    reads.push({
      label: "XBT / MOMENTUM",
      headline: `${positive.length} of ${data.tokens.length} tracked markets are positive over one hour.`,
      detail: positive.length > data.tokens.length / 2 ? "Breadth is constructive across the current Pump.fun screen." : "Breadth remains selective. Conviction is concentrated, not market-wide.",
      tokens: positive.slice(0, 3).map(tokenName)
    });
  }
  if (volume.length) {
    reads.push({
      label: "XBT / FLOW",
      headline: `${tokenName(volume[0])} is the one-hour volume leader.`,
      detail: `${formatUsd(volume[0].volume_1h_usd)} traded in the indexed pair. Buy/sell count: ${volume[0].buys_1h ?? "--"}/${volume[0].sells_1h ?? "--"}.`,
      tokens: volume.slice(0, 3).map(tokenName)
    });
  }
  if (engine.tokens.length) {
    const called = engine.tokens[0];
    reads.push({
      label: "XBT / CALLOUTS",
      headline: `${called.symbol ? `$${called.symbol.toUpperCase()}` : shortAddress(called.token_mint)} has the strongest caller convergence.`,
      detail: `${called.calls} tracked calls, ${called.executed} recorded fills, ${called.winRate == null ? "no resolved hit rate yet" : `${called.winRate.toFixed(1)}% current hit rate`}.`,
      tokens: engine.tokens.slice(0, 3).map((token) => token.symbol ? `$${token.symbol.toUpperCase()}` : shortAddress(token.token_mint))
    });
  }
  return reads;
}

export type WalletCluster = {
  tokenMint: string;
  token: string;
  walletCount: number;
  buyCount: number;
  latest: string;
};

export function buildWalletClusters(events: WalletEvent[]): WalletCluster[] {
  const groups = new Map<string, { token: string; wallets: Set<string>; buys: number; latest: string }>();
  for (const event of events) {
    const token = event.token?.symbol ? `$${event.token.symbol.toUpperCase()}` : shortAddress(event.token_mint);
    const current = groups.get(event.token_mint) ?? { token, wallets: new Set<string>(), buys: 0, latest: event.block_time };
    current.wallets.add(event.wallet_address);
    if (event.direction === "buy") current.buys += 1;
    if (Date.parse(event.block_time) > Date.parse(current.latest)) current.latest = event.block_time;
    groups.set(event.token_mint, current);
  }
  return [...groups.entries()]
    .map(([tokenMint, value]) => ({ tokenMint, token: value.token, walletCount: value.wallets.size, buyCount: value.buys, latest: value.latest }))
    .sort((a, b) => b.walletCount - a.walletCount || Date.parse(b.latest) - Date.parse(a.latest));
}
