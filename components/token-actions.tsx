"use client";

import { useEffect, useState } from "react";

export function TokenActions({ mint, buyUrl }: { mint: string; buyUrl: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(mint);
    } catch {
      const input = document.createElement("textarea");
      input.value = mint;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setCopied(true);
  }

  return (
    <div className="token-actions">
      <button type="button" onClick={copy} title="Copy full token address"><span>CA</span>{copied ? "COPIED" : `${mint.slice(0, 4)}...${mint.slice(-4)}`}</button>
      <a href={`https://solscan.io/token/${encodeURIComponent(mint)}`} target="_blank" rel="noreferrer">SOLSCAN ↗</a>
      <a className="buy-action" href={buyUrl} target="_blank" rel="noreferrer">BUY ↗</a>
    </div>
  );
}

