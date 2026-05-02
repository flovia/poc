import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import { ProvidersContextProvider } from "./providers";
import { FrontendLocaleProvider } from "@/lib/frontend-locale";
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

export const metadata: Metadata = {
  title: "Flovia — x402 Co-usage Discovery",
};

export const viewport: Viewport = {
  width: 1440,
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${spaceGrotesk.variable}`}>
      <body>
        <FrontendLocaleProvider>
          <ProvidersContextProvider>{children}</ProvidersContextProvider>
        </FrontendLocaleProvider>
      </body>
    </html>
  );
}
