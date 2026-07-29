import { createClient } from "@supabase/supabase-js";

export type Donation = {
  signature: string;
  block_time: string;
  amount_lamports: number;
  token: "SOL" | "USDC";
  usd_at_time: number | null;
  memo: string | null;
};

function db() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase server credentials are missing");
  }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export const donationsEnabled = () => process.env.DONATIONS_ENABLED?.toLowerCase() === "true";

export async function readDonations(limit = 20): Promise<Donation[]> {
  if (!donationsEnabled()) return [];
  const { data, error } = await db().from("donations")
    .select("signature,block_time,amount_lamports,token,usd_at_time,memo")
    .order("block_time", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as Donation[];
}

type HeliusTx = {
  signature: string; timestamp: number; description?: string;
  nativeTransfers?: Array<{ fromUserAccount: string; toUserAccount: string; amount: number }>;
  tokenTransfers?: Array<{ fromUserAccount: string; toUserAccount: string; mint: string; tokenAmount: number }>;
};
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

async function priceAt(token: "SOL" | "USDC", timestamp: number) {
  try {
    const id = token === "SOL" ? "solana" : "usd-coin";
    const response = await fetch(`https://api.coingecko.com/api/v3/coins/${id}/market_chart/range?vs_currency=usd&from=${timestamp - 3600}&to=${timestamp + 3600}`, { cache: "no-store" });
    if (!response.ok) return null;
    const prices = ((await response.json()) as { prices?: Array<[number, number]> }).prices ?? [];
    if (!prices.length) return null;
    return prices.reduce((a, b) => Math.abs(a[0] / 1000 - timestamp) < Math.abs(b[0] / 1000 - timestamp) ? a : b)[1];
  } catch { return null; }
}

export async function refreshDonations() {
  const key = process.env.HELIUS_API_KEY;
  const source = process.env.CREATOR_FEE_WALLET;
  const destination = process.env.DONATION_DESTINATION_WALLET;
  if (!donationsEnabled()) return { upserted: 0 };
  if (!key || !source || !destination) throw new Error("Donation refresh variables are incomplete");
  const response = await fetch(`https://api.helius.xyz/v0/addresses/${source}/transactions?api-key=${key}&type=TRANSFER&limit=100`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Helius returned ${response.status}`);
  const rows: Donation[] = [];
  for (const tx of await response.json() as HeliusTx[]) {
    const sol = tx.nativeTransfers?.find((x) => x.fromUserAccount === source && x.toUserAccount === destination);
    const usdc = tx.tokenTransfers?.find((x) => x.fromUserAccount === source && x.toUserAccount === destination && x.mint === USDC_MINT);
    const token = sol ? "SOL" : usdc ? "USDC" : null;
    const raw = sol?.amount ?? usdc?.tokenAmount;
    if (!token || raw == null) continue;
    const amount = token === "SOL" ? raw / 1_000_000_000 : raw;
    const price = await priceAt(token, tx.timestamp);
    rows.push({
      signature: tx.signature, block_time: new Date(tx.timestamp * 1000).toISOString(),
      amount_lamports: raw, token, usd_at_time: price == null ? null : amount * price,
      memo: tx.description ?? null
    });
  }
  if (rows.length) {
    const { error } = await db().from("donations").upsert(rows, { onConflict: "signature" });
    if (error) throw error;
  }
  return { upserted: rows.length };
}
