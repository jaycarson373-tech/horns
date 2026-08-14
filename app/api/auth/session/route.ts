import { NextRequest, NextResponse } from "next/server";

import { ACCESS_COOKIE, parseAccessToken } from "../../../../lib/access";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = parseAccessToken(request.cookies.get(ACCESS_COOKIE)?.value);
  return NextResponse.json(session
    ? { authenticated: true, wallet: session.wallet, expiresAt: new Date(session.exp).toISOString() }
    : { authenticated: false });
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(ACCESS_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
