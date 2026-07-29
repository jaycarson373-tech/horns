import type { Metadata, Viewport } from "next";
import "./site.css";

const title = "Gumbus — The Internet's Cat";
const description = "Meet Gumbus and make a custom PFP. 100% of fees go to the creator.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.gumbus.fun"),
  title,
  description,
  alternates: { canonical: "/" },
  icons: { icon: "/gumbus-logo.png", apple: "/apple-touch-icon.png" },
  openGraph: {
    title, description, url: "https://www.gumbus.fun", type: "website", siteName: "Gumbus",
    images: [{ url: "/og-card.jpg", width: 1200, height: 630, alt: "Gumbus staring into the camera" }]
  },
  twitter: {
    card: "summary_large_image", site: "@Gumbus_solana", title, description, images: ["/og-card.jpg"]
  }
};

export const viewport: Viewport = { themeColor: "#f7f1e6", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
