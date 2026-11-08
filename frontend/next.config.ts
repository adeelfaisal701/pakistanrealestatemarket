import type { NextConfig } from "next";
import { buildSecurityHeaders } from "./security-headers.mjs";

const developmentImagePatterns =
  process.env.NODE_ENV === "production"
    ? []
    : [process.env.API_PROXY_TARGET, process.env.NEXT_PUBLIC_API_BASE_URL].flatMap(
        (configuredBase) => {
          if (!configuredBase) return [];
          try {
            const url = new URL(configuredBase);
            if (url.protocol !== "http:") return [];
            return [
              {
                protocol: "http" as const,
                hostname: url.hostname,
                ...(url.port ? { port: url.port } : {}),
                pathname: `${url.pathname.replace(/\/+$/, "")}/**`,
              },
            ];
          } catch {
            return [];
          }
        },
      );

const nextConfig: NextConfig = {
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    const configuredApiTarget = process.env.API_PROXY_TARGET;
    const apiTarget =
      configuredApiTarget?.trim() || "http://127.0.0.1:5000/api/v1";

    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiTarget.replace(/\/+$/, "")}/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: buildSecurityHeaders(process.env),
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      ...developmentImagePatterns,
    ],
  },
};

export default nextConfig;
