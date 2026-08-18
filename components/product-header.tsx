"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { WalletButton } from "./wallet-button";

const NAV = [
  ["Terminal", "/terminal"],
  ["Signals", "/signals"],
  ["Callers", "/callers"],
  ["Wallets", "/wallets"],
  ["XBT", "/xbt"],
  ["Treasury", "/treasury"]
] as const;

export function ProductHeader({ walletConfigured }: { walletConfigured: boolean }) {
  const pathname = usePathname();
  const [searching, setSearching] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="product-header">
      <Link className="product-brand" href="/" aria-label="PumpXBT home">
        <Image src="/pumpxbt-logo.png" alt="" width={38} height={38} priority />
        <span><strong>PUMP<span>XBT</span></strong><small>INTELLIGENCE</small></span>
      </Link>
      <button className="nav-toggle" type="button" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} title="Toggle navigation">☰</button>
      <nav className={menuOpen ? "product-nav open" : "product-nav"} aria-label="Primary navigation">
        {NAV.map(([label, href]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} onClick={() => setMenuOpen(false)}>{label}</Link>)}
      </nav>
      <div className="header-actions">
        <form className={searching ? "header-search open" : "header-search"} action="/terminal">
          {searching ? <input autoFocus name="q" placeholder="Token or mint" aria-label="Search token or mint" /> : null}
          <button type={searching ? "submit" : "button"} onClick={() => !searching && setSearching(true)} title="Search markets"><span aria-hidden>⌕</span><span className="search-label">SEARCH</span></button>
        </form>
        <WalletButton configured={walletConfigured} />
      </div>
    </header>
  );
}
