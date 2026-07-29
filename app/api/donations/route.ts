import { NextResponse } from "next/server";
import { donationsEnabled, readDonations, refreshDonations } from "../../../lib/donations";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!donationsEnabled()) return NextResponse.json({ enabled: false }, { status: 404 });
  const authorization = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authorization === `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(await refreshDonations());
  }
  return NextResponse.json({ enabled: true, donations: await readDonations() });
}

export async function POST(request: Request) {
  if (!donationsEnabled()) return NextResponse.json({ enabled: false }, { status: 404 });
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await refreshDonations());
}
