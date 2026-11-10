import { NextResponse, type NextRequest } from "next/server";
import { buildContentSecurityPolicy } from "../security-headers.mjs";

const ADMIN_HOST =
  process.env.NEXT_PUBLIC_ADMIN_HOSTNAME?.trim().toLowerCase() ||
  (process.env.NODE_ENV !== "production" ? "admin.localhost" : "");

function isAdminPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function createNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

function withContentSecurityPolicy(response: NextResponse, policy: string) {
  response.headers.set("Content-Security-Policy-Report-Only", policy);
  return response;
}

export function middleware(request: NextRequest) {
  const nonce = createNonce();
  const contentSecurityPolicy = buildContentSecurityPolicy(process.env, nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy-Report-Only", contentSecurityPolicy);

  const forwardedHost =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  const hostname = (
    forwardedHost?.split(",")[0].trim() || request.nextUrl.hostname
  )
    .replace(/:\d+$/, "")
    .toLowerCase();
  const pathname = request.nextUrl.pathname;

  if (ADMIN_HOST && hostname === ADMIN_HOST) {
    if (pathname === "/admin-login") {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      return withContentSecurityPolicy(
        NextResponse.redirect(loginUrl),
        contentSecurityPolicy,
      );
    }

    if (pathname === "/login") {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/admin-login";
      return withContentSecurityPolicy(
        NextResponse.rewrite(loginUrl, { request: { headers: requestHeaders } }),
        contentSecurityPolicy,
      );
    }

    if (pathname === "/register" || pathname === "/agent/register") {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      return withContentSecurityPolicy(
        NextResponse.redirect(loginUrl),
        contentSecurityPolicy,
      );
    }

    if (pathname === "/") {
      const adminUrl = request.nextUrl.clone();
      adminUrl.pathname = "/admin";
      return withContentSecurityPolicy(
        NextResponse.rewrite(adminUrl, { request: { headers: requestHeaders } }),
        contentSecurityPolicy,
      );
    }

    if (pathname === "/agents" || pathname === "/properties") {
      const adminUrl = request.nextUrl.clone();
      adminUrl.pathname = `/admin${pathname}`;
      return NextResponse.rewrite(adminUrl);
    }

      return withContentSecurityPolicy(
        NextResponse.next({ request: { headers: requestHeaders } }),
        contentSecurityPolicy,
      );
  }

  if (isAdminPath(pathname)) {
    if (!ADMIN_HOST) {
      return withContentSecurityPolicy(
        new NextResponse("Admin hostname is not configured.", { status: 404 }),
        contentSecurityPolicy,
      );
    }

    const adminUrl = request.nextUrl.clone();
    adminUrl.hostname = ADMIN_HOST;
    return withContentSecurityPolicy(
      NextResponse.redirect(adminUrl),
      contentSecurityPolicy,
    );
  }

  return withContentSecurityPolicy(
    NextResponse.next({ request: { headers: requestHeaders } }),
    contentSecurityPolicy,
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
