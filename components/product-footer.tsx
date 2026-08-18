import Link from "next/link";

import { pumpConfig } from "@/lib/pumpConfig";

export function ProductFooter() {
  const botHandle = pumpConfig.botHandle;
  return (
    <footer className="product-footer">
      <span>PUMPXBT / PUMP.FUN INTELLIGENCE AGENT</span>
      <nav><Link href="/docs">Docs</Link><Link href="/treasury">Treasury</Link>{botHandle ? <a href={`https://x.com/${botHandle}`} target="_blank" rel="noreferrer">X ↗</a> : null}</nav>
      <small>Public market data. Not financial advice.</small>
    </footer>
  );
}
