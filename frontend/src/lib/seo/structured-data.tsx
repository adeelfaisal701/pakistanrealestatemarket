import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { LOGO_PATH, SITE_NAME, SITE_URL, absoluteUrl } from "./site";

type JsonLdValue = Record<string, unknown> | Record<string, unknown>[];

/**
 * JSON-LD script. `<` is escaped so values from listings/profiles can never
 * close the script element.
 */
export function JsonLd({ data }: { data: JsonLdValue }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export interface BreadcrumbItem {
  name: string;
  /** Omit for the current page. */
  path?: string;
}

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.path ? { item: absoluteUrl(item.path) } : {}),
    })),
  };
}

/**
 * Visible breadcrumb trail plus matching BreadcrumbList markup (so the
 * structured data always reflects what users can see).
 */
export function Breadcrumbs({
  items,
  className = "",
  tone = "light",
}: {
  items: BreadcrumbItem[];
  className?: string;
  tone?: "light" | "dark";
}) {
  const muted = tone === "dark" ? "text-white/60 hover:text-white" : "text-slate-500 hover:text-emerald-700";
  const current = tone === "dark" ? "text-white/90" : "text-slate-700";
  return (
    <>
      <nav aria-label="Breadcrumb" className={className}>
        <ol className="flex min-w-0 flex-wrap items-center gap-1 text-xs font-medium">
          {items.map((item, index) => (
            <li key={`${item.name}-${index}`} className="flex min-w-0 items-center gap-1">
              {index > 0 && <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
              {item.path && index < items.length - 1 ? (
                <Link href={item.path} className={`transition-colors ${muted}`}>
                  {item.name}
                </Link>
              ) : (
                <span aria-current={index === items.length - 1 ? "page" : undefined} className={`truncate ${current}`}>
                  {item.name}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd data={breadcrumbJsonLd(items)} />
    </>
  );
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl(LOGO_PATH),
    slogan: "Har Khwab Ki Manzil, Apna Ghar.",
    areaServed: { "@type": "Country", name: "Pakistan" },
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: "en-PK",
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}
