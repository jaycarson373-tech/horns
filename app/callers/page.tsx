import Link from "next/link";

import { CallerTable } from "@/components/caller-table";
import { SectionHeading } from "@/components/section-heading";
import { readCalloutEngineData } from "@/lib/pumpData";
import { relativeTime } from "@/lib/pumpPresentation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Top Callers | PumpXBT" };

const RANGES = { "24H": 1, "7D": 7, "30D": 30, "ALL TIME": 0 } as const;

export default async function CallersPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const params = await searchParams;
  const selected = Object.hasOwn(RANGES, params.range || "") ? params.range as keyof typeof RANGES : "7D";
  const days = RANGES[selected];
  const since = days ? new Date(Date.now() - days * 86_400_000).toISOString() : undefined;
  const engine = await readCalloutEngineData({ since, limit: 120 });
  return <main className="route-page page-width"><div className="route-intro"><SectionHeading eyebrow="PUMPXBT / CALLER INTELLIGENCE" title="KNOW WHO ACTUALLY MAKES GOOD CALLS" description="Ranked by recorded outcomes, not audience size." /><div className="route-status"><span><i className={engine.connected ? "live" : ""} />CALLER INDEX</span><strong>{engine.callers.length} TRACKED</strong><strong>UPDATED {relativeTime(engine.updatedAt).toUpperCase()}</strong></div></div><div className="range-tabs">{Object.keys(RANGES).map((range) => <Link key={range} aria-current={selected === range ? "page" : undefined} href={`/callers?range=${encodeURIComponent(range)}`}>{range}</Link>)}</div><CallerTable callers={engine.callers} /></main>;
}
