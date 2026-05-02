import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1", "localhost:3333", "127.0.0.1:3333"],
  outputFileTracingRoot: path.join(process.cwd(), "../.."),
  async rewrites() {
    const bffUrl = process.env.BFF_URL;
    const dataSource = process.env.FRONTEND_DATA_SOURCE ?? "auto";
    const isDeployLike = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
    const resolvedDataSource =
      dataSource === "fixture"
        ? "fixture"
        : dataSource === "bff"
          ? "bff"
          : bffUrl
            ? "bff"
            : isDeployLike
              ? "fixture"
              : "bff";

    if (dataSource !== "auto" && dataSource !== "bff" && dataSource !== "fixture") {
      throw new Error(
        `Invalid FRONTEND_DATA_SOURCE=${JSON.stringify(dataSource)}. Expected "auto", "bff", or "fixture".`,
      );
    }

    if (resolvedDataSource === "fixture") return [];

    if (!bffUrl && isDeployLike) {
      throw new Error(
        "BFF_URL is required when FRONTEND_DATA_SOURCE=bff in production/Vercel. " +
          'Set BFF_URL to a public BFF endpoint or use FRONTEND_DATA_SOURCE="fixture".',
      );
    }

    if (bffUrl && isDeployLike) {
      const parsed = new URL(bffUrl);
      if (
        parsed.hostname === "localhost" ||
        parsed.hostname === "127.0.0.1" ||
        parsed.hostname === "::1" ||
        parsed.hostname === "[::1]"
      ) {
        throw new Error(
          `BFF_URL must not point to localhost in production/Vercel: ${bffUrl}. ` +
            'Set BFF_URL to a public BFF endpoint or use FRONTEND_DATA_SOURCE="fixture".',
        );
      }
    }

    const destinationBase = bffUrl ?? "http://localhost:3001";

    return [
      {
        source: "/api/:path*",
        destination: `${destinationBase.replace(/\/$/, "")}/:path*`,
      },
    ];
  },
};

export default nextConfig;
