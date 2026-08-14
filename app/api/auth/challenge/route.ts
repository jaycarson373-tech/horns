import { NextResponse } from "next/server";

import { createChallengeMessage, validateSolanaAddress } from "../../../../lib/access";
import { getSupabase } from "../../../../lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { wallet?: unknown };
    const wallet = typeof body.wallet === "string" ? body.wallet.trim() : "";
    if (!validateSolanaAddress(wallet)) {
      return NextResponse.json({ error: "Enter a valid Solana wallet." }, { status: 400 });
    }

    const since = new Date(Date.now() - 5 * 60_000).toISOString();
    const { count, error: countError } = await getSupabase().from("access_challenges")
      .select("id", { count: "exact", head: true })
      .eq("wallet", wallet)
      .gte("created_at", since);
    if (countError) throw countError;
    if ((count ?? 0) >= 5) {
      return NextResponse.json({ error: "Too many signing requests. Try again in a few minutes." }, { status: 429 });
    }

    const { nonce, message } = createChallengeMessage(wallet, new URL(request.url).host);
    const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
    const { data, error } = await getSupabase().from("access_challenges").insert({
      wallet,
      nonce,
      message,
      expires_at: expiresAt
    }).select("id").single();
    if (error) throw error;
    return NextResponse.json({ challengeId: data.id, message, expiresAt });
  } catch (error) {
    console.error("pumpxbt.access.challenge_failed", error);
    return NextResponse.json({ error: "Access verification is unavailable." }, { status: 503 });
  }
}
