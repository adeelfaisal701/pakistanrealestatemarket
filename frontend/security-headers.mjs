const DEFAULT_IMAGE_ORIGINS = [
  "https://images.unsplash.com",
  "https://tile.openstreetmap.org",
];

export function buildContentSecurityPolicy(environment = process.env) {
  const imageOrigins = parseOrigins(
    environment.CSP_IMAGE_ORIGINS,
    environment.NODE_ENV,
    "CSP_IMAGE_ORIGINS",
  );
  const apiOrigin = resolveApiOrigin(
    environment.NEXT_PUBLIC_API_BASE_URL,
    environment.NODE_ENV,
  );

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "script-src 'self'",
    "style-src 'self'",
    `img-src 'self' data: blob: ${[...new Set([...DEFAULT_IMAGE_ORIGINS, ...imageOrigins])].join(" ")}`,
    `font-src 'self' data:`,
    `connect-src 'self' ${apiOrigin ?? ""}`.trim(),
    "frame-src https://maps.google.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ].join("; ");
}

export function buildSecurityHeaders(environment = process.env) {
  const headers = [
    { key: "Content-Security-Policy-Report-Only", value: buildContentSecurityPolicy(environment) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  ];

  if (
    environment.NODE_ENV === "production" &&
    environment.ENABLE_HSTS?.trim().toLowerCase() === "true"
  ) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=31536000",
    });
  }

  return headers;
}

function resolveApiOrigin(value, nodeEnv) {
  if (typeof value !== "string" || !/^https?:\/\//i.test(value.trim())) return undefined;
  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new Error("NEXT_PUBLIC_API_BASE_URL must be a valid HTTP(S) URL.");
  }
  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    (nodeEnv === "production" && parsed.protocol !== "https:")
  ) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL must use a secure HTTP(S) origin.");
  }
  return parsed.origin;
}

function parseOrigins(value, nodeEnv, variableName) {
  if (!value?.trim()) return [];
  return value.split(",").map((entry) => {
    const origin = entry.trim();
    let parsed;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(`${variableName} must contain exact HTTP(S) origins.`);
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
      (nodeEnv === "production" && parsed.protocol !== "https:") ||
      (parsed.protocol === "http:" && (!isLocalhost || nodeEnv !== "development"))
    ) {
      throw new Error(`${variableName} entries must be exact, secure origins.`);
    }
    return parsed.origin;
  });
}
