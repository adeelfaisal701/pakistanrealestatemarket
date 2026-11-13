"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * Forwards an old Property Care URL to its new location after mount.
 *
 * Deliberately client-side: a server `redirect()` inside these legacy pages
 * arrives as a NEXT_REDIRECT inside the RSC payload during client-side
 * navigation, which made the Next.js router start a second navigation while
 * the first was still pending and crash with "Rendered more hooks than during
 * the previous render". Navigating after the page has rendered avoids that.
 */
export function LegacyRouteRedirect({ to, dark = false }: { to: string; dark?: boolean }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(to);
  }, [router, to]);
  return (
    <p role="status" className={dark ? "p-8 text-center text-sm text-slate-400" : "p-8 text-center text-sm text-slate-500"}>
      Opening Property Care… <Link href={to} className="font-semibold underline">Continue</Link>
    </p>
  );
}
