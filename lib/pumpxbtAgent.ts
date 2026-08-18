import {
  findActiveSignal,
  findPumpTokenByMint,
  findPumpTokensBySymbol,
  queuePumpToken,
  type PumpToken
} from "./pumpData";
import { pumpConfig } from "./pumpConfig";

const SOLANA_MINT = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/;
const CASHTAG = /\$([A-Za-z][A-Za-z0-9]{1,9})\b/;

function money(value: number | null) {
  if (value == null) return "--";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  return `$${value.toPrecision(3)}`;
}

function percent(value: number | null) {
  if (value == null) return "--";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function tokenLabel(token: PumpToken) {
  return token.symbol ? `$${token.symbol.toUpperCase()}` : `${token.mint.slice(0, 4)}...${token.mint.slice(-4)}`;
}

export type CalloutResolution = {
  token: PumpToken | null;
  queuedMint: string | null;
  ambiguous: boolean;
  unsupportedMint: boolean;
};

function fitReply(lines: string[]) {
  const disclaimer = "Public data only. Not financial advice.";
  while ([...lines, disclaimer].join("\n").length > 280 && lines.length > 2) {
    lines.splice(lines.length - 2, 1);
  }
  const reply = [...lines, disclaimer].join("\n");
  return reply.length <= 280 ? reply : `${reply.slice(0, 276)}...`;
}

export async function resolveCalloutToken(text: string): Promise<CalloutResolution> {
  const mint = text.match(SOLANA_MINT)?.[0];
  if (mint) {
    if (!mint.toLowerCase().endsWith(pumpConfig.tokenSuffix)) {
      return { token: null, queuedMint: null, ambiguous: false, unsupportedMint: true };
    }
    const token = await findPumpTokenByMint(mint);
    if (!token) await queuePumpToken(mint);
    return { token, queuedMint: token ? null : mint, ambiguous: false, unsupportedMint: false };
  }

  const symbol = text.match(CASHTAG)?.[1];
  if (!symbol) return { token: null, queuedMint: null, ambiguous: false, unsupportedMint: false };
  const matches = await findPumpTokensBySymbol(symbol);
  return {
    token: matches.length === 1 ? matches[0] : null,
    queuedMint: null,
    ambiguous: matches.length > 1,
    unsupportedMint: false
  };
}

export async function buildPumpXbtReply(text: string) {
  const { token, queuedMint, ambiguous, unsupportedMint } = await resolveCalloutToken(text);
  if (unsupportedMint) {
    return `PumpXBT is a Pump.fun callout engine, not a general finance bot. Send a mint ending in ${pumpConfig.tokenSuffix}, or indexed $TICKER.`;
  }
  if (ambiguous) {
    return "Multiple matches found for that ticker. Hit me with the exact Solana mint so I route the right callout immediately.";
  }
  if (queuedMint) {
    return `Mint ${queuedMint.slice(0, 4)}...${queuedMint.slice(-4)} queued. Running Pump.fun index check before I publish a signal.`;
  }
  if (!token) {
    return "Tag me with one Pump.fun mint or one $TICKER. I track verified callers, rank conviction, and auto-report active setups.";
  }

  const signal = await findActiveSignal(token.mint);
  const buys = token.buys_1h == null ? "--" : String(token.buys_1h);
  const sells = token.sells_1h == null ? "--" : String(token.sells_1h);
  const setup = signal ? `AI CALL ACTIVE · ${signal.confidence}/100` : "NO HIGH-CONVICTION CALL";
  const source = signal ? "verified caller set" : "awaiting validated signal";
  return fitReply([
    `${tokenLabel(token)} · PumpXBT`,
    `MC ${money(token.market_cap_usd)} · LIQ ${money(token.liquidity_usd)} · V1H ${money(token.volume_1h_usd)}`,
    `${source} · 1H ${percent(token.price_change_1h)} · B/S ${buys}/${sells} · SCORE ${token.score ?? "--"}`,
    `${setup} · BUYBACK + BURN LOOP`
  ]);
}
