import Link from "next/link";

import { pumpConfig } from "@/lib/pumpConfig";
import { ContractAddress } from "./contract-address";

export function ProductFooter() {
  const botHandle = pumpConfig.botHandle;
  const tokenMint = pumpConfig.tokenMint || pumpConfig.publicTokenMint;
  return (
    <footer className="product-footer">
      <div className="footer-meta">
        <span>PUMPXBT / PUMP.FUN INTELLIGENCE LAYER</span>
        <nav><Link href="/terminal">Terminal</Link><Link href="/docs">Docs</Link><Link href="/treasury">Treasury</Link>{botHandle ? <a href={`https://x.com/${botHandle}`} target="_blank" rel="noreferrer">X ↗</a> : null}</nav>
        <small>Public market data. Not financial advice.</small>
      </div>
      {tokenMint ? <ContractAddress mint={tokenMint} pumpFunUrl={pumpConfig.pumpFunTokenUrl} compact /> : null}
    </footer>
  );
}
