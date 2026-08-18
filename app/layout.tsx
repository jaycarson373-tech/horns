import type { Metadata, Viewport } from "next";

import { ProductFooter } from "@/components/product-footer";
import { ProductHeader } from "@/components/product-header";
import { pumpConfig } from "@/lib/pumpConfig";

import "./site.css";

const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  || process.env.VERCEL_URL?.trim();
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  || (vercelHost ? `https://${vercelHost}` : "http://localhost:3000");
const botHandle = pumpConfig.botHandle;
const title = "PumpXBT | The agent-powered intelligence layer for Pump.fun";
const description = "Live calls, onchain intelligence, smart-money tracking, and autonomous trading across Pump.fun.";

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

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0b0d0c", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><ProductHeader />{children}<ProductFooter /></body></html>;
}
