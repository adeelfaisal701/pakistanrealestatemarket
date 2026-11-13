import Script from "next/script";
import { headers } from "next/headers";

/**
 * Google Analytics 4 — loads only when NEXT_PUBLIC_GA_MEASUREMENT_ID is set
 * (e.g. "G-XXXXXXXXXX"). Rendered from public layouts only, so dashboards and
 * account pages are never tracked. Fragments (used for private share tokens)
 * are never reported, and the shared-location page is skipped entirely.
 */
const MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

export async function GoogleAnalytics() {
  if (!MEASUREMENT_ID || !/^G-[A-Z0-9]{4,20}$/.test(MEASUREMENT_ID)) return null;

  // Reuse the per-request CSP nonce set by middleware.
  const policy = (await headers()).get("content-security-policy-report-only") ?? "";
  const nonce = policy.match(/'nonce-([^']+)'/)?.[1];

  return (
    <>
      <Script
        id="ga4-loader"
        src={`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`}
        strategy="afterInteractive"
        nonce={nonce}
      />
      <Script id="ga4-init" strategy="afterInteractive" nonce={nonce}>
        {`(function(){if(location.pathname.indexOf('/shared-location')===0)return;window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${MEASUREMENT_ID}',{page_location:location.origin+location.pathname+location.search});})();`}
      </Script>
    </>
  );
}
