export function buildContentSecurityPolicy(
  environment: Record<string, string | undefined> | undefined,
  nonce: string,
): string;

export function buildSecurityHeaders(
  environment?: Record<string, string | undefined>,
): Array<{ key: string; value: string }>;
