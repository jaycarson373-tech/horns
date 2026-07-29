import { promises as fs } from "node:fs";
import path from "node:path";
import Script from "next/script";
import { donationsEnabled, readDonations, type Donation } from "../lib/donations";

export const dynamic = "force-dynamic";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]!));

function amount(row: Donation) {
  return row.token === "SOL" ? Number(row.amount_lamports) / 1_000_000_000 : Number(row.amount_lamports);
}

function relativeTime(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function receipts(rows: Donation[]) {
  if (!donationsEnabled()) return "";
  const newest = rows[0];
  const stale = newest && Date.now() - Date.parse(newest.block_time) > 3_600_000;
  const solTotal = rows.filter((row) => row.token === "SOL").reduce((sum, row) => sum + amount(row), 0);
  const allPriced = rows.length > 0 && rows.every((row) => row.usd_at_time != null);
  const usdTotal = allPriced ? rows.reduce((sum, row) => sum + Number(row.usd_at_time), 0) : null;
  const list = rows.map((row) => `<li><time>${new Date(row.block_time).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</time><strong>${amount(row).toLocaleString("en-US", { maximumFractionDigits: 9 })} ${row.token}</strong><a href="https://solscan.io/tx/${encodeURIComponent(row.signature)}" target="_blank" rel="noreferrer">SOLSCAN ↗</a></li>`).join("");
  const body = rows.length
    ? `<div class="receipts-total"><strong>${solTotal.toLocaleString("en-US", { maximumFractionDigits: 9 })} SOL</strong>${usdTotal == null ? "" : `<span>$${usdTotal.toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>`}</div><ul>${list}</ul><a class="text-link" href="https://solscan.io/account/${encodeURIComponent(process.env.DONATION_DESTINATION_WALLET ?? "")}" target="_blank" rel="noreferrer">VIEW ALL ON SOLSCAN ↗</a><p class="verified">Last verified ${relativeTime(newest.block_time)}${stale ? " · Data may be delayed" : ""}</p>`
    : `<p class="receipts-empty">No payouts yet. The first one lands here the moment it clears.</p>`;
  return `<section class="receipts campaign" id="receipts"><aside class="section-index"><span>04</span><p>THE RECEIPTS</p></aside><div class="campaign-body"><p class="kicker dark"><span>●</span> VERIFIED ON-CHAIN</p><h2>THE RECEIPTS.</h2>${body}</div></section>`;
}

export default async function Home() {
  let html = await fs.readFile(path.join(process.cwd(), "site/index.html"), "utf8");
  html = html.slice(html.indexOf("<header"), html.indexOf("<script"));
  const mint = process.env.NEXT_PUBLIC_TOKEN_MINT?.trim() ?? "";
  const bot = process.env.NEXT_PUBLIC_BOT_HANDLE?.trim().replace(/^@/, "") ?? "";
  const rows = donationsEnabled() ? await readDonations(20) : [];

  const caMarkup = mint
    ? `<button class="ca-status" id="copy-ca" type="button" data-ca="${escapeHtml(mint)}" data-label="${escapeHtml(`${mint.slice(0, 4)}...${mint.slice(-4)}`)}" title="Copy full contract address"><b>CA</b> <span>${escapeHtml(`${mint.slice(0, 4)}...${mint.slice(-4)}`)}</span></button><a class="solscan-link" href="https://solscan.io/token/${encodeURIComponent(mint)}" target="_blank" rel="noreferrer">↗</a><a class="buy-link" href="https://jup.ag/?sell=So11111111111111111111111111111111111111112&buy=${encodeURIComponent(mint)}" target="_blank" rel="noreferrer">BUY</a>`
    : "";
  html = html.replace(/<button[\s\S]*?id="copy-ca"[\s\S]*?<\/button>/, caMarkup);
  html = html.replace('<a href="#bot">Bot</a>', bot ? `<a href="https://x.com/${escapeHtml(bot)}" target="_blank" rel="noreferrer">Bot</a>` : "");
  html = html.replace(/<section class="bot-section[\s\S]*?<\/section>/, bot
    ? html.match(/<section class="bot-section[\s\S]*?<\/section>/)?.[0]?.replaceAll("https://x.com/Gumbus_solana", `https://x.com/${escapeHtml(bot)}`) ?? ""
    : "");
  html = html.replace('<section class="promise">', `${receipts(rows)}<section class="promise">`);
  html = html.replace("04 / THE PROMISE", "05 / THE PROMISE");
  return <><div dangerouslySetInnerHTML={{ __html: html }} /><Script src="/generator.js" strategy="afterInteractive" /></>;
}
