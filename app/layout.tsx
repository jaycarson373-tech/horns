import type { Metadata, Viewport } from "next";

import "./site.css";

const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  || process.env.VERCEL_URL?.trim();
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  || (vercelHost ? `https://${vercelHost}` : "http://localhost:3000");
const botHandle = process.env.NEXT_PUBLIC_BOT_HANDLE?.trim().replace(/^@+/, "");
const title = "PumpXBT | Pump Token Intelligence";
const description = "Verified pump-token market structure, public wallet-cluster flow, and manually approved high-conviction signals.";

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
    images: [{ url: "/pumpxbt-og.jpg", width: 1200, height: 630, alt: "PumpXBT pump-token intelligence terminal" }]
  },
  twitter: {
    card: "summary_large_image",
    site: botHandle ? `@${botHandle}` : undefined,
    title,
    description,
    images: ["/pumpxbt-og.jpg"]
  }
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#080b09", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
