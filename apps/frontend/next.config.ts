import type { NextConfig } from "next";
import path from "node:path";
import { bffProxyDestination, shouldProxyBff } from "./lib/data-source-mode";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1", "localhost:3333", "127.0.0.1:3333"],
  outputFileTracingRoot: path.join(process.cwd(), "../.."),
  async rewrites() {
    if (!shouldProxyBff()) return [];

    return [
      {
        source: "/api/:path*",
        destination: bffProxyDestination(),
      },
    ];
  },
};

export default nextConfig;
