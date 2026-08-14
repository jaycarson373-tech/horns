"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type WalletProvider = {
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  publicKey?: { toString: () => string };
  signMessage: (message: Uint8Array, encoding?: string) => Promise<{ signature: Uint8Array } | Uint8Array>;
};

type AccessPanelProps = {
  configured: boolean;
  threshold: number;
  session: { wallet: string; verifiedBalance: string } | null;
};

function shortWallet(wallet: string) {
  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}

function toBase64(value: Uint8Array) {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return window.btoa(binary);
}

export function AccessPanel({ configured, threshold, session }: AccessPanelProps) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "connecting" | "signing">("idle");
  const [message, setMessage] = useState("");

  async function unlock() {
    setMessage("");
    try {
      if (!configured) throw new Error("Access verification is not configured yet.");
      const provider = (window as typeof window & { solana?: WalletProvider }).solana;
      if (!provider?.connect || !provider.signMessage) {
        throw new Error("Open this page in a Solana wallet browser or install a compatible wallet.");
      }

      setState("connecting");
      const connection = await provider.connect();
      const wallet = connection.publicKey?.toString() ?? provider.publicKey?.toString();
      if (!wallet) throw new Error("Wallet connection did not return an address.");
      const challengeResponse = await fetch("/api/auth/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet })
      });
      const challenge = await challengeResponse.json() as { challengeId?: string; message?: string; error?: string };
      if (!challengeResponse.ok || !challenge.challengeId || !challenge.message) {
        throw new Error(challenge.error || "Could not create access challenge.");
      }

      setState("signing");
      const signed = await provider.signMessage(new TextEncoder().encode(challenge.message), "utf8");
      const signature = signed instanceof Uint8Array ? signed : signed.signature;
      const verifyResponse = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: challenge.challengeId, wallet, signature: toBase64(signature) })
      });
      const verified = await verifyResponse.json() as { error?: string };
      if (!verifyResponse.ok) throw new Error(verified.error || "Access verification failed.");
      setMessage("Premium terminal unlocked.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Wallet verification failed.");
    } finally {
      setState("idle");
    }
  }

  async function logout() {
    await fetch("/api/auth/session", { method: "DELETE" });
    setMessage("Session closed.");
    router.refresh();
  }

  return (
    <section className="access-panel" id="access" aria-labelledby="access-title">
      <div className="panel-label"><span>ACCESS</span><b>01</b></div>
      <h2 id="access-title">PUMPXBT PRO</h2>
      <div className="access-threshold"><strong>{threshold.toLocaleString("en-US")}</strong><span>tokens required</span></div>
      {session ? (
        <>
          <div className="access-verified"><span className="status-dot live" />VERIFIED {shortWallet(session.wallet)}</div>
          <p className="access-balance">Checked balance: {session.verifiedBalance}</p>
          <button className="terminal-button secondary" type="button" onClick={logout}>LOCK SESSION</button>
        </>
      ) : (
        <button className="terminal-button" type="button" onClick={unlock} disabled={state !== "idle" || !configured}>
          {state === "connecting" ? "CONNECTING" : state === "signing" ? "SIGN MESSAGE" : "UNLOCK WITH WALLET"}
        </button>
      )}
      <p className="access-note">Read-only signature. No transaction approval.</p>
      <p className="access-message" aria-live="polite">{message}</p>
    </section>
  );
}

