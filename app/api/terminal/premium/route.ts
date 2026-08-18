import { NextResponse } from "next/server";
import { readTerminalData } from "../../../../lib/pumpData";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ data: await readTerminalData() });
}
