import type { Metadata, Viewport } from "next";

import { ProductFooter } from "@/components/product-footer";
import { ProductHeader } from "@/components/product-header";
import { accessIsConfigured } from "@/lib/access";
import { pumpConfig } from "@/lib/pumpConfig";

import "./site.css";

const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  || process.env.VERCEL_URL?.trim();
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  || (vercelHost ? `https://${vercelHost}` : "http://localhost:3000");
const botHandle = pumpConfig.botHandle;
const title = "PumpXBT | The intelligence agent for Pump.fun";
const description = "XBT watches Pump.fun markets, tracks callers and onchain flow, and publishes high-quality calls.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  alternates: { canonical: "/" },
  icons: { icon: "/favicon.png", apple: "/apple-touch-icon.png" },
  openGraph: {
    title,
    description,
    url: siteUrl,
    type: "website",
    siteName: "PumpXBT",
    images: [{ url: "/pumpxbt-og.jpg", width: 1200, height: 630, alt: "PumpXBT market intelligence" }]
  },
  twitter: {
    card: "summary_large_image",
    site: botHandle ? `@${botHandle}` : undefined,
    title,
    description,
    images: ["/pumpxbt-og.jpg"]
  }
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff", colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><ProductHeader walletConfigured={accessIsConfigured()} />{children}<ProductFooter /></body></html>;
}
