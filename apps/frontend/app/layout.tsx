import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import { headers } from "next/headers";
import { isMobileUserAgent, MobileDesktopGate } from "@/components/shell/MobileDesktopGate";
import { ProvidersContextProvider } from "./providers";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const siteName = "Flovia";
const siteTitle = "Flovia — Turn x402 / MPP payments into decisions";
const siteDescription =
  "Co-usage discovery for agent-driven API economies. Flovia turns on-chain x402 / MPP payments into product decisions.";

export const metadata: Metadata = {
  metadataBase: siteUrl ? new URL(siteUrl) : null,
  title: {
    default: siteTitle,
    template: "%s — Flovia",
  },
  description: siteDescription,
  applicationName: siteName,
  openGraph: {
    type: "website",
    siteName,
    title: siteTitle,
    description: siteDescription,
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userAgent = (await headers()).get("user-agent");
  const landingUrl = process.env.NEXT_PUBLIC_LANDING_URL ?? "https://flovia402.com";
  const content = isMobileUserAgent(userAgent) ? (
    <MobileDesktopGate landingUrl={landingUrl} />
  ) : (
    <ProvidersContextProvider>{children}</ProvidersContextProvider>
  );

  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${spaceGrotesk.variable}`}>
      <body>{content}</body>
    </html>
  );
}
