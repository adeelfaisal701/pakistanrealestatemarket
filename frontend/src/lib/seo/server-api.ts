/**
 * Server-side reads of PUBLIC backend endpoints for metadata, sitemaps and
 * server-rendered initial data. Only unauthenticated public routes are used,
 * so no private data can reach metadata. Failures never throw: callers fall
 * back to the existing client-side loading.
 */

function apiBase(): string {
  const publicBase = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (publicBase && /^https?:\/\//i.test(publicBase)) return publicBase.replace(/\/+$/, "");
  const proxyTarget = process.env.API_PROXY_TARGET?.trim();
  if (proxyTarget) return proxyTarget.replace(/\/+$/, "");
  return "http://127.0.0.1:5000/api/v1"; // Same development default as next.config.ts.
}

export type ApiResult<T, M = unknown> =
  | { ok: true; data: T; meta?: M }
  | { ok: false; status: number };

export async function publicApiGet<T, M = unknown>(
  path: string,
  options: { revalidate?: number; timeoutMs?: number } = {},
): Promise<ApiResult<T, M>> {
  try {
    const response = await fetch(`${apiBase()}${path}`, {
      headers: { Accept: "application/json" },
      ...(options.revalidate !== undefined
        ? { next: { revalidate: options.revalidate } }
        : { cache: "no-store" as const }),
      signal: AbortSignal.timeout(options.timeoutMs ?? 6000),
    });
    if (!response.ok) return { ok: false, status: response.status };
    const body = (await response.json()) as { data: T; meta?: M };
    return { ok: true, data: body.data, meta: body.meta };
  } catch {
    return { ok: false, status: 0 };
  }
}
