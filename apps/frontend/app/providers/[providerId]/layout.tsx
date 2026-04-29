"use client";

import { use } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/shell/Sidebar";

type RouteSegment = "customers" | "patterns" | "wallet";

function deriveActiveRoute(pathname: string): RouteSegment | undefined {
  if (pathname.includes("/wallet/")) return "wallet";
  if (pathname.endsWith("/customers") || pathname.includes("/customers/")) return "customers";
  if (pathname.endsWith("/patterns") || pathname.includes("/patterns/")) return "patterns";
  return undefined;
}

export default function ProviderLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ providerId: string }>;
}) {
  const { providerId } = use(params);
  const pathname = usePathname();
  const activeRoute = deriveActiveRoute(pathname);

  return (
    <div className="app">
      <Sidebar activeProviderId={providerId} activeRoute={activeRoute} />
      <main className="main">{children}</main>
    </div>
  );
}
