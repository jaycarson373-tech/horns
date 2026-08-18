import { SectionHeading } from "@/components/section-heading";
import { SignalBoard } from "@/components/signal-board";
import { readTerminalData } from "@/lib/pumpData";
import { relativeTime } from "@/lib/pumpPresentation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Signals | PumpXBT" };

export default async function SignalsPage() {
  const data = await readTerminalData();
  return <main className="route-page page-width"><div className="route-intro"><SectionHeading eyebrow="PUMPXBT / XBT SIGNALS" title="SIGNALS, NOT NOISE" description="Reviewed market setups with visible evidence, confidence, and status." /><div className="route-status"><span><i className={data.connected ? "live" : ""} />XBT MONITOR</span><strong>{data.signals.length} ACTIVE</strong><strong>UPDATED {relativeTime(data.updatedAt).toUpperCase()}</strong></div></div><SignalBoard signals={data.signals} /></main>;
}
