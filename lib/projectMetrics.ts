import { PublicKey } from "@solana/web3.js";

import { pumpConfig } from "./pumpConfig";

type DexPair = {
  baseToken?: { address?: string };
  chainId?: string;
  liquidity?: { usd?: number };
  priceUsd?: string;
};

type RpcBalanceResponse = {
  result?: {
    value?: number;
  };
};

export type ProjectMetrics = {
  priceUsd: number | null;
  creatorWallet: string | null;
  creatorWalletSol: number | null;
};

function finite(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function readProjectPrice() {
  const mint = pumpConfig.publicTokenMint || pumpConfig.tokenMint;
  if (!mint) return null;

  try {
    const response = await fetch(`${pumpConfig.dexScreenerBaseUrl}/tokens/v1/solana/${encodeURIComponent(mint)}`, {
      headers: { Accept: "application/json", "User-Agent": "pumpxbt-site/0.1.0" },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(10_000)
    });
    if (!response.ok) return null;
    const pairs = await response.json() as DexPair[];
    const pair = pairs
      .filter((item) => item.chainId === "solana" && item.baseToken?.address === mint)
      .sort((left, right) => (finite(right.liquidity?.usd) ?? 0) - (finite(left.liquidity?.usd) ?? 0))[0];
    return finite(pair?.priceUsd);
  } catch {
    return null;
  }
}

async function readCreatorWalletSol() {
  const address = pumpConfig.creatorWallet;
  if (!address) return null;

  try {
    const publicKey = new PublicKey(address).toBase58();
    const response = await fetch(pumpConfig.balanceRpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: "pumpxbt-balance", method: "getBalance", params: [publicKey, { commitment: "confirmed" }] }),
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(10_000)
    });
    if (!response.ok) return null;
    const payload = await response.json() as RpcBalanceResponse;
    const lamports = finite(payload.result?.value);
    return lamports == null ? null : lamports / 1_000_000_000;
  } catch {
    return null;
  }
}

export async function readProjectMetrics(): Promise<ProjectMetrics> {
  const [priceUsd, creatorWalletSol] = await Promise.all([
    readProjectPrice(),
    readCreatorWalletSol()
  ]);

  return {
    priceUsd,
    creatorWallet: pumpConfig.creatorWallet || null,
    creatorWalletSol
  };
}
