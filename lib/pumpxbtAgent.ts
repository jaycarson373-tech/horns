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

function fitReply(lines: string[]) {
  const disclaimer = "Public data only. Not financial advice.";
  while ([...lines, disclaimer].join("\n").length > 280 && lines.length > 2) {
    lines.splice(lines.length - 2, 1);
  }
  const reply = [...lines, disclaimer].join("\n");
  return reply.length <= 280 ? reply : `${reply.slice(0, 276)}...`;
}

async function resolveToken(text: string) {
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
  const { token, queuedMint, ambiguous, unsupportedMint } = await resolveToken(text);
  if (unsupportedMint) {
    return `PumpXBT covers Pump tokens only. Send a Solana Pump mint ending in ${pumpConfig.tokenSuffix}, or one indexed $TICKER.`;
  }
  if (ambiguous) {
    return "PumpXBT found multiple markets for that ticker. Reply with the Solana mint so I do not analyze the wrong token.";
  }
  if (queuedMint) {
    return `PumpXBT queued ${queuedMint.slice(0, 4)}...${queuedMint.slice(-4)} for verification. No market call until liquidity and flow data clear.`;
  }
  if (!token) {
    return "Tag me with one pump token mint or one $TICKER. I reply with verified market structure and only surface manually approved high-conviction calls.";
  }

  const signal = await findActiveSignal(token.mint);
  const buys = token.buys_1h == null ? "--" : String(token.buys_1h);
  const sells = token.sells_1h == null ? "--" : String(token.sells_1h);
  const setup = signal ? `HC CALL ACTIVE · ${signal.confidence}/100` : "NO HIGH-CONVICTION CALL";
  return fitReply([
    `${tokenLabel(token)} · PUMPXBT`,
    `MC ${money(token.market_cap_usd)} · LIQ ${money(token.liquidity_usd)} · V1H ${money(token.volume_1h_usd)}`,
    `1H ${percent(token.price_change_1h)} · B/S ${buys}/${sells} · SCORE ${token.score ?? "--"}`,
    setup
  ]);
}
