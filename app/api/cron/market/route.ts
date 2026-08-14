import { NextResponse } from "next/server";

import { runMarketIngest } from "../../../../lib/marketIngest";
import { cronAuthorized } from "../../../../lib/pumpConfig";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await runMarketIngest());
  } catch (error) {
    console.error("pumpxbt.market_ingest.failed", error);
    return NextResponse.json({ error: "Market ingest failed" }, { status: 500 });
  }
}
