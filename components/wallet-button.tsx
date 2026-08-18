"use client";

import { useEffect, useState } from "react";

type WalletProvider = {
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  publicKey?: { toString: () => string };
  signMessage: (message: Uint8Array, encoding?: string) => Promise<{ signature: Uint8Array } | Uint8Array>;
};

function toBase64(value: Uint8Array) {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return window.btoa(binary);
}

function shortWallet(value: string) {
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function WalletButton({ configured }: { configured: boolean }) {
  const [wallet, setWallet] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "connecting" | "signing">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((session: { authenticated?: boolean; wallet?: string }) => {
        if (session.authenticated && session.wallet) setWallet(session.wallet);
      })
      .catch(() => undefined);
  }, []);

  async function connect() {
    setError("");
    try {
      if (!configured) throw new Error("Wallet access is not configured.");
      const provider = (window as typeof window & { solana?: WalletProvider }).solana;
      if (!provider?.connect || !provider.signMessage) throw new Error("Open in a Solana wallet browser or install a compatible wallet.");
      setState("connecting");
      const connection = await provider.connect();
      const address = connection.publicKey?.toString() ?? provider.publicKey?.toString();
      if (!address) throw new Error("Wallet address unavailable.");
      const challengeResponse = await fetch("/api/auth/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address })
      });
      const challenge = await challengeResponse.json() as { challengeId?: string; message?: string; error?: string };
      if (!challengeResponse.ok || !challenge.challengeId || !challenge.message) throw new Error(challenge.error || "Challenge failed.");
      setState("signing");
      const signed = await provider.signMessage(new TextEncoder().encode(challenge.message), "utf8");
      const signature = signed instanceof Uint8Array ? signed : signed.signature;
      const verifyResponse = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: challenge.challengeId, wallet: address, signature: toBase64(signature) })
      });
      const verified = await verifyResponse.json() as { error?: string };
      if (!verifyResponse.ok) throw new Error(verified.error || "Wallet verification failed.");
      setWallet(address);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Wallet connection failed.");
    } finally {
      setState("idle");
    }
  }

  async function disconnect() {
    await fetch("/api/auth/session", { method: "DELETE" });
    setWallet(null);
  }

  const label = wallet ? shortWallet(wallet) : state === "connecting" ? "CONNECTING" : state === "signing" ? "SIGN MESSAGE" : "CONNECT WALLET";
  return (
    <div className="wallet-control">
      <button className="wallet-button" type="button" onClick={wallet ? disconnect : connect} disabled={state !== "idle"} title={wallet ? "Disconnect read-only session" : "Connect a Solana wallet"}>
        <span className={wallet ? "wallet-led connected" : "wallet-led"} />{label}
      </button>
      {error ? <span className="wallet-error" role="status">{error}</span> : null}
    </div>
  );
}
