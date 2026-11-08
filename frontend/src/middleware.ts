import { NextResponse, type NextRequest } from "next/server";

const ADMIN_HOST =
  process.env.NEXT_PUBLIC_ADMIN_HOSTNAME?.trim().toLowerCase() ||
  (process.env.NODE_ENV !== "production" ? "admin.localhost" : "");

function isAdminPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function middleware(request: NextRequest) {
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
      return NextResponse.redirect(loginUrl);
    }

    if (pathname === "/login") {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/admin-login";
      return NextResponse.rewrite(loginUrl);
    }

    if (pathname === "/register" || pathname === "/agent/register") {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      return NextResponse.redirect(loginUrl);
    }

    if (pathname === "/") {
      const adminUrl = request.nextUrl.clone();
      adminUrl.pathname = "/admin";
      return NextResponse.rewrite(adminUrl);
    }

    if (pathname === "/agents" || pathname === "/properties") {
      const adminUrl = request.nextUrl.clone();
      adminUrl.pathname = `/admin${pathname}`;
      return NextResponse.rewrite(adminUrl);
    }

    return NextResponse.next();
  }

  if (isAdminPath(pathname)) {
    if (!ADMIN_HOST) {
      return new NextResponse("Admin hostname is not configured.", {
        status: 404,
      });
    }

    const adminUrl = request.nextUrl.clone();
    adminUrl.hostname = ADMIN_HOST;
    return NextResponse.redirect(adminUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
