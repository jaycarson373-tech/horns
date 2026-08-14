import { NextResponse } from "next/server";

import {
  ACCESS_COOKIE,
  createAccessToken,
  readAccessTokenBalance,
  validateSolanaAddress,
  verifyWalletSignature
} from "../../../../lib/access";
import { pumpConfig } from "../../../../lib/pumpConfig";
import { getSupabase } from "../../../../lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { challengeId?: unknown; wallet?: unknown; signature?: unknown };
    const challengeId = typeof body.challengeId === "string" ? body.challengeId : "";
    const wallet = typeof body.wallet === "string" ? body.wallet.trim() : "";
    const signature = typeof body.signature === "string" ? body.signature : "";
    if (!challengeId || !signature || !validateSolanaAddress(wallet)) {
      return NextResponse.json({ error: "Invalid verification request." }, { status: 400 });
    }

    const db = getSupabase();
    const { data: challenge, error } = await db.from("access_challenges")
      .select("id,wallet,message,expires_at,used_at")
      .eq("id", challengeId)
      .maybeSingle();
    if (error) throw error;
    if (!challenge || challenge.wallet !== wallet || challenge.used_at || Date.parse(challenge.expires_at) <= Date.now()) {
      return NextResponse.json({ error: "This signing request expired. Try again." }, { status: 400 });
    }
    if (!verifyWalletSignature(wallet, challenge.message, signature)) {
      return NextResponse.json({ error: "Wallet signature could not be verified." }, { status: 401 });
    }

    const balance = await readAccessTokenBalance(wallet);
    if (!balance.eligible) {
      return NextResponse.json({
        error: `This wallet does not hold the required ${pumpConfig.accessThresholdTokens.toLocaleString("en-US")} tokens.`
      }, { status: 403 });
    }

    const { data: used, error: updateError } = await db.from("access_challenges")
      .update({ used_at: new Date().toISOString() })
      .eq("id", challengeId)
      .is("used_at", null)
      .select("id")
      .maybeSingle();
    if (updateError) throw updateError;
    if (!used) return NextResponse.json({ error: "This signing request was already used." }, { status: 409 });

    const response = NextResponse.json({ authenticated: true, wallet, expiresInMinutes: pumpConfig.sessionMinutes });
    response.cookies.set(ACCESS_COOKIE, createAccessToken(wallet, balance.amountRaw, balance.decimals), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: pumpConfig.sessionMinutes * 60
    });
    return response;
  } catch (error) {
    console.error("pumpxbt.access.verify_failed", error);
    return NextResponse.json({ error: "Access verification failed." }, { status: 503 });
  }
}
