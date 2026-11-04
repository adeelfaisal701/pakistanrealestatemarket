export function buildContentSecurityPolicy(
  environment?: Record<string, string | undefined>,
): string;

export function buildSecurityHeaders(
  environment?: Record<string, string | undefined>,
): Array<{ key: string; value: string }>;
