"use client";

import { useEffect, useState } from "react";

export function ContractAddress({ mint, pumpFunUrl, compact = false }: { mint: string; pumpFunUrl?: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  function legacyCopy() {
    const input = document.createElement("textarea");
    input.value = mint;
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }

  async function copy() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await Promise.race([
        navigator.clipboard.writeText(mint),
        new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error("Clipboard API timed out")), 500))
      ]);
    } catch {
      legacyCopy();
    }
    setCopied(true);
  }

  return (
    <div className={compact ? "contract-address compact" : "contract-address"}>
      <div><strong>$PUMPXBT</strong><code>{mint}</code></div>
      <div className="contract-actions">
        <button type="button" onClick={copy} title="Copy full contract address" aria-label="Copy PumpXBT contract address">{copied ? "COPIED" : "COPY CA"}</button>
        {pumpFunUrl ? <a href={pumpFunUrl} target="_blank" rel="noreferrer">VIEW ON PUMP.FUN ↗</a> : null}
      </div>
    </div>
  );
}
