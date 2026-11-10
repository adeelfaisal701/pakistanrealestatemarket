import type { NextConfig } from "next";
import { buildSecurityHeaders } from "./security-headers.mjs";

const DEFAULT_IMAGE_ORIGINS = [
  "https://images.unsplash.com",
  "https://tile.openstreetmap.org",
];

function parseImageRemotePatterns(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => {
      let parsed: URL;
      try {
        parsed = new URL(origin);
      } catch {
        throw new Error("CSP_IMAGE_ORIGINS must contain exact HTTP(S) origins.");
      }
      const isLocalhost =
        parsed.hostname === "localhost" ||
        parsed.hostname.endsWith(".localhost") ||
        parsed.hostname === "127.0.0.1" ||
        parsed.hostname === "[::1]";
      if (
        origin === "*" ||
        !["http:", "https:"].includes(parsed.protocol) ||
        parsed.origin !== origin ||
        parsed.username ||
        parsed.password ||
        (process.env.NODE_ENV === "production" &&
          (parsed.protocol !== "https:" || isLocalhost)) ||
        (parsed.protocol === "http:" &&
          (process.env.NODE_ENV !== "development" || !isLocalhost))
      ) {
        throw new Error("CSP_IMAGE_ORIGINS entries must be exact, secure origins.");
      }
      return {
        protocol: parsed.protocol.slice(0, -1) as "http" | "https",
        hostname: parsed.hostname,
        ...(parsed.port ? { port: parsed.port } : {}),
        pathname: "/**",
      };
    });
}

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

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "/api/v1";
const usesApiProxy = apiBaseUrl.startsWith("/");
const configuredApiTarget = process.env.API_PROXY_TARGET?.trim();
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
const adminHostname = process.env.NEXT_PUBLIC_ADMIN_HOSTNAME?.trim();

function isLocalHostname(hostname: string) {
  const normalized = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized === "::1" ||
    normalized === "0.0.0.0" ||
    normalized.startsWith("127.")
  );
}

if (process.env.NODE_ENV === "production") {
  if (!siteUrl) {
    throw new Error("NEXT_PUBLIC_SITE_URL must be set to the HTTPS marketplace origin in production.");
  }
  let parsedSiteUrl: URL;
  try {
    parsedSiteUrl = new URL(siteUrl);
  } catch {
    throw new Error("NEXT_PUBLIC_SITE_URL must be an HTTPS origin in production.");
  }
  if (
    parsedSiteUrl.protocol !== "https:" ||
    parsedSiteUrl.username ||
    parsedSiteUrl.password ||
    parsedSiteUrl.pathname !== "/" ||
    parsedSiteUrl.search ||
    parsedSiteUrl.hash ||
    isLocalHostname(parsedSiteUrl.hostname)
  ) {
    throw new Error("NEXT_PUBLIC_SITE_URL must be an HTTPS origin without a path in production.");
  }

  if (
    !adminHostname ||
    adminHostname.includes(":") ||
    adminHostname.includes("/") ||
    adminHostname.includes("@")
  ) {
    throw new Error("NEXT_PUBLIC_ADMIN_HOSTNAME must be the production admin hostname only.");
  }
  let parsedAdminHost: URL;
  try {
    parsedAdminHost = new URL(`https://${adminHostname}`);
  } catch {
    throw new Error("NEXT_PUBLIC_ADMIN_HOSTNAME must be a valid production hostname.");
  }
  if (
    parsedAdminHost.hostname.toLowerCase() !== adminHostname.toLowerCase() ||
    isLocalHostname(parsedAdminHost.hostname)
  ) {
    throw new Error("NEXT_PUBLIC_ADMIN_HOSTNAME must not be a loopback hostname.");
  }
}

function resolveApiProxyTarget() {
  if (!usesApiProxy) return undefined;
  if (!configuredApiTarget) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "API_PROXY_TARGET must point to the deployed backend when NEXT_PUBLIC_API_BASE_URL is relative.",
      );
    }
    return "http://127.0.0.1:5000/api/v1";
  }

  let target: URL;
  try {
    target = new URL(configuredApiTarget);
  } catch {
    throw new Error("API_PROXY_TARGET must be an absolute HTTP(S) URL.");
  }
  if (
    !["http:", "https:"].includes(target.protocol) ||
    target.username ||
    target.password ||
    target.search ||
    target.hash ||
    (process.env.NODE_ENV === "production" && target.protocol !== "https:") ||
    (process.env.NODE_ENV === "production" && isLocalHostname(target.hostname)) ||
    !target.pathname.replace(/\/+$/, "").endsWith("/api/v1")
  ) {
    throw new Error(
      "API_PROXY_TARGET must include the /api/v1 path and use a credential-free HTTPS URL in production.",
    );
  }
  return configuredApiTarget.replace(/\/+$/, "");
}

const nextConfig: NextConfig = {
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    const apiTarget = resolveApiProxyTarget();
    if (!apiTarget) return [];

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
      ...DEFAULT_IMAGE_ORIGINS.map((origin) => {
        const parsed = new URL(origin);
        return {
          protocol: "https" as const,
          hostname: parsed.hostname,
          pathname: "/**",
        };
      }),
      ...parseImageRemotePatterns(process.env.CSP_IMAGE_ORIGINS),
      ...developmentImagePatterns,
    ],
  },
};

export default nextConfig;
