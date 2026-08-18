import { PublicKey } from "@solana/web3.js";

import { pumpConfig } from "./pumpConfig";

type DexPair = {
  chainId?: string;
  dexId?: string;
  baseToken?: { address?: string };
};

const PUMP_DEX_IDS = new Set(["pumpfun", "pumpswap"]);

export function hasVerifiedPumpMarket(mint: string, pairs: DexPair[]) {
  return pairs.some((pair) => pair.chainId === "solana"
    && pair.baseToken?.address === mint
    && PUMP_DEX_IDS.has(pair.dexId?.toLowerCase() ?? ""));
}

export async function isVerifiedPumpMint(mint: string) {
  try {
    const publicKey = new PublicKey(mint).toBase58();
    const response = await fetch(`${pumpConfig.dexScreenerBaseUrl}/tokens/v1/solana/${encodeURIComponent(publicKey)}`, {
      headers: { Accept: "application/json", "User-Agent": "pumpxbt-agent/0.1.0" },
      signal: AbortSignal.timeout(10_000)
    });
    if (!response.ok) return false;
    return hasVerifiedPumpMarket(publicKey, await response.json() as DexPair[]);
  } catch {
    return false;
  }
}
