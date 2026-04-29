import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(process.cwd(), "../.."),
  async rewrites() {
    const bffUrl = process.env.BFF_URL ?? "http://localhost:3001";

    return [
      {
        source: "/api/:path*",
        destination: `${bffUrl.replace(/\/$/, "")}/:path*`,
      },
    ];
  },
};

export default nextConfig;
