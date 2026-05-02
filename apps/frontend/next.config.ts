import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1", "localhost:3333", "127.0.0.1:3333"],
  env: {
    NEXT_PUBLIC_DEBUG_LOCALE_TOGGLE_ENABLED:
      process.env.VERCEL_ENV === "production" ? "false" : "true",
  },
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
