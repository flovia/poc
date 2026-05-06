import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1", "localhost:3333", "127.0.0.1:3333"],
  outputFileTracingRoot: fileURLToPath(new URL("../..", import.meta.url)),
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
