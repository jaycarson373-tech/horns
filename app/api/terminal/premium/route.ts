import { NextRequest, NextResponse } from "next/server";

import { ACCESS_COOKIE, parseAccessToken } from "../../../../lib/access";
import { readTerminalData } from "../../../../lib/pumpData";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = parseAccessToken(request.cookies.get(ACCESS_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Token-gated access required." }, { status: 401 });
  return NextResponse.json({ session: { wallet: session.wallet, expiresAt: new Date(session.exp).toISOString() }, data: await readTerminalData(true) });
}
